'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { createClient } from '../../../lib/supabase';

const TYPE_COLORS = {
  'اسم':  { bg: '#e8f0fb', text: '#185FA5', border: '#b8d0f5' },
  'فعل':  { bg: '#fef3dc', text: '#b56a00', border: '#f5d9a0' },
  'صفة':  { bg: '#e6f4ec', text: '#1a7c40', border: '#a8ddc0' },
  'ظرف':  { bg: '#f0e8fb', text: '#6b21a8', border: '#d1b8f5' },
  'حرف':  { bg: '#fde8e8', text: '#b91c1c', border: '#f5b8b8' },
  'ضمير': { bg: '#fff8e1', text: '#b45309', border: '#fde68a' },
};

export default function StudentLexiconPage() {
  const [user, setUser]     = useState(null);
  const [words, setWords]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType,  setFilterType]  = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [activeCard, setActiveCard]   = useState(null);
  const [mode, setMode]     = useState('cards');

  // Media cache: { [wordId]: { image, audio, loading } }
  const [mediaCache, setMediaCache] = useState({});

  useEffect(() => {
    // createClient() called here (client-side only) to avoid SSR Supabase init failure
    createClient().auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      const grade = u?.user_metadata?.grade;
      if (grade) setFilterGrade(String(grade));
    });
    loadWords();
  }, []);

  async function loadWords() {
    // Use admin-client API route to bypass any RLS on lexicon_words
    const res  = await fetch('/api/student/lexicon');
    const data = await res.json();
    setWords(data.words ?? []);
    setLoading(false);
  }

  async function toggleCard(id) {
    const word = words.find(w => w.id === id);
    if (!word) return;

    if (activeCard === id) { setActiveCard(null); return; }
    setActiveCard(id);

    // Always fetch media on first expand; API returns null for missing media
    if (!mediaCache[id]) {
      setMediaCache(p => ({ ...p, [id]: { loading: true } }));
      try {
        const res  = await fetch(`/api/student/lexicon/${id}`);
        const data = await res.json();
        setMediaCache(p => ({ ...p, [id]: { image: data.image, audio: data.audio, loading: false } }));
      } catch {
        setMediaCache(p => ({ ...p, [id]: { loading: false } }));
      }
    }
  }

  const topics = useMemo(() => [...new Set(words.map(w => w.topic).filter(Boolean))].sort(), [words]);

  const filtered = useMemo(() => words.filter(w =>
    (!search     || w.word.includes(search) || (w.sentence ?? '').includes(search)) &&
    (!filterType  || w.word_type === filterType) &&
    (!filterTopic || w.topic === filterTopic) &&
    (!filterGrade || (+filterGrade >= w.grade_from && +filterGrade <= w.grade_to))
  ), [words, search, filterType, filterTopic, filterGrade]);

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap" dir="rtl" style={{ background: '#f0f6ff' }}>
        <div className="container">

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <Link href="/dashboard" style={{ color: 'var(--primary)', fontSize: '.88rem', textDecoration: 'none' }}>
              ← لوحة التحكم
            </Link>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                  📖 بنك الكلمات اللغوية
                </h1>
                <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
                  تعلّم الكلمات العربية المشكولة بطريقة تفاعلية وممتعة
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setMode('cards')}
                  className={`btn btn-sm ${mode === 'cards' ? 'btn-primary' : 'btn-outline'}`}>
                  🃏 بطاقات
                </button>
                <button onClick={() => setMode('table')}
                  className={`btn btn-sm ${mode === 'table' ? 'btn-primary' : 'btn-outline'}`}>
                  📋 جدول
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
            <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 ابحث عن كلمة..." style={{ flex: '1 1 200px', maxWidth: 280 }} />
            <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 130 }}>
              <option value="">كل الأنواع</option>
              {Object.keys(TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {topics.length > 0 && (
              <select className="form-input" value={filterTopic} onChange={e => setFilterTopic(e.target.value)} style={{ width: 150 }}>
                <option value="">كل الموضوعات</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <select className="form-input" value={filterGrade} onChange={e => setFilterGrade(e.target.value)} style={{ width: 120 }}>
              <option value="">كل الصفوف</option>
              {[1,2,3,4,5,6,7].map(g => <option key={g} value={g}>الصف {g}</option>)}
            </select>
            <span style={{ alignSelf: 'center', color: 'var(--muted)', fontSize: '.85rem', whiteSpace: 'nowrap' }}>
              {filtered.length} كلمة
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)', width: 40, height: 40 }} />
            </div>
          ) : words.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>لا توجد كلمات في البنك بعد — يعمل المدير على إضافتها قريباً</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <p>لا توجد نتائج — جرّب البحث بكلمة أخرى</p>
            </div>

          ) : mode === 'cards' ? (
            /* ── Cards view ── */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
              {filtered.map(w => {
                const colors  = TYPE_COLORS[w.word_type] ?? TYPE_COLORS['اسم'];
                const isActive = activeCard === w.id;
                const media    = mediaCache[w.id];

                return (
                  <div key={w.id}
                    onClick={() => toggleCard(w.id)}
                    style={{
                      background: '#fff', borderRadius: 18,
                      border: `2.5px solid ${isActive ? colors.border : '#e8eef5'}`,
                      padding: '20px 16px 16px', textAlign: 'center', cursor: 'pointer',
                      boxShadow: isActive ? `0 8px 28px rgba(24,95,165,.16)` : '0 2px 8px rgba(0,0,0,.06)',
                      transform: isActive ? 'translateY(-4px) scale(1.02)' : 'none',
                      transition: 'all .22s cubic-bezier(.34,1.56,.64,1)',
                      position: 'relative',
                    }}>

                    {/* Type badge */}
                    <span style={{
                      position: 'absolute', top: 10, right: 10,
                      background: colors.bg, color: colors.text,
                      borderRadius: 20, padding: '2px 8px',
                      fontSize: '.64rem', fontWeight: 800, border: `1px solid ${colors.border}`,
                    }}>
                      {w.word_type}
                    </span>

                    {/* Media indicators (top-left) */}
                    {(w.has_image || w.has_audio) && (
                      <span style={{ position: 'absolute', top: 10, left: 10, fontSize: '.7rem', opacity: .55 }}>
                        {w.has_image && '🖼️'}{w.has_audio && '🔊'}
                      </span>
                    )}

                    {/* Word */}
                    <div style={{
                      fontSize: '2.2rem', fontWeight: 900, color: '#1a2d4a',
                      lineHeight: 1.3, marginTop: 18, marginBottom: 10,
                    }}>
                      {w.word}
                    </div>

                    <div style={{ width: 40, height: 2.5, background: colors.border, borderRadius: 2, margin: '0 auto 10px' }} />

                    {w.sentence && (
                      <div style={{ fontSize: '.76rem', color: '#64748b', lineHeight: 1.7 }}>{w.sentence}</div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      {w.topic && (
                        <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 12, padding: '2px 7px', fontSize: '.63rem', fontWeight: 700 }}>
                          {w.topic}
                        </span>
                      )}
                      <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 12, padding: '2px 7px', fontSize: '.63rem', fontWeight: 700 }}>
                        ص{w.grade_from}–ص{w.grade_to}
                      </span>
                    </div>

                    {/* Expanded details */}
                    {isActive && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1.5px dashed ${colors.border}`, textAlign: 'right' }}>

                        {/* Loading media */}
                        {media?.loading && (
                          <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: colors.text, borderColor: colors.border }} />
                          </div>
                        )}

                        {/* Image */}
                        {media?.image && (
                          <img
                            src={media.image.startsWith('data:') ? media.image : `data:image/jpeg;base64,${media.image}`}
                            alt={w.word}
                            style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 10,
                                     marginBottom: 8, border: `1px solid ${colors.border}`, background: colors.bg,
                                     display: 'block' }}
                            onClick={e => e.stopPropagation()} />
                        )}

                        {/* Audio */}
                        {media?.audio && (
                          <div style={{ marginBottom: 8 }} onClick={e => e.stopPropagation()}>
                            <audio controls src={media.audio} style={{ width: '100%', height: 36 }} />
                          </div>
                        )}

                        {/* Syllables / Root */}
                        {w.syllables && (
                          <div style={{ fontSize: '.76rem', color: '#475569', marginBottom: 4 }}>
                            🎵 المقاطع: <strong>{w.syllables}</strong>
                          </div>
                        )}
                        {w.root && (
                          <div style={{ fontSize: '.76rem', color: '#475569' }}>
                            🌱 الجذر: <strong style={{ letterSpacing: 4 }}>{w.root}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          ) : (
            /* ── Table view ── */
            <div className="table-scroll-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الكلمة</th>
                    <th>النوع</th>
                    <th>الموضوع</th>
                    <th>الصفوف</th>
                    <th>الجملة</th>
                    <th>الجذر</th>
                    <th>المقاطع</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(w => {
                    const colors = TYPE_COLORS[w.word_type] ?? TYPE_COLORS['اسم'];
                    return (
                      <tr key={w.id}>
                        <td style={{ fontWeight: 900, fontSize: '1.15rem' }}>{w.word}</td>
                        <td>
                          <span style={{ background: colors.bg, color: colors.text, padding: '2px 10px', borderRadius: 20, fontSize: '.78rem', fontWeight: 700 }}>
                            {w.word_type}
                          </span>
                        </td>
                        <td style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{w.topic}</td>
                        <td style={{ color: 'var(--muted)', fontSize: '.83rem' }}>{w.grade_from}–{w.grade_to}</td>
                        <td style={{ color: 'var(--muted)', fontSize: '.83rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.sentence}
                        </td>
                        <td style={{ fontWeight: 700, letterSpacing: 3 }}>{w.root}</td>
                        <td style={{ color: '#475569', fontSize: '.83rem' }}>{w.syllables}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Placeholder: phonetic exercises */}
          <div style={{
            marginTop: 48, background: '#fff', borderRadius: 16,
            padding: '28px 24px', border: '2px dashed #d0e4f7', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔊</div>
            <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>
              تمارين التفكيك والتركيب اللغوي
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
              قريباً — تمارين تفاعلية لتحليل الكلمات إلى مقاطع وجذور وتركيبها من جديد
            </p>
            <span style={{ display: 'inline-block', marginTop: 12, background: 'var(--primary-lt)', color: 'var(--primary)', padding: '6px 16px', borderRadius: 20, fontSize: '.8rem', fontWeight: 700 }}>
              قيد التطوير
            </span>
          </div>

        </div>
      </main>
    </>
  );
}
