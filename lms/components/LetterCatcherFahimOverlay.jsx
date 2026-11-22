'use client';
import React, { useEffect, useRef } from 'react';

// The same celebration clip, pre-rendered as 36 transparent frames. Movement
// remains available when a phone blocks audio or cannot decode inline video.
export default function LetterCatcherFahimOverlay({ cheer, mediaRef, wordKey, compact = false }) {
  const spriteRef = useRef(null);
  const active = cheer === 'in' || cheer === 'out';
  const side = compact ? 76 : 88;

  useEffect(() => {
    const sprite = spriteRef.current;
    if (!sprite) return;
    sprite.style.transform = 'translate(0,0)';
    if (!active) return;
    const began = performance.now();
    let raf = 0, previous = -1;
    const draw = now => {
      const frame = Math.min(35, Math.floor((now - began) / (3000 / 36)));
      if (frame !== previous) {
        previous = frame;
        sprite.style.transform = `translate(${-(frame % 6) * 100 / 6}%,${-Math.floor(frame / 6) * 100 / 6}%)`;
        sprite.dataset.frame = String(frame);
      }
      if (frame < 35) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, wordKey]);

  return <>
    <style dangerouslySetInnerHTML={{ __html: `
      @media (prefers-reduced-motion: reduce) {
        .lc-animal-fahim { transform: none !important; transition: opacity .15s !important; }
      }
    ` }} />
    <div className="lc-animal-fahim" data-lc-animal-fahim="" data-cheer={cheer || ''}
      role="img" aria-label="فهيم يشجّعك" aria-hidden={!active}
      style={{ position: 'absolute', right: -2, bottom: -3, zIndex: 8, width: side, height: side,
        opacity: cheer === 'in' ? 1 : 0,
        transform: `translate3d(${cheer === 'in' ? 0 : 30}px,0,0)`,
        transition: 'opacity .35s ease, transform .4s cubic-bezier(.16,1,.3,1)',
        pointerEvents: 'none', filter: 'drop-shadow(0 3px 2px rgba(26,43,74,.12))' }}>
      <div style={{ position: 'relative', width: side, height: side, overflow: 'hidden', direction: 'ltr' }}>
        <img ref={spriteRef} src="/media/fahim-cheer-frames.webp" alt="" width="960" height="960" decoding="async"
          style={{ position: 'absolute', left: 0, top: 0, display: 'block', width: '600%', height: '600%',
            maxWidth: 'none', maxHeight: 'none', objectFit: 'fill', transformOrigin: '0 0' }} />
      </div>
    </div>
    <audio ref={mediaRef} src="/media/fahim-cheer.mp3" preload="auto" aria-hidden="true" />
  </>;
}
