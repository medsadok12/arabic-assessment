'use client';
import { useRef, useState, useCallback, forwardRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import HTMLFlipBook from 'react-pageflip';
import DOMPurify from 'isomorphic-dompurify';
import { useStoryNarration, PageListenButton, AutoFlipToggle } from './StoryNarration';
import { storyPageText } from '../lib/story-speech';

/* ── صفحة واحدة ── */
const StoryPage = forwardRef(function StoryPage({ html, pageNum, total, isRight, mirrorX }, ref) {
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
        fontSize: '1.0rem', lineHeight: 1.95, color: '#2d1f0e',
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
          {total} / {pageNum}
        </div>
      </div>
    </div>
  );
});

/* ── أزرار التنقل ثلاثية الأبعاد (رجوع/التالي/انتهيت) — بنفس روح زر الاستماع:
      حافة سفلية أغمق + ظل، وتغوص عند الضغط. لون «التالي» = لون القصة نفسها ── */
const NAV_CSS = `
  .sfb-nav { display:inline-flex; align-items:center; justify-content:center; gap:8px; box-sizing:border-box;
    min-height:54px; padding:0 20px; border-radius:16px; font-family:inherit; font-size:1.05rem; font-weight:900;
    cursor:pointer; user-select:none; text-decoration:none; white-space:nowrap; background-repeat:no-repeat;
    transition:transform .08s ease, border-bottom-width .08s ease, box-shadow .08s ease, opacity .15s;
    -webkit-tap-highlight-color:transparent; }
  .sfb-prev { background-color:#FAF7F2; background-image:linear-gradient(180deg,#FFFFFF 0%,#F4EFE6 100%); color:#1A2B4A;
    border:2px solid #EDE5D8; border-bottom:6px solid #D9CBB0; box-shadow:0 8px 16px rgba(26,43,74,.14); }
  .sfb-next { background-color:var(--sfb-accent,#0284c7); background-image:linear-gradient(180deg,rgba(255,255,255,.28) 0%,rgba(255,255,255,0) 70%);
    color:#fff; text-shadow:0 1px 1px rgba(0,0,0,.25);
    border:2px solid rgba(0,0,0,.06); border-bottom:6px solid rgba(0,0,0,.28); box-shadow:0 8px 18px rgba(26,43,74,.24); }
  .sfb-done { background-color:#d1fae5; color:#065f46; border:2px solid #86efac; border-bottom:6px solid #5fcf98; }
  .sfb-nav:not(:disabled):active { transform:translateY(4px); border-bottom-width:2px; box-shadow:0 3px 8px rgba(26,43,74,.16); }
  .sfb-nav:disabled { opacity:.35; cursor:default; box-shadow:none; }
  .sfb-nav:focus-visible { outline:3px solid #1A2B4A; outline-offset:3px; }
`;

