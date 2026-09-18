'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

const MAX_VISIBLE = 7;
const HALF = 3;

/* نفس إعدادات 21st.dev بالضبط */
const FAN_POSITIONS = [
  { rot: -21, scale: 0.7756, x: -30, y: 7.3, zIndex: 1  },
  { rot: -14, scale: 0.8498, x: -22, y: 4.0, zIndex: 2  },
  { rot:  -7, scale: 0.9346, x: -11, y: 1.3, zIndex: 3  },
  { rot:   0, scale: 1.0,    x:   0, y: 0.0, zIndex: 10 },
  { rot:   7, scale: 0.9346, x:  11, y: 1.3, zIndex: 3  },
  { rot:  14, scale: 0.8498, x:  22, y: 4.0, zIndex: 2  },
  { rot:  21, scale: 0.7756, x:  30, y: 7.3, zIndex: 1  },
];

function getResponsiveMultiplier(width) {
  if (width < 480)  return 0.28;
  if (width < 640)  return 0.38;
  if (width < 768)  return 0.5;
  if (width < 1024) return 0.75;
  return 1.0;
}

function getHeightMultiplier(width) {
  let idealPx;
  if (width < 480)       idealPx = 352;
  else if (width < 640)  idealPx = 416;
  else if (width < 768)  idealPx = 448;
  else if (width < 1024) idealPx = 544;
  else                   idealPx = 608;
  const available = window.innerHeight * 0.7;
  return available >= idealPx ? 1 : available / idealPx;
}

function getSlotConfig(totalCards, slot) {
  if (totalCards >= MAX_VISIBLE) return FAN_POSITIONS[slot];
  const center = totalCards >> 1;
  const distance = totalCards > 1 ? (slot - center) / center : 0;
  const absD = Math.abs(distance);
  return {
    rot:    distance * 21,
    scale:  1.0 - 0.2244 * absD * absD,
    x:      distance * 30,
    y:      absD * absD * 7.3,
    zIndex: 10 - Math.abs(slot - center),
  };
}

