'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StoriesLibraryPage() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stories')
      .then(r => r.json())
      .then(d => { setStories(d.stories ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#f0f9ff 0%,#e8f4fd 50%,#fef9ee 100%)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#185FA5', margin: '0 0 10px' }}>
            📚 مكتبة القصص
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.05rem', margin: 0 }}>
            قصص ممتعة لتعلّم اللغة العربية
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: '1.1rem' }}>
            جارٍ التحميل…
          </div>
        ) : stories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📖</div>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>لا توجد قصص متاحة بعد</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
            {stories.map(story => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StoryCard({ story }) {
  const cover = story.story_pages?.find(p => p.image_url)?.image_url;
  const pageCount = story.story_pages?.length ?? 0;

  const levelColor = {
    'تمهيدي': '#10b981',
    'مستوى 1': '#3b82f6',
    'مستوى 2': '#8b5cf6',
    'مستوى 3': '#f59e0b',
  }[story.level] ?? '#64748b';

  return (
    <Link href={`/library/stories/${story.slug}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        transition: 'transform .22s, box-shadow .22s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(24,95,165,0.18)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'; }}
      >
        <div style={{
          height: 180, background: cover ? `url(${cover}) center/cover` : 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {!cover && <span style={{ fontSize: '3.5rem' }}>📖</span>}
        </div>
        <div style={{ padding: '14px 16px 16px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
            {story.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: '.75rem', fontWeight: 600, color: '#fff',
              background: levelColor, borderRadius: 20, padding: '2px 10px',
            }}>
              {story.level}
            </span>
            <span style={{ fontSize: '.8rem', color: '#94a3b8' }}>
              {pageCount} {pageCount === 1 ? 'صفحة' : 'صفحات'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
