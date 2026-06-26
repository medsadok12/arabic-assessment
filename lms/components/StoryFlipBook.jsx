'use client';
import { useRef, useState, useCallback, forwardRef, useEffect } from 'react';
import Link from 'next/link';
import HTMLFlipBook from 'react-pageflip';
import DOMPurify from 'isomorphic-dompurify';

/* ── صفحة واحدة ── */
const StoryPage = forwardRef(function StoryPage({ html, fontSize, pageNum, total }, ref) {
  return (
    <div ref={ref} style={{ overflow: 'hidden', background: 'transparent' }}>
      <div style={{
        background: '#fffdf5',
        height: '100%',
        padding: '22px 20px 36px',
        boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        fontFamily: "'Cairo','Tajawal',sans-serif",
        fontSize, lineHeight: 1.9, color: '#2d1f0e',
        direction: 'rtl',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}>
        <div style={{ flex: 1, overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
        />
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          fontSize: '.58rem', color: '#c4a96d', fontWeight: 700,
          letterSpacing: '.05em', whiteSpace: 'nowrap',
        }}>
          {pageNum} / {total}
        </div>
      </div>
    </div>
  );
});

/* ── نقاط التقدم ── */
function ProgressDots({ pages, current, accent, style }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, ...style }}>
      {pages.map((_, i) => (
        <div key={i} style={{
          width: i === current ? 18 : 8, height: 8, borderRadius: 99,
          background: i < current ? `${accent}77` : i === current ? accent : 'rgba(255,255,255,.5)',
          transition: 'all .3s',
        }} />
      ))}
    </div>
  );
}

const BTN = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  border: 'none', borderRadius: 50, padding: '10px 22px',
  fontSize: '.88rem', fontWeight: 800, cursor: 'pointer',
  fontFamily: 'inherit', transition: 'opacity .15s, transform .15s',
};

