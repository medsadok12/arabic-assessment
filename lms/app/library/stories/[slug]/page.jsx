'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StoryReaderPage() {
  const { slug }  = useParams();
  const router    = useRouter();
  const [story,   setStory]   = useState(null);
  const [pages,   setPages]   = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/stories/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (!d.story) { setNotFound(true); setLoading(false); return; }
        setStory(d.story);
        const sorted = [...(d.story.story_pages ?? [])].sort((a, b) => a.page_number - b.page_number);
        setPages(sorted);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(pages.length - 1, c + 1)), [pages.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') prev();
      if (e.key === 'ArrowLeft')  next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef9ee' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>جارٍ التحميل…</div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fef9ee', gap: 16 }}>
      <div style={{ fontSize: '3rem' }}>📖</div>
      <p style={{ color: '#64748b', fontSize: '1.2rem' }}>القصة غير موجودة</p>
      <Link href="/library/stories" style={{ color: '#185FA5', textDecoration: 'none', fontWeight: 600 }}>← العودة للمكتبة</Link>
    </div>
  );

  const page = pages[current];
  const total = pages.length;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fef9ee 0%,#fff8e1 50%,#f0f9ff 100%)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#185FA5', color: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/library/stories" style={{ color: 'rgba(255,255,255,.8)', textDecoration: 'none', fontSize: '.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← المكتبة
        </Link>
        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{story.title}</h1>
        <span style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.7)' }}>
          {current + 1} / {total}
        </span>
      </div>

      {/* Book page */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{
          width: '100%', maxWidth: 520,
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 8px 48px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Image area */}
          <div style={{
            height: 320, background: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            {page?.image_url ? (
              <img
                src={page.image_url}
                alt={`صفحة ${page.page_number}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>🎨</div>
                <div style={{ fontSize: '.9rem' }}>الصورة قيد التوليد…</div>
              </div>
            )}
          </div>

          {/* Text area */}
          <div style={{ padding: '28px 32px 24px', textAlign: 'center' }}>
            <p style={{
              margin: 0,
              fontSize: '1.8rem',
              fontWeight: 700,
              color: '#1e293b',
              lineHeight: 1.9,
              fontFamily: 'Cairo, Tajawal, sans-serif',
              letterSpacing: '.02em',
            }}>
              {page?.text}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 24 : 10, height: 10,
                borderRadius: 5, border: 'none', cursor: 'pointer',
                background: i === current ? '#185FA5' : '#cbd5e1',
                transition: 'width .25s, background .25s',
                padding: 0,
              }}
            />
          ))}
        </div>

        {/* Arrow buttons */}
        <div style={{ display: 'flex', gap: 16 }}>
          <NavBtn onClick={next} disabled={current >= total - 1} label="التالي ←" primary />
          <NavBtn onClick={prev} disabled={current <= 0} label="→ السابق" />
        </div>
      </div>
    </div>
  );
}

function NavBtn({ onClick, disabled, label, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '12px 28px',
        borderRadius: 12,
        border: primary ? 'none' : '2px solid #185FA5',
        background: primary ? (disabled ? '#e2e8f0' : '#185FA5') : 'transparent',
        color: primary ? (disabled ? '#94a3b8' : '#fff') : (disabled ? '#94a3b8' : '#185FA5'),
        fontWeight: 700, fontSize: '1rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .2s',
        fontFamily: 'Cairo, Tajawal, sans-serif',
      }}
    >
      {label}
    </button>
  );
}