export default function FanCarousel({ items, renderCard }) {
  const containerRef  = useRef(null);
  const isAnimating   = useRef(false);
  const hasEntered    = useRef(false);
  const directionRef  = useRef(null);
  const prevVisible   = useRef(new Set());
  const touchStartX   = useRef(null);

  const totalCards      = items.length;
  const needsPagination = totalCards > MAX_VISIBLE;
  const [centerIndex, setCenterIndex] = useState(
    needsPagination ? HALF : totalCards >> 1
  );

  const getVisibleMap = useCallback((center) => {
    const map = new Map();
    if (!needsPagination) {
      items.forEach((_, i) => map.set(i, i));
      return map;
    }
    for (let slot = 0; slot < MAX_VISIBLE; slot++) {
      map.set(((center + slot - HALF) % totalCards + totalCards) % totalCards, slot);
    }
    return map;
  }, [totalCards, needsPagination, items]);

  const cycle = useCallback((direction) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    directionRef.current = direction;
    setCenterIndex(prev =>
      direction === 'right'
        ? (prev + 1) % totalCards
        : (prev - 1 + totalCards) % totalCards
    );
  }, [totalCards]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !totalCards) return;

    const cardEls = Array.from(container.querySelectorAll('.fan-card'));
    if (!cardEls.length) return;

    const visibleMap       = getVisibleMap(centerIndex);
    const previouslyVisible = prevVisible.current;
    const direction        = directionRef.current;
    const isFirstMount     = !hasEntered.current;
    const mult  = getResponsiveMultiplier(window.innerWidth);
    const hMult = getHeightMultiplier(window.innerWidth);
    const slotCount = needsPagination ? MAX_VISIBLE : totalCards;
    const cfg = (slot) => getSlotConfig(slotCount, slot);

    if (isFirstMount) isAnimating.current = true;

    let done = 0;
    const visCount = visibleMap.size;
    const onDone = () => {
      if (++done >= visCount) {
        isAnimating.current = false;
        if (isFirstMount) hasEntered.current = true;
      }
    };

    cardEls.forEach((card, cardIndex) => {
      const slot       = visibleMap.get(cardIndex);
      const wasVisible = previouslyVisible.has(cardIndex);

      if (slot !== undefined) {
        const { x, y, rot, scale, zIndex } = cfg(slot);
        const target = {
          x: `${x * mult}rem`, y: `${y * hMult}rem`,
          rotation: rot, scale, opacity: 1, zIndex,
        };

        if (isFirstMount) {
          gsap.set(card, { x: 0, y: `${12 * hMult}rem`, rotation: 0, scale: 0.5, opacity: 0 });
          gsap.to(card, { ...target, duration: 1.2, ease: 'elastic.out(1.05,.78)', delay: 0.2 + slot * 0.06, onComplete: onDone });
        } else if (!wasVisible) {
          const enterX = direction === 'right' ? 40 : -40;
          gsap.set(card, { x: `${enterX}rem`, y: `${y * hMult}rem`, rotation: direction === 'right' ? 30 : -30, scale: 0.5, opacity: 0 });
          gsap.to(card, { ...target, duration: 0.6, ease: 'power2.out', onComplete: onDone });
        } else {
          gsap.to(card, { ...target, duration: 0.5, ease: 'power2.out', onComplete: onDone });
        }
      } else if (wasVisible) {
        const exitX = direction === 'right' ? -40 : 40;
        gsap.to(card, {
          x: `${exitX}rem`, opacity: 0, scale: 0.5,
          rotation: direction === 'right' ? -30 : 30,
          duration: 0.4, ease: 'power2.in', zIndex: 0,
        });
      } else if (isFirstMount) {
        gsap.set(card, { opacity: 0, scale: 0.3, x: 0, y: 0, zIndex: 0 });
      }
    });

    prevVisible.current = new Set(visibleMap.keys());

    /* ── Hover interactions (نفس 21st.dev) ── */
    const visibleEntries = [];
    cardEls.forEach((el, i) => {
      const slot = visibleMap.get(i);
      if (slot !== undefined) visibleEntries.push({ el, slot });
    });
    visibleEntries.sort((a, b) => a.slot - b.slot);

    const centerSlot = visibleEntries.length >> 1;
    let activeSlot = null;
    let leaveTimer = null;

    const updateHover = (hoveredSlot) => {
      const m  = getResponsiveMultiplier(window.innerWidth);
      const hM = getHeightMultiplier(window.innerWidth);
      visibleEntries.forEach(({ el, slot }) => {
        const base = cfg(slot);
        let tx = base.x * m, ty = base.y * hM, tr = base.rot, ts = base.scale, delay = 0;

        if (hoveredSlot !== null) {
          const dist = Math.abs(slot - hoveredSlot);
          delay = dist * 0.02;
          if (slot === hoveredSlot) {
            ty -= 2.5 * hM; ts *= 1.08;
          } else {
            const norm = centerSlot > 0 ? (slot - centerSlot) / centerSlot : 0;
            const push = 8 * (1 - Math.abs(norm)) * (1 + 0.2 * Math.max(0, 3 - dist));
            if (slot < hoveredSlot) { tx -= push * m; tr -= 3 / (dist + 1); }
            else                    { tx += push * m; tr += 3 / (dist + 1); }
            if (slot === visibleEntries.length - 1 && hoveredSlot < centerSlot) ty -= hM;
            if (slot === 0 && hoveredSlot > centerSlot) ty -= hM;
          }
        } else {
          delay = Math.abs(slot - centerSlot) * 0.02;
        }

        gsap.to(el, {
          x: `${tx}rem`, y: `${ty}rem`, rotation: tr, scale: ts,
          duration: 0.5, delay, ease: 'elastic.out(1,.75)', overwrite: 'auto',
        });
        gsap.set(el, { zIndex: base.zIndex });
      });
    };

    const enterHandlers = visibleEntries.map(({ el, slot }) => {
      const handler = () => {
        if (isAnimating.current) return;
        if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
        if (activeSlot !== slot) { activeSlot = slot; updateHover(slot); }
      };
      el.addEventListener('mouseenter', handler);
      return { el, handler };
    });

    const onLeave = () => {
      if (isAnimating.current) return;
      if (leaveTimer) clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => { activeSlot = null; updateHover(null); }, 50);
    };
    container.addEventListener('mouseleave', onLeave);

    const onResize = () => { if (!isAnimating.current) updateHover(activeSlot); };
    window.addEventListener('resize', onResize);

    return () => {
      enterHandlers.forEach(({ el, handler }) => el.removeEventListener('mouseenter', handler));
      container.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', onResize);
      if (leaveTimer) clearTimeout(leaveTimer);
    };
  }, [centerIndex, totalCards, getVisibleMap, needsPagination]);

  if (!totalCards) return null;

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 45) cycle(delta > 0 ? 'right' : 'left');
    touchStartX.current = null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '8px 0 28px' }}>

      {/* منطقة المروحة */}
      <div
        ref={containerRef}
        style={{
          position: 'relative', display: 'flex',
          justifyContent: 'center', alignItems: 'center',
          width: '100%', height: 340, overflow: 'visible',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {items.map((item, index) => (
          <div
            key={item.key || index}
            className="fan-card"
            style={{ position: 'absolute', width: 'min(210px, 56vw)' }}
          >
            {renderCard(item, index)}
          </div>
        ))}
      </div>

    </div>
  );
}
