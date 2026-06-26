'use client';
import { useRef, useState, useCallback, forwardRef, useEffect } from 'react';
import Link from 'next/link';
import HTMLFlipBook from 'react-pageflip';
import DOMPurify from 'isomorphic-dompurify';

/* ── صفحة واحدة ── */
const StoryPage = forwardRef(function StoryPage({ html, fontSize, pageNum, total, isRight, mirrorX }, ref) {
  return (
    <div ref={ref} style={{ overflow: 'hidden', background: 'transparent' }}>
      <div style={{
        background: '#fffdf5',
        height: '100%',
        padding: '26px 22px 40px',
        boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        fontFamily: "'Cairo','Tajawal',sans-serif",
        fontSize, lineHeight: 1.95, color: '#2d1f0e',
        direction: 'rtl',
        userSelect: 'none', WebkitUserSelect: 'none',
        /* نعكس المحتوى مرة ثانية ليُقرأ بشكل صحيح بعد عكس الحاوية */
        ...(mirrorX
          ? { transform: 'scaleX(-1)' }
          : {
              borderLeft: isRight ? '1px solid #e8d9b8' : 'none',
              borderRight: isRight ? 'none' : '1px solid #e8d9b8',
            }),
      }}>
        <div style={{ flex: 1, overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
        />
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          fontSize: '.58rem', color: '#c4a96d', fontWeight: 700,
          letterSpacing: '.05em', whiteSpace: 'nowrap',
          direction: 'ltr',
        }}>
          {pageNum} / {total}
        </div>
      </div>
    </div>
  );
});

const BTN = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  border: 'none', borderRadius: 50, padding: '10px 24px',
  fontSize: '.9rem', fontWeight: 800, cursor: 'pointer',
  fontFamily: 'inherit', transition: 'opacity .15s, transform .12s',
};

/* حساب الأبعاد — يُستدعى فقط من جانب العميل */
function calcDims(mode) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (mode === 'fullscreen') return { w: vw, h: vh };
  if (mode === 'spread') {
    const totalW = Math.min(vw - 48, 1100);
    const w = Math.floor((totalW - 12) / 2);
    const h = Math.min(Math.round(w * 1.42), vh - 230);
    return { w, h };
  }
  const w = Math.min(vw - 32, 500);
  return { w, h: Math.round(w * 1.42) };
}