function NavBtn({ kind = 'prev', onClick, disabled, href, children, style }) {
  const cls = `sfb-nav sfb-${kind}`;
  if (href) return <Link href={href} className={cls} style={style}>{children}</Link>;
  return <button type="button" className={cls} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

/* شريط أزرار الجوال أسفل الشاشة — الكتاب يقصر بقدره فلا تغطي الأزرار نص الصفحة */
const FS_BAR_H = 100;

/* حساب الأبعاد — يُستدعى فقط من جانب العميل */
function calcDims(mode) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (mode === 'fullscreen') return { w: vw, h: vh - FS_BAR_H };
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
  backHref = '/library',
  backLabel = '→ المكتبة',
  pageAudio = [],
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
  /* وضع الحاسوب يعرض صفحتين معاً (current وcurrent+1): آخر عرض هو الذي تظهر فيه
     الصفحة الأخيرة — وإلا لا يظهر زر «انتهيت» أبداً في قصة عدد صفحاتها زوجي */
  const step       = mode === 'spread' ? 2 : 1;
  const isLastPage = current + step >= totalPages;

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

  /* ── صوت الصفحات: زر مستقل تحت كل صفحة ظاهرة، يشغّل صوت صفحته فقط —
        تسجيل المعلم إن وُجد، وإلا نص الصفحة بصوت الجهاز ── */
  const visiblePages = Array.from({ length: step }, (_, k) => current + k).filter(i => i < totalPages);
  const pagesKey  = pages.join('\u0000');
  const pageTexts = useMemo(() => pages.map(storyPageText), [pagesKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const narr = useStoryNarration({
    pageAudio,
    pageTexts,
    visiblePages,
    hasNext: current + step < totalPages,
    onAdvance: () => safeFlip('next'),
  });
  const listenBtn = (p, variant) => (
    <PageListenButton state={narr.stateOf(p)} onClick={() => narr.toggle(p)} pageNumber={p + 1} variant={variant} />
  );

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
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, direction: 'rtl', background: '#fffdf5', '--sfb-accent': accent }}>
        <style>{NAV_CSS}</style>

        <Link href={backHref} style={{
          position: 'absolute', top: 14, right: 14, zIndex: 30,
          background: 'rgba(0,0,0,.46)', backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 20, padding: '6px 14px',
          color: '#fff', fontSize: '.72rem', fontWeight: 900,
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>{backLabel}</Link>

        {/* قلب تلقائي — الزاوية العليا اليسرى */}
        {narr.hasAudio && totalPages > 1 && (
          <div style={{ position: 'absolute', top: 12, left: 14, zIndex: 30 }}>
            <AutoFlipToggle on={narr.autoFlip} onToggle={narr.toggleAuto} />
          </div>
        )}

        {/* نقاط التقدم — الحاوية RTL أصلاً فتبدأ الأولى من اليمين (اتجاه القراءة العربي).
            لا scaleX(-1) هنا: كان يعكسها مرة ثانية فتبدأ من اليسار */}
        <div style={{
          position: 'absolute', top: 18, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30, display: 'flex', gap: totalPages > 8 ? 4 : 6,
        }}>
          {pages.map((_, i) => (
            <div key={i} style={{
              width: i === current ? 18 : (totalPages > 8 ? 6 : 8), height: 8, borderRadius: 99,
              background: i < current ? `${accent}88` : i === current ? accent : 'rgba(0,0,0,.15)',
              transition: 'all .3s',
            }} />
          ))}
        </div>

        {/* الكتاب — مقلوب لجعل حركة القلب من اليمين لليسار (عربي) */}
        <div
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          onClick={(e) => safeFlip(e.clientX < window.innerWidth / 2 ? 'next' : 'prev')}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: FS_BAR_H, touchAction: 'pan-y', transform: 'scaleX(-1)' }}
        >
          <HTMLFlipBook
            key={`fs-${dims.w}x${dims.h}`}
            {...flipProps(true)}
            width={dims.w} height={dims.h}
            minWidth={240} minHeight={360} maxWidth={600} maxHeight={1200}
          >
            {pages.map((html, i) => (
              <StoryPage key={i} html={html} pageNum={i+1} total={totalPages} mirrorX={true} />
            ))}
          </HTMLFlipBook>
        </div>

        {/* شريط الأزرار السفلي: رجوع (يميناً) — استمع (وسطاً) — التالي/انتهيت (يساراً) */}
        {narr.audioElement}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: FS_BAR_H, zIndex: 30,
          boxSizing: 'border-box', padding: '0 12px env(safe-area-inset-bottom, 0px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          background: '#fffdf5', borderTop: '1.5px solid #f0e6cf', direction: 'rtl',
        }}>
          <NavBtn kind="prev" onClick={() => safeFlip('prev')} disabled={current === 0}
            style={{ flex: '1 1 0', maxWidth: 150, minWidth: 0, padding: '0 10px' }}>
            ▶ رجوع
          </NavBtn>

          <div style={{ flex: '0 0 76px', display: 'flex', justifyContent: 'center' }}>
            {narr.stateOf(current).hasAudio && listenBtn(current, 'round')}
          </div>

          {!isLastPage ? (
            <NavBtn kind="next" onClick={() => safeFlip('next')}
              style={{ flex: '1 1 0', maxWidth: 150, minWidth: 0, padding: '0 10px' }}>
              التالي ◀
            </NavBtn>
          ) : isTeacher ? (
            <NavBtn kind="next" disabled style={{ flex: '1 1 0', maxWidth: 150, minWidth: 0, padding: '0 10px' }}>
              التالي ◀
            </NavBtn>
          ) : read ? (
            <NavBtn kind="done" href="/library" style={{ flex: '1 1 0', maxWidth: 150, minWidth: 0, padding: '0 10px', fontSize: '.95rem' }}>
              ✅ أنهيت
            </NavBtn>
          ) : (
            <NavBtn kind="next" onClick={onComplete} disabled={loading}
              style={{ flex: '1 1 0', maxWidth: 160, minWidth: 0, padding: '0 10px', fontSize: '.95rem' }}>
              {loading ? '⏳...' : `🎉 انتهيت! +${points}`}
            </NavBtn>
          )}
        </div>
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 0, '--sfb-accent': accent }}>
        <style>{NAV_CSS}</style>

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
                  key={i} html={html} pageNum={i+1} total={totalPages}
                  isRight={i % 2 === 0}
                  mirrorX={true}
                />
              ))}
            </HTMLFlipBook>
          </div>
        )}

        {/* زر استماع تحت كل صفحة — الأول يميناً تحت الصفحة اليمنى (اتجاه العربية) */}
        {narr.audioElement}
        {narr.hasAudio && dims && (
          <div style={{ display: 'flex', width: bookW, maxWidth: 'calc(100vw - 48px)', marginTop: 26, direction: 'rtl', gap: 12 }}>
            {visiblePages.concat(visiblePages.length < 2 ? [null] : []).map((p, k) => (
              <div key={p ?? `empty-${k}`} style={{ flex: 1, display: 'flex', justifyContent: 'center', minHeight: 64 }}>
                {p !== null && listenBtn(p)}
              </div>
            ))}
          </div>
        )}

        {/* أزرار التنقل */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: bookW, maxWidth: 'calc(100vw - 48px)',
          marginTop: 20, direction: 'rtl',
        }}>
          <NavBtn kind="prev" onClick={() => safeFlip('prev')} disabled={current === 0}>
            ▶ رجوع
          </NavBtn>

          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#94a3b8', fontSize: '.85rem', fontWeight: 700, direction: 'ltr' }}>
              {totalPages}{' / '}
              {current + 1}{current + 1 < totalPages ? `‒${Math.min(current + 2, totalPages)}` : ''}
            </span>
            {narr.hasAudio && <AutoFlipToggle on={narr.autoFlip} onToggle={narr.toggleAuto} />}
          </span>

          {!isLastPage ? (
            <NavBtn kind="next" onClick={() => safeFlip('next')}>التالي ◀</NavBtn>
          ) : isTeacher ? (
            <NavBtn kind="next" disabled>التالي ◀</NavBtn>
          ) : read ? (
            <NavBtn kind="done" href="/library">✅ أنهيت القصة</NavBtn>
          ) : (
            <NavBtn kind="next" onClick={onComplete} disabled={loading}>
              {loading ? '⏳...' : `🎉 انتهيت! +${points} نقطة`}
            </NavBtn>
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════
     ③ الوضع الافتراضي — صفحة واحدة (موبايل غير fullscreen)
  ════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', '--sfb-accent': accent }}>
      <style>{NAV_CSS}</style>
      <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
        {pages.map((_, i) => (
          <div key={i} style={{
            width: i === current ? 20 : 9, height: 9, borderRadius: 99,
            background: i < current ? `${accent}66` : i === current ? accent : '#e2e8f0',
            transition: 'all .3s',
          }} />
        ))}
      </div>

      {narr.audioElement}

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
              <StoryPage key={i} html={html} pageNum={i+1} total={totalPages} />
            ))}
          </HTMLFlipBook>
        </div>
      )}

      {narr.stateOf(current).hasAudio && dims && (
        <div style={{ marginTop: 22 }}>{listenBtn(current)}</div>
      )}

      {dims && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: dims.w, marginTop: 16, direction: 'rtl',
        }}>
          <NavBtn kind="prev" onClick={() => safeFlip('prev')} disabled={current === 0}>▶ رجوع</NavBtn>
          <span style={{ color: '#94a3b8', fontSize: '.8rem', fontWeight: 700, direction: 'ltr' }}>{totalPages} / {current+1}</span>
          {!isLastPage ? (
            <NavBtn kind="next" onClick={() => safeFlip('next')}>التالي ◀</NavBtn>
          ) : isTeacher ? (
            <NavBtn kind="next" disabled>التالي ◀</NavBtn>
          ) : read ? (
            <NavBtn kind="done" href="/library">✅ أنهيت</NavBtn>
          ) : (
            <NavBtn kind="next" onClick={onComplete} disabled={loading}>{loading ? '⏳...' : `🎉 انتهيت! +${points}`}</NavBtn>
          )}
        </div>
      )}
    </div>
  );
}
