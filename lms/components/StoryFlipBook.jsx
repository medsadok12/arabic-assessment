'use client';
import { useRef, useState, useCallback, forwardRef, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import DOMPurify from 'isomorphic-dompurify';

/* ── صفحة واحدة — مُمرَّرة بـ forwardRef لأن react-pageflip يحتاجها ── */
const StoryPage = forwardRef(function StoryPage({ html, pageNum, total, accent, isFirst, isLast }, ref) {
  return (
    <div ref={ref} style={{ background: 'transparent', overflow: 'hidden' }}>
      <div style={{
        background: isFirst || isLast ? `linear-gradient(160deg,${accent}18 0%,#fffdf5 100%)` : '#fffdf5',
        height: '100%',
        padding: '28px 22px 36px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: "'Cairo','Tajawal',sans-serif",
        fontSize: '1.05rem',
        lineHeight: 2,
        color: '#2d1f0e',
        direction: 'rtl',
        border: `1px solid ${accent}28`,
        borderRadius: 4,
      }}>
        {/* محتوى الصفحة */}
        <div
          style={{ flex: 1, overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
        />

        {/* رقم الصفحة */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '.62rem',
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

/* ── المكوّن الرئيسي ── */
export default function StoryFlipBook({ pages, accent = '#10b981', onComplete, read, loading, isTeacher, points }) {
  const bookRef   = useRef(null);
  const [current, setCurrent] = useState(0);
  const [width,   setWidth]   = useState(320);
  const totalPages = pages.length;

  /* حجم ديناميكي حسب العرض */
  useEffect(() => {
    const update = () => {
      const w = Math.min(window.innerWidth - 32, 700);
      setWidth(w);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isLastPage = current >= totalPages - 1;

  const flipNext = useCallback(() => {
    bookRef.current?.pageFlip().flipNext();
  }, []);

  const flipPrev = useCallback(() => {
    bookRef.current?.pageFlip().flipPrev();
  }, []);

  const onFlip = useCallback((e) => {
    setCurrent(e.data);
  }, []);

  /* لوحة المفاتيح */
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown')  flipNext();
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp')    flipPrev();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [flipNext, flipPrev]);

  /* ارتفاع الكتاب بنسبة ثابتة */
  const pageW  = Math.min(width * 0.48, 340);
  const pageH  = Math.round(pageW * 1.42);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* نقاط الصفحات */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '0 0 16px' }}>
        {pages.map((_, i) => (
          <div
            key={i}
            onClick={() => {
              const diff = i - current;
              if (diff > 0) {
                for (let j = 0; j < diff; j++) bookRef.current?.pageFlip().flipNext();
              } else if (diff < 0) {
                for (let j = 0; j < -diff; j++) bookRef.current?.pageFlip().flipPrev();
              }
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

      {/* كتاب react-pageflip */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        filter: 'drop-shadow(0 12px 32px rgba(0,0,0,.18))',
      }}>
        <HTMLFlipBook
          ref={bookRef}
          width={pageW}
          height={pageH}
          size="fixed"
          minWidth={160}
          minHeight={220}
          maxWidth={340}
          maxHeight={500}
          flippingTime={600}
          drawShadow={true}
          usePortrait={true}
          startPage={0}
          showCover={false}
          mobileScrollSupport={false}
          clickEventForward={true}
          useMouseEvents={true}
          onFlip={onFlip}
          style={{ fontFamily: "'Cairo','Tajawal',sans-serif" }}
        >
          {pages.map((html, i) => (
            <StoryPage
              key={i}
              html={html}
              pageNum={i + 1}
              total={totalPages}
              accent={accent}
              isFirst={i === 0}
              isLast={i === totalPages - 1}
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
        maxWidth: 480,
        marginTop: 20,
        gap: 12,
        direction: 'rtl',
      }}>
        <button
          onClick={flipPrev}
          disabled={current === 0}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: 'none', borderRadius: 50, padding: '10px 22px',
            fontSize: '.88rem', fontWeight: 800, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all .18s',
            background: '#f1f5f9', color: '#64748b',
            opacity: current === 0 ? .28 : 1,
          }}
        >
          ▶ السابق
        </button>

        <span style={{ color: '#94a3b8', fontSize: '.82rem', fontWeight: 700 }}>
          {current + 1} / {totalPages}
        </span>

        {isLastPage ? (
          !isTeacher && (
            read ? (
              <div style={{
                background: '#d1fae5', border: '1.5px solid #86efac',
                borderRadius: 50, padding: '9px 22px',
                color: '#065f46', fontWeight: 900, fontSize: '.85rem',
              }}>
                ✅ أنهيت القصة
              </div>
            ) : (
              <button
                onClick={onComplete}
                disabled={loading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  border: 'none', borderRadius: 50, padding: '10px 22px',
                  fontSize: '.88rem', fontWeight: 800, cursor: loading ? 'default' : 'pointer',
                  fontFamily: 'inherit', transition: 'all .18s',
                  background: `linear-gradient(135deg,${accent},${accent}cc)`,
                  color: '#fff',
                  boxShadow: `0 4px 16px ${accent}44`,
                  opacity: loading ? .6 : 1,
                }}
              >
                {loading ? '⏳...' : `🎉 انتهيت! +${points} نقطة`}
              </button>
            )
          )
        ) : (
          <button
            onClick={flipNext}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: 'none', borderRadius: 50, padding: '10px 22px',
              fontSize: '.88rem', fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all .18s',
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