/* ══════════════════════════════════════════════════════
   المكوّن الرئيسي — mode: 'fullscreen' | 'spread' | 'default'
══════════════════════════════════════════════════════ */
export default function StoryFlipBook({
  pages, accent = '#10b981', onComplete, read, loading, isTeacher, points,
  mode = 'default',
}) {
  const bookRef     = useRef(null);
  const isFlipping  = useRef(false);
  const touchStartX = useRef(null);
  const [current, setCurrent] = useState(0);
  /*
    dims = null حتى يُحسب من العميل (يمنع Hydration mismatch وتهيئة خاطئة)
    key على HTMLFlipBook يجبر إعادة التهيئة كلما تغيّرت الأبعاد
  */
  const [dims, setDims] = useState(null);
  const [hoverSide, setHoverSide] = useState(null); // 'left' | 'right'

  const totalPages = pages.length;
  const isLastPage = current >= totalPages - 1;

  /* ── حساب الأبعاد ── */
  useEffect(() => {
    // تهيئة فورية بعد أول render
    setDims(calcDims(mode));

    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setDims(calcDims(mode)), 140);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, [mode]);

  const fontSize = !dims ? '1rem'
    : dims.w < 280 ? '.82rem'
    : dims.w < 360 ? '.9rem'
    : dims.w < 460 ? '1rem'
    : '1.08rem';

  /* ── flip آمن ── */
  const safeFlip = useCallback((dir) => {
    if (isFlipping.current) return;
    if (dir === 'next' && current >= totalPages - 1) return;
    if (dir === 'prev' && current <= 0) return;
    isFlipping.current = true;
    if (dir === 'next') bookRef.current?.pageFlip().flipNext();
    else                bookRef.current?.pageFlip().flipPrev();
  }, [current, totalPages]);

  const onFlip        = useCallback((e) => setCurrent(e.data), []);
  const onChangeState = useCallback((e) => { if (e.data === 'read') isFlipping.current = false; }, []);

  /* لوحة المفاتيح */
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown')  safeFlip('next');
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp')    safeFlip('prev');
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [safeFlip]);

  /* لمس ── */
  const onTouchStart = useCallback((e) => { touchStartX.current = e.touches[0].clientX; }, []);
  const onTouchEnd   = useCallback((e) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    safeFlip(delta > 0 ? 'next' : 'prev');
  }, [safeFlip]);

  /* HTMLFlipBook props مشتركة */
  const flipProps = (portrait) => ({
    ref: bookRef,
    size: 'fixed',
    flippingTime: 460,
    drawShadow: true,
    startPage: 0, showCover: false,
    mobileScrollSupport: true,
    useMouseEvents: false, clickEventForward: false,
    usePortrait: portrait,
    onFlip, onChangeState,
  });

  /* ════════════════════════════════════════
     ① وضع الشاشة الكاملة — الهاتف
  ════════════════════════════════════════ */
  if (mode === 'fullscreen') {
    if (!dims) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, direction: 'rtl', background: '#fffdf5' }}>

        <Link href="/library" style={{
          position: 'absolute', top: 14, right: 14, zIndex: 30,
          background: 'rgba(0,0,0,.46)', backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 20, padding: '6px 14px',
          color: '#fff', fontSize: '.72rem', fontWeight: 900,
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>→ رجوع</Link>

        {/* نقاط التقدم — مقلوبة لتبدأ من اليمين (اتجاه القراءة العربي) */}
        <div style={{
          position: 'absolute', top: 18, left: '50%',
          transform: 'translateX(-50%) scaleX(-1)',
          zIndex: 30, display: 'flex', gap: 6,
        }}>
          {pages.map((_, i) => (
            <div key={i} style={{
              width: i === current ? 18 : 8, height: 8, borderRadius: 99,
              background: i < current ? `${accent}88` : i === current ? accent : 'rgba(0,0,0,.15)',
              transition: 'all .3s',
            }} />
          ))}
        </div>

        {/* الكتاب — مقلوب لجعل حركة القلب من اليمين لليسار (عربي) */}
        <div
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          onClick={(e) => safeFlip(e.clientX < window.innerWidth / 2 ? 'next' : 'prev')}
          style={{ position: 'absolute', inset: 0, touchAction: 'pan-y', transform: 'scaleX(-1)' }}
        >
          <HTMLFlipBook
            key={`fs-${dims.w}x${dims.h}`}
            {...flipProps(true)}
            width={dims.w} height={dims.h}
            minWidth={240} minHeight={360} maxWidth={600} maxHeight={1200}
          >
            {pages.map((html, i) => (
              <StoryPage key={i} html={html} fontSize={fontSize} pageNum={i+1} total={totalPages} mirrorX={true} />
            ))}
          </HTMLFlipBook>
        </div>

        {isLastPage && !isTeacher && (
          <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
            {read ? (
              <Link href="/library" style={{
                ...BTN, background: '#d1fae5', color: '#065f46',
                border: '2px solid #86efac', textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(5,150,105,.2)',
              }}>✅ أنهيت — العودة للمكتبة</Link>
            ) : (
              <button onClick={onComplete} disabled={loading} style={{
                ...BTN,
                background: `linear-gradient(135deg,${accent},${accent}cc)`,
                color: '#fff', boxShadow: `0 6px 22px ${accent}55`,
                fontSize: '.92rem', padding: '12px 28px',
                opacity: loading ? .65 : 1, cursor: loading ? 'default' : 'pointer',
              }}>
                {loading ? '⏳...' : `🎉 انتهيت! +${points} نقطة`}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════
     ② وضع الصفحتين — الحاسوب
  ════════════════════════════════════════ */
  if (mode === 'spread') {
    const bookW = dims ? dims.w * 2 + 12 : 840;

    /* cursor يتغيّر حسب جهة الهوفر */
    const spreadCursor = hoverSide === 'left'
      ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\'%3E%3Ctext y=\'24\' font-size=\'24\'%3E◀%3C/text%3E%3C/svg%3E") 16 16, w-resize'
      : hoverSide === 'right'
        ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\'%3E%3Ctext y=\'24\' font-size=\'24\'%3E▶%3C/text%3E%3C/svg%3E") 16 16, e-resize'
        : 'pointer';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 0 }}>

        {/* نقاط التقدم */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {pages.map((_, i) => (
            <div key={i} style={{
              width: i === current ? 22 : 10, height: 10, borderRadius: 99,
              background: i < current ? `${accent}66` : i === current ? accent : '#e2e8f0',
              transition: 'all .3s',
            }} />
          ))}
        </div>

        {/* غلاف الكتاب المفتوح */}
        {dims && (
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              safeFlip(e.clientX - rect.left < rect.width / 2 ? 'next' : 'prev');
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoverSide(e.clientX - rect.left < rect.width / 2 ? 'left' : 'right');
            }}
            onMouseLeave={() => setHoverSide(null)}
            style={{
              cursor: spreadCursor,
              /* ظل الكتاب المفتوح */
              filter: `
                drop-shadow(-4px 0 0 #e0d0a8)
                drop-shadow(-8px 0 0 #d5c49e)
                drop-shadow(4px 0 0 #e0d0a8)
                drop-shadow(8px 0 0 #d5c49e)
                drop-shadow(0 16px 40px rgba(0,0,0,.22))
              `,
              borderRadius: 6,
              position: 'relative',
              /* عكس ترتيب الصفحات لتصبح الصفحة 1 يميناً (اتجاه العربية) */
              transform: 'scaleX(-1)',
            }}
          >
            {/* خط الوسط (عمود الكتاب) */}
            <div style={{
              position: 'absolute',
              top: 0, bottom: 0,
              left: '50%', width: 3,
              background: 'linear-gradient(to right, #c4a96d44, #c4a96d88, #c4a96d44)',
              zIndex: 10, pointerEvents: 'none',
            }} />

            <HTMLFlipBook
              key={`sp-${dims.w}x${dims.h}`}
              {...flipProps(false)}
              width={dims.w} height={dims.h}
              minWidth={200} minHeight={280} maxWidth={560} maxHeight={820}
            >
              {pages.map((html, i) => (
                <StoryPage
                  key={i} html={html} fontSize={fontSize}
                  pageNum={i+1} total={totalPages}
                  isRight={i % 2 === 0}
                  mirrorX={true}
                />
              ))}
            </HTMLFlipBook>
          </div>
        )}

        {/* أزرار التنقل */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: bookW, maxWidth: 'calc(100vw - 48px)',
          marginTop: 20, direction: 'rtl',
        }}>
          <button onClick={() => safeFlip('prev')} disabled={current === 0} style={{
            ...BTN, background: '#f1f5f9', color: '#475569',
            opacity: current === 0 ? .25 : 1,
          }}>
            ▶ السابق
          </button>

          <span style={{ color: '#94a3b8', fontSize: '.85rem', fontWeight: 700, direction: 'ltr' }}>
            {current + 1}
            {current + 1 < totalPages ? `‒${Math.min(current + 2, totalPages)}` : ''}
            {' / '}{totalPages}
          </span>

          {isLastPage ? (
            !isTeacher && (read ? (
              <div style={{ ...BTN, background: '#d1fae5', color: '#065f46', border: '1.5px solid #86efac', cursor: 'default' }}>
                ✅ أنهيت القصة
              </div>
            ) : (
              <button onClick={onComplete} disabled={loading} style={{
                ...BTN,
                background: `linear-gradient(135deg,${accent},${accent}cc)`,
                color: '#fff', boxShadow: `0 4px 18px ${accent}44`,
                opacity: loading ? .6 : 1, cursor: loading ? 'default' : 'pointer',
              }}>
                {loading ? '⏳...' : `🎉 انتهيت! +${points} نقطة`}
              </button>
            ))
          ) : (
            <button onClick={() => safeFlip('next')} style={{
              ...BTN,
              background: `linear-gradient(135deg,${accent},${accent}cc)`,
              color: '#fff', boxShadow: `0 4px 18px ${accent}44`,
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              التالي ◀
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════
     ③ الوضع الافتراضي — صفحة واحدة (موبايل غير fullscreen)
  ════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
        {pages.map((_, i) => (
          <div key={i} style={{
            width: i === current ? 20 : 9, height: 9, borderRadius: 99,
            background: i < current ? `${accent}66` : i === current ? accent : '#e2e8f0',
            transition: 'all .3s',
          }} />
        ))}
      </div>

      {dims && (
        <div
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          style={{
            filter: 'drop-shadow(2px 4px 0 #e8d9b8) drop-shadow(4px 8px 0 #ddd0a8) drop-shadow(0 12px 24px rgba(0,0,0,.15))',
            borderRadius: 6, touchAction: 'pan-y',
          }}
        >
          <HTMLFlipBook
            key={`df-${dims.w}x${dims.h}`}
            {...flipProps(true)}
            width={dims.w} height={dims.h}
            minWidth={220} minHeight={300} maxWidth={500} maxHeight={720}
          >
            {pages.map((html, i) => (
              <StoryPage key={i} html={html} fontSize={fontSize} pageNum={i+1} total={totalPages} />
            ))}
          </HTMLFlipBook>
        </div>
      )}

      {dims && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: dims.w, marginTop: 16, direction: 'rtl',
        }}>
          <button onClick={() => safeFlip('prev')} disabled={current === 0} style={{
            ...BTN, background: '#f1f5f9', color: '#64748b', opacity: current === 0 ? .25 : 1,
          }}>▶ السابق</button>
          <span style={{ color: '#94a3b8', fontSize: '.8rem', fontWeight: 700 }}>{current+1} / {totalPages}</span>
          {isLastPage ? (!isTeacher && (read ? (
            <div style={{ ...BTN, background: '#d1fae5', color: '#065f46', border: '1.5px solid #86efac', cursor: 'default' }}>✅ أنهيت</div>
          ) : (
            <button onClick={onComplete} disabled={loading} style={{
              ...BTN, background: `linear-gradient(135deg,${accent},${accent}cc)`,
              color: '#fff', boxShadow: `0 4px 14px ${accent}44`,
              opacity: loading ? .6 : 1, cursor: loading ? 'default' : 'pointer',
            }}>{loading ? '⏳...' : `🎉 انتهيت! +${points}`}</button>
          ))) : (
            <button onClick={() => safeFlip('next')} style={{
              ...BTN, background: `linear-gradient(135deg,${accent},${accent}cc)`,
              color: '#fff', boxShadow: `0 4px 14px ${accent}44`,
            }}>التالي ◀</button>
          )}
        </div>
      )}
    </div>
  );
}