/* ══════════════════════════════════════════════════════
   المكوّن الرئيسي
   mode: 'fullscreen' | 'spread' | 'default'
══════════════════════════════════════════════════════ */
export default function StoryFlipBook({
  pages, accent = '#10b981', onComplete, read, loading, isTeacher, points,
  mode = 'default',
}) {
  const bookRef     = useRef(null);
  const isFlipping  = useRef(false);
  const touchStartX = useRef(null);

  const [current, setCurrent] = useState(0);
  const [dims,    setDims]    = useState({ w: 320, h: 454 });

  const totalPages = pages.length;
  const isLastPage = current >= totalPages - 1;

  /* ── حساب الأبعاد حسب الوضع ── */
  useEffect(() => {
    let timer;
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (mode === 'fullscreen') {
          /* صفحة واحدة تملأ الشاشة كاملةً */
          setDims({ w: vw, h: vh });
        } else if (mode === 'spread') {
          /* صفحتان جنباً إلى جنب — أكبر قدر ممكن */
          const totalW = Math.min(vw - 48, 1100);
          const pageW  = Math.floor((totalW - 8) / 2);
          const pageH  = Math.min(Math.round(pageW * 1.42), vh - 200);
          setDims({ w: pageW, h: pageH });
        } else {
          /* وضع الحاسوب الافتراضي — صفحة واحدة محددة الحجم */
          const pageW = Math.min(vw - 32, 500);
          const pageH = Math.round(pageW * 1.42);
          setDims({ w: pageW, h: pageH });
        }
      }, 80);
    };
    update();
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); clearTimeout(timer); };
  }, [mode]);

  const fontSize = dims.w < 280 ? '.82rem' : dims.w < 340 ? '.88rem' : dims.w < 440 ? '.98rem' : '1.06rem';

  /* ── إدارة الانتقال (flip) الآمن ── */
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

  /* سحب اللمس (يدوي) */
  const onTouchStart = useCallback((e) => { touchStartX.current = e.touches[0].clientX; }, []);
  const onTouchEnd   = useCallback((e) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    safeFlip(delta > 0 ? 'next' : 'prev');
  }, [safeFlip]);

  /* HTMLFlipBook props مشتركة */
  const commonFlipProps = {
    ref: bookRef,
    size: 'fixed',
    flippingTime: 450,
    drawShadow: true,
    startPage: 0,
    showCover: false,
    mobileScrollSupport: true,
    useMouseEvents: false,
    clickEventForward: false,
    onFlip,
    onChangeState,
  };

  /* ════════════════════════════════════════
     ① وضع الشاشة الكاملة — الهاتف
  ════════════════════════════════════════ */
  if (mode === 'fullscreen') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        direction: 'rtl', overflow: 'hidden',
        background: '#fffdf5',
      }}>

        {/* زر الرجوع — أعلى اليمين */}
        <Link href="/library" style={{
          position: 'absolute', top: 14, right: 14, zIndex: 30,
          background: 'rgba(0,0,0,.46)', backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 20, padding: '6px 14px',
          color: '#fff', fontSize: '.72rem', fontWeight: 900,
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
          letterSpacing: '.01em',
        }}>
          → رجوع
        </Link>

        {/* نقاط التقدم — أعلى المنتصف */}
        <ProgressDots pages={pages} current={current} accent={accent} style={{
          position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 30,
        }} />

        {/* الكتاب — يملأ الشاشة بالكامل */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={(e) => {
            /* نقر يمين = التالي، نقر يسار = السابق */
            const x = e.clientX;
            safeFlip(x > window.innerWidth / 2 ? 'next' : 'prev');
          }}
          style={{ position: 'absolute', inset: 0, touchAction: 'pan-y' }}
        >
          <HTMLFlipBook
            {...commonFlipProps}
            width={dims.w}
            height={dims.h}
            minWidth={240} minHeight={360}
            maxWidth={600} maxHeight={1200}
            usePortrait={true}
          >
            {pages.map((html, i) => (
              <StoryPage key={i} html={html} fontSize={fontSize} pageNum={i + 1} total={totalPages} />
            ))}
          </HTMLFlipBook>
        </div>

        {/* زر الإنهاء — يظهر في الصفحة الأخيرة فقط */}
        {isLastPage && !isTeacher && (
          <div style={{
            position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 30,
          }}>
            {read ? (
              <Link href="/library" style={{
                ...BTN, background: '#d1fae5', color: '#065f46',
                border: '2px solid #86efac', textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(5,150,105,.2)',
              }}>
                ✅ أنهيت — العودة للمكتبة
              </Link>
            ) : (
              <button onClick={onComplete} disabled={loading} style={{
                ...BTN,
                background: `linear-gradient(135deg,${accent},${accent}cc)`,
                color: '#fff', boxShadow: `0 6px 22px ${accent}55`,
                fontSize: '.92rem', padding: '12px 26px',
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

        {/* نقاط */}
        <ProgressDots pages={pages} current={current} accent={accent} style={{
          marginBottom: 16,
        }} />

        {/* كتاب صفحتان — النقر يتحكم في الاتجاه */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            /* click على نصف اليسار = التالي؛ نصف اليمين = السابق */
            safeFlip(x < rect.width / 2 ? 'next' : 'prev');
          }}
          style={{
            cursor: 'pointer',
            filter: 'drop-shadow(0 6px 0 #e8d9b8) drop-shadow(0 12px 0 #ddd0a8) drop-shadow(0 16px 32px rgba(0,0,0,.16))',
            borderRadius: 4,
          }}
        >
          <HTMLFlipBook
            {...commonFlipProps}
            width={dims.w}
            height={dims.h}
            minWidth={200} minHeight={280}
            maxWidth={560} maxHeight={820}
            usePortrait={false}
          >
            {pages.map((html, i) => (
              <StoryPage key={i} html={html} fontSize={fontSize} pageNum={i + 1} total={totalPages} />
            ))}
          </HTMLFlipBook>
        </div>

        {/* أزرار التنقل */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', maxWidth: dims.w * 2 + 8,
          marginTop: 18, direction: 'rtl',
        }}>
          <button onClick={() => safeFlip('prev')} disabled={current === 0} style={{
            ...BTN, background: '#f1f5f9', color: '#64748b', opacity: current === 0 ? .25 : 1,
          }}>
            ▶ السابق
          </button>

          <span style={{ color: '#94a3b8', fontSize: '.8rem', fontWeight: 700 }}>
            {current + 1}{current + 1 < totalPages ? `–${Math.min(current + 2, totalPages)}` : ''} / {totalPages}
          </span>

          {isLastPage ? (
            !isTeacher && (
              read ? (
                <div style={{ ...BTN, background: '#d1fae5', color: '#065f46', border: '1.5px solid #86efac', cursor: 'default' }}>
                  ✅ أنهيت القصة
                </div>
              ) : (
                <button onClick={onComplete} disabled={loading} style={{
                  ...BTN,
                  background: `linear-gradient(135deg,${accent},${accent}cc)`,
                  color: '#fff', boxShadow: `0 4px 16px ${accent}44`,
                  opacity: loading ? .6 : 1, cursor: loading ? 'default' : 'pointer',
                }}>
                  {loading ? '⏳...' : `🎉 انتهيت! +${points} نقطة`}
                </button>
              )
            )
          ) : (
            <button onClick={() => safeFlip('next')} style={{
              ...BTN,
              background: `linear-gradient(135deg,${accent},${accent}cc)`,
              color: '#fff', boxShadow: `0 4px 16px ${accent}44`,
            }}>
              التالي ◀
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════
     ③ الوضع الافتراضي — صفحة واحدة
  ════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <ProgressDots pages={pages} current={current} accent={accent} style={{ marginBottom: 14 }} />

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          filter: 'drop-shadow(2px 4px 0 #e8d9b8) drop-shadow(4px 8px 0 #ddd0a8) drop-shadow(0 12px 24px rgba(0,0,0,.15))',
          borderRadius: 6, touchAction: 'pan-y',
        }}
      >
        <HTMLFlipBook
          {...commonFlipProps}
          width={dims.w} height={dims.h}
          minWidth={220} minHeight={300}
          maxWidth={500} maxHeight={720}
          usePortrait={true}
        >
          {pages.map((html, i) => (
            <StoryPage key={i} html={html} fontSize={fontSize} pageNum={i + 1} total={totalPages} />
          ))}
        </HTMLFlipBook>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', maxWidth: dims.w, marginTop: 16, direction: 'rtl',
      }}>
        <button onClick={() => safeFlip('prev')} disabled={current === 0} style={{
          ...BTN, background: '#f1f5f9', color: '#64748b', opacity: current === 0 ? .25 : 1,
        }}>
          ▶ السابق
        </button>
        <span style={{ color: '#94a3b8', fontSize: '.8rem', fontWeight: 700 }}>{current + 1} / {totalPages}</span>
        {isLastPage ? (
          !isTeacher && (read ? (
            <div style={{ ...BTN, background: '#d1fae5', color: '#065f46', border: '1.5px solid #86efac', cursor: 'default' }}>
              ✅ أنهيت القصة
            </div>
          ) : (
            <button onClick={onComplete} disabled={loading} style={{
              ...BTN, background: `linear-gradient(135deg,${accent},${accent}cc)`,
              color: '#fff', boxShadow: `0 4px 16px ${accent}44`,
              opacity: loading ? .6 : 1, cursor: loading ? 'default' : 'pointer',
            }}>
              {loading ? '⏳...' : `🎉 انتهيت! +${points} نقطة`}
            </button>
          ))
        ) : (
          <button onClick={() => safeFlip('next')} style={{
            ...BTN, background: `linear-gradient(135deg,${accent},${accent}cc)`,
            color: '#fff', boxShadow: `0 4px 16px ${accent}44`,
          }}>
            التالي ◀
          </button>
        )}
      </div>
    </div>
  );
}
