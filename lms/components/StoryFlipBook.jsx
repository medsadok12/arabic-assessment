'use client';
import { useRef, useState, useCallback, forwardRef, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import DOMPurify from 'isomorphic-dompurify';

const StoryPage = forwardRef(function StoryPage({ html, pageNum, total, fontSize }, ref) {
  return (
    <div ref={ref} style={{ overflow: 'hidden', background: 'transparent' }}>
      <div style={{
        background: '#fffdf5',
        height: '100%',
        padding: '28px 22px 44px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: "'Cairo','Tajawal',sans-serif",
        fontSize,
        lineHeight: 1.95,
        color: '#2d1f0e',
        direction: 'rtl',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}>
        <div
          style={{ flex: 1, overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
        />
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '.6rem',
          color: '#c4a96d',
          fontWeight: 700,
          letterSpacing: '.05em',
          whiteSpace: 'nowrap',
        }}>
          {pageNum} / {total}
        </div>
      </div>
    </div>
  );
});

const BTN = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  border: 'none', borderRadius: 50, padding: '10px 20px',
  fontSize: '.86rem', fontWeight: 800, cursor: 'pointer',
  fontFamily: 'inherit', transition: 'opacity .15s',
};

export default function StoryFlipBook({ pages, accent = '#10b981', onComplete, read, loading, isTeacher, points }) {
  const bookRef       = useRef(null);
  const isFlipping    = useRef(false);
  const touchStartX   = useRef(null);

  const [current, setCurrent] = useState(0);
  const [pageW,   setPageW]   = useState(320);
  const totalPages = pages.length;
  const isLastPage = current >= totalPages - 1;

  /* resize — debounced ليتجنب تهيئة الكتاب بشكل متكرر */
  useEffect(() => {
    let timer;
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        /* pageW > containerWidth/2 دائماً → usePortrait يُفعّل وضع صفحة واحدة */
        setPageW(Math.min(window.innerWidth - 32, 500));
      }, 120);
    };
    update();
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); clearTimeout(timer); };
  }, []);

  const pageH    = Math.round(pageW * 1.42);
  const fontSize = pageW < 320 ? '.88rem' : pageW < 420 ? '1rem' : '1.08rem';

  /* flip آمن: يمنع التنفيذ المتكرر خلال الأنيميشن */
  const safeFlip = useCallback((dir) => {
    if (isFlipping.current) return;
    if (dir === 'next' && current >= totalPages - 1) return;
    if (dir === 'prev' && current <= 0) return;
    isFlipping.current = true;
    if (dir === 'next') bookRef.current?.pageFlip().flipNext();
    else                bookRef.current?.pageFlip().flipPrev();
  }, [current, totalPages]);

  /* استعادة القدرة على الانتقال بعد انتهاء الأنيميشن */
  const onChangeState = useCallback((e) => {
    if (e.data === 'read') isFlipping.current = false;
  }, []);

  const onFlip = useCallback((e) => setCurrent(e.data), []);

  /* لوحة المفاتيح */
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown')  safeFlip('next');
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp')    safeFlip('prev');
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [safeFlip]);

  /* سحب اللمس — كشف يدوي بدل useMouseEvents للمكتبة */
  const onTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    safeFlip(delta > 0 ? 'next' : 'prev');
  }, [safeFlip]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* نقاط التقدم */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 7, margin: '0 0 18px' }}>
        {pages.map((_, i) => (
          <div key={i} style={{
            width:  i === current ? 22 : 10,
            height: 10,
            borderRadius: 99,
            background: i < current ? `${accent}66` : i === current ? accent : '#e2e8f0',
            transition: 'all .3s',
            cursor: 'pointer',
          }} />
        ))}
      </div>

      {/* الكتاب — سحب اللمس معالَج يدوياً، أحداث المكتبة معطّلة */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          filter: 'drop-shadow(2px 4px 0 #e8d9b8) drop-shadow(4px 8px 0 #ddd0a8) drop-shadow(0 14px 28px rgba(0,0,0,.16))',
          borderRadius: 6,
          touchAction: 'pan-y',
        }}
      >
        <HTMLFlipBook
          ref={bookRef}
          width={pageW}
          height={pageH}
          size="fixed"
          minWidth={220}
          minHeight={300}
          maxWidth={500}
          maxHeight={720}
          flippingTime={480}
          drawShadow={true}
          usePortrait={true}
          startPage={0}
          showCover={false}
          mobileScrollSupport={true}
          useMouseEvents={false}
          clickEventForward={false}
          onFlip={onFlip}
          onChangeState={onChangeState}
        >
          {pages.map((html, i) => (
            <StoryPage
              key={i}
              html={html}
              pageNum={i + 1}
              total={totalPages}
              fontSize={fontSize}
            />
          ))}
        </HTMLFlipBook>
      </div>

      {/* أزرار التنقل */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: pageW,
        marginTop: 20,
        direction: 'rtl',
      }}>
        <button
          onClick={() => safeFlip('prev')}
          disabled={current === 0}
          style={{ ...BTN, background: '#f1f5f9', color: '#64748b', opacity: current === 0 ? .28 : 1 }}
        >
          ▶ السابق
        </button>

        <span style={{ color: '#94a3b8', fontSize: '.8rem', fontWeight: 700 }}>
          {current + 1} / {totalPages}
        </span>

        {isLastPage ? (
          !isTeacher && (
            read ? (
              <div style={{
                background: '#d1fae5', border: '1.5px solid #86efac',
                borderRadius: 50, padding: '9px 18px',
                color: '#065f46', fontWeight: 900, fontSize: '.82rem',
              }}>
                ✅ أنهيت القصة
              </div>
            ) : (
              <button
                onClick={onComplete}
                disabled={loading}
                style={{
                  ...BTN,
                  background: `linear-gradient(135deg,${accent},${accent}cc)`,
                  color: '#fff',
                  boxShadow: `0 4px 16px ${accent}44`,
                  opacity: loading ? .6 : 1,
                  cursor: loading ? 'default' : 'pointer',
                }}
              >
                {loading ? '⏳...' : `🎉 انتهيت! +${points}`}
              </button>
            )
          )
        ) : (
          <button
            onClick={() => safeFlip('next')}
            style={{
              ...BTN,
              background: `linear-gradient(135deg,${accent},${accent}cc)`,
              color: '#fff',
              boxShadow: `0 4px 16px ${accent}44`,
            }}
          >
            التالي ◀
          </button>
        )}
      </div>
    </div>
  );
}
