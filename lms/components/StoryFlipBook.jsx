'use client';
import { useRef, useState, useCallback, forwardRef, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import DOMPurify from 'isomorphic-dompurify';

const StoryPage = forwardRef(function StoryPage({ html, pageNum, total, accent, fontSize }, ref) {
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
  fontFamily: 'inherit', transition: 'all .18s',
};

export default function StoryFlipBook({ pages, accent = '#10b981', onComplete, read, loading, isTeacher, points }) {
  const bookRef    = useRef(null);
  const [current,  setCurrent]  = useState(0);
  const [pageW,    setPageW]    = useState(320);
  const totalPages = pages.length;
  const isLastPage = current >= totalPages - 1;

  useEffect(() => {
    const update = () => {
      /*
        pageW must be > containerWidth/2 so that pageW*2 > container,
        which triggers react-pageflip's usePortrait single-page mode.
        Using (innerWidth - 32) guarantees this on every screen size.
        Cap at 500px for readability on large desktops.
      */
      setPageW(Math.min(window.innerWidth - 32, 500));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const pageH    = Math.round(pageW * 1.42);
  const fontSize = pageW < 320 ? '.88rem' : pageW < 420 ? '1rem' : '1.08rem';

  const flipNext = useCallback(() => bookRef.current?.pageFlip().flipNext(), []);
  const flipPrev = useCallback(() => bookRef.current?.pageFlip().flipPrev(), []);
  const onFlip   = useCallback((e) => setCurrent(e.data), []);

  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown')  flipNext();
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp')    flipPrev();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [flipNext, flipPrev]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* نقاط التقدم */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 7, margin: '0 0 18px' }}>
        {pages.map((_, i) => (
          <div
            key={i}
            onClick={() => {
              const diff = i - current;
              const flip = diff > 0 ? flipNext : flipPrev;
              for (let j = 0; j < Math.abs(diff); j++) flip();
            }}
            style={{
              width:  i === current ? 22 : 10,
              height: 10,
              borderRadius: 99,
              background: i < current ? `${accent}66` : i === current ? accent : '#e2e8f0',
              transition: 'all .3s',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

      {/* الكتاب */}
      <div style={{
        filter: 'drop-shadow(2px 4px 0 #e8d9b8) drop-shadow(4px 8px 0 #ddd0a8) drop-shadow(0 14px 28px rgba(0,0,0,.18))',
        borderRadius: 6,
      }}>
        <HTMLFlipBook
          ref={bookRef}
          width={pageW}
          height={pageH}
          size="fixed"
          minWidth={220}
          minHeight={300}
          maxWidth={500}
          maxHeight={720}
          flippingTime={550}
          drawShadow={true}
          usePortrait={true}
          startPage={0}
          showCover={false}
          mobileScrollSupport={false}
          clickEventForward={false}
          useMouseEvents={true}
          onFlip={onFlip}
        >
          {pages.map((html, i) => (
            <StoryPage
              key={i}
              html={html}
              pageNum={i + 1}
              total={totalPages}
              accent={accent}
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
          onClick={flipPrev}
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
            onClick={flipNext}
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
