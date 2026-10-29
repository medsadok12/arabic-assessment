'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import StoryAudioPanel from '../StoryAudioPanel';
import StoryShareLink from '../StoryShareLink';
import { splitStoryPages, normalizePageAudio } from '../../../lib/story-audio';
import { keepRowInPlace, returnRow, revealBelow, flashRow } from '../../../lib/edit-scroll';

/* المحرر الكامل نفسه (صفحة /teacher/stories) يُفتح تحت بطاقة القصة — يُحمَّل عند أول ضغط على ✏️ فقط.
   طلب الأستاذ محمد (2026-10-29): زر تعديل بجانب كل قصة بدل الدخول كل مرة من «فتح محرر القصص الكامل» */
const StoryManager = dynamic(() => import('../../../app/teacher/stories/StoryManager'), {
  ssr: false,
  loading: () => <div style={{ textAlign:'center', padding:'28px 0', color:'#64748b', fontWeight:700 }}>⏳ جارٍ فتح المحرر...</div>,
});

/* عدد الصفحات وعدد الصفحات التي لها صوت */
function audioStats(s) {
  const total = splitStoryPages(s.content).length;
  return { total, voiced: normalizePageAudio(s.page_audio, total).filter(Boolean).length };
}

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function StoriesTab({ lang }) {
  const [stories,  setStories]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [audioFor, setAudioFor] = useState(null); // id القصة المفتوحة لوحة صوتها
  const [shareFor, setShareFor] = useState(null); // id القصة المفتوحة لوحة رابط مشاركتها
  const [editFor,  setEditFor]  = useState(null); // id القصة المفتوح محررها تحت بطاقتها
  const editRef    = useRef(null);
  const editSaved  = useRef(false); // حُفظ شيء أثناء التعديل — وميض أخضر على البطاقة عند الإغلاق

  useEffect(() => {
    fetch('/api/stories')
      .then(r => r.json())
      .then(j => setStories(j.stories || []))
      .catch(() => setStories([]));
  }, []);

  const handleToggle = async (s) => {
    setToggling(s.id);
    const newStatus = s.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/stories/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const j = await res.json();
      if (j.story) setStories(p => p.map(x => x.id === s.id ? j.story : x));
    } catch {}
    setToggling(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف القصة نهائياً؟')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/stories/${id}`, { method: 'DELETE' });
      if (!res.ok) { alert('فشل الحذف — يرجى المحاولة مجدداً'); setDeleting(null); return; }
      setStories(p => p.filter(s => s.id !== id));
    } catch { alert('فشل الحذف — تحقق من الاتصال'); }
    setDeleting(null);
  };

  // التعديل في مكانه: البطاقة لا تتحرك على الشاشة عند فتح المحرر تحتها، وتعود إلى موضعها عند الإغلاق
  const openEdit = (s) => {
    const restore = keepRowInPlace(s.id);
    editSaved.current = false;
    setEditFor(s.id);
    setAudioFor(a => (a === s.id ? null : a)); // أصوات الصفحات داخل المحرر نفسه
    restore(() => revealBelow(editRef.current));
  };
  const closeEdit = () => {
    const id = editFor;
    const restore = returnRow(id);
    setEditFor(cur => (cur === id ? null : cur)); // حفظ متأخر لقصة سابقة لا يُغلق محرر قصة فُتحت بعدها
    restore(() => { if (editSaved.current) flashRow(id); });
  };
  const storyChanged = (updated) => {
    editSaved.current = true;
    setStories(p => p.map(x => x.id === updated.id ? updated : x));
  };

  if (stories === null) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'#94a3b8', fontWeight:700, fontFamily:'Cairo,Tajawal,sans-serif' }}>⏳ جارٍ التحميل...</div>
  );

  return (
    <div style={{ direction:'rtl', fontFamily:'Cairo,Tajawal,sans-serif' }}>
      {/* تراص البطاقات على الجوال يأتي من كلاسات mobile-stack العامة في globals.css */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontWeight:800, color:'var(--primary)', margin:'0 0 4px' }}>📚 إدارة القصص</h2>
          <p style={{ color:'var(--muted)', fontSize:'.85rem', margin:0 }}>أضف وعدّل وانشر القصص للطلاب</p>
        </div>
        <a href="/teacher/stories" style={{
          display:'inline-flex', alignItems:'center', gap:8,
          background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff',
          border:'none', borderRadius:12, padding:'10px 20px',
          fontSize:'.88rem', fontWeight:800, textDecoration:'none',
          boxShadow:'0 4px 14px rgba(16,185,129,.3)',
        }}>
          ✏️ فتح محرر القصص الكامل
        </a>
      </div>

      {stories.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8', fontWeight:700 }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>📖</div>
          لا توجد قصص بعد —{' '}
          <a href="/teacher/stories" style={{ color:'#10b981', textDecoration:'none', fontWeight:900 }}>أضف أول قصة</a>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {stories.map(s => {
            const au = audioStats(s);
            return (
              <div key={s.id} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div className="mobile-stack" data-edit-row={s.id} style={{
                  display:'flex', alignItems:'center', gap:14,
                  background:'#fff', borderRadius:16, padding:'14px 18px',
                  border:'1.5px solid #f1f5f9', boxShadow:'0 2px 10px rgba(0,0,0,.05)',
                }}>
                  <div className="mobile-stack-main" style={{ display:'flex', alignItems:'center', gap:14, flex:1, minWidth:220 }}>
                    <div style={{ width:48, height:48, borderRadius:12, background: s.bg || '#ecfdf5', border:`2px solid ${s.border_color || '#6ee7b7'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.7rem', flexShrink:0, overflow:'hidden' }}>
                      {s.cover_image_url
                        ? <img src={s.cover_image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : (s.icon || '📖')}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, color:'#1e293b', fontSize:'.92rem', marginBottom:5, wordBreak:'break-word' }}>{s.title}</div>
                      <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                        {s.status === 'published'
                          ? <span style={{ background:'#d1fae5', color:'#065f46', borderRadius:20, padding:'2px 9px', fontSize:'.65rem', fontWeight:900, border:'1.5px solid #86efac' }}>✅ منشورة</span>
                          : <span style={{ background:'#fef3c7', color:'#78350f', borderRadius:20, padding:'2px 9px', fontSize:'.65rem', fontWeight:900, border:'1.5px solid #fde68a' }}>✏️ مسودة</span>
                        }
                        <span style={{ background:'#f8fafc', color:'#64748b', borderRadius:20, padding:'2px 9px', fontSize:'.65rem', fontWeight:700, border:'1px solid #e2e8f0' }}>مستوى {s.level || 1}</span>
                        <span style={{ background:'#f8fafc', color:'#64748b', borderRadius:20, padding:'2px 9px', fontSize:'.65rem', fontWeight:700, border:'1px solid #e2e8f0' }}>⭐ {s.points || 10} نقطة</span>
                        {s.featured_home && <span style={{ background:'#FDF6E3', color:'#1A2B4A', borderRadius:20, padding:'2px 9px', fontSize:'.65rem', fontWeight:900, border:'1.5px solid #E8B84B' }}>🏠 في الصفحة الرئيسية</span>}
                        {s.share_token && <span style={{ background:'#eef2f7', color:'#1A2B4A', borderRadius:20, padding:'2px 9px', fontSize:'.65rem', fontWeight:900, border:'1.5px solid #1A2B4A' }}>🔗 مشارَكة</span>}
                        {au.voiced > 0 && <span style={{ background:'#fdf6e3', color:'#1A2B4A', borderRadius:20, padding:'2px 9px', fontSize:'.65rem', fontWeight:900, border:'1.5px solid #E8B84B' }}>🔊 {au.voiced}/{au.total} صفحات بصوت</span>}
                      </div>
                    </div>
                  </div>
                  {/* الأزرار تلتف لسطرين إن ضاق العرض بدل أن تعصر عنوان القصة */}
                  <div className="mobile-stack-actions" style={{ display:'flex', gap:8, flex:'0 1 auto', flexWrap:'wrap', justifyContent:'flex-end' }}>
                    <button
                      className="mobile-stack-act"
                      onClick={() => (editFor === s.id ? closeEdit() : openEdit(s))}
                      aria-expanded={editFor === s.id}
                      style={{ background: editFor === s.id ? '#1A2B4A' : '#7C5CD9', color:'#fff', border:'none', borderRadius:10, padding:'6px 13px', fontSize:'.75rem', fontWeight:800, cursor:'pointer' }}
                    >
                      {editFor === s.id ? '✖ إغلاق التعديل' : '✏️ تعديل'}
                    </button>
                    {s.status === 'published' && (
                      <a className="mobile-stack-act" href={`/library/stories/${s.slug}`} target="_blank" style={{ background:'#ecfdf5', color:'#065f46', border:'1.5px solid #86efac', borderRadius:10, padding:'6px 13px', fontSize:'.75rem', fontWeight:700, textDecoration:'none' }}>
                        👁 عرض
                      </a>
                    )}
                    <button
                      className="mobile-stack-act"
                      onClick={() => setShareFor(shareFor === s.id ? null : s.id)}
                      aria-expanded={shareFor === s.id}
                      style={{ background: shareFor === s.id ? '#1A2B4A' : '#fff', color: shareFor === s.id ? '#fff' : '#1A2B4A', border:'1.5px solid #1A2B4A', borderRadius:10, padding:'6px 13px', fontSize:'.75rem', fontWeight:800, cursor:'pointer' }}
                    >
                      {shareFor === s.id ? '✖ إغلاق المشاركة' : '🔗 المشاركة والصفحة الرئيسية'}
                    </button>
                    <button
                      className="mobile-stack-act"
                      onClick={() => setAudioFor(audioFor === s.id ? null : s.id)}
                      aria-expanded={audioFor === s.id}
                      disabled={editFor === s.id}
                      title={editFor === s.id ? 'أصوات الصفحات داخل المحرر المفتوح الآن' : undefined}
                      style={{ background: audioFor === s.id ? '#1A2B4A' : '#E8B84B', color: audioFor === s.id ? '#fff' : '#1A2B4A', border:'none', borderRadius:10, padding:'6px 13px', fontSize:'.75rem', fontWeight:800, cursor: editFor === s.id ? 'default' : 'pointer', opacity: editFor === s.id ? .45 : 1 }}
                    >
                      {audioFor === s.id ? '✖ إغلاق الأصوات' : au.voiced > 0 ? '🔊 أصوات الصفحات' : '🎙️ أضف أصوات الصفحات'}
                    </button>
                    <button
                      className="mobile-stack-act"
                      onClick={() => handleToggle(s)}
                      disabled={toggling === s.id}
                      style={{ background: s.status==='published'?'#fef3c7':'#d1fae5', color: s.status==='published'?'#78350f':'#065f46', border:'none', borderRadius:10, padding:'6px 13px', fontSize:'.75rem', fontWeight:700, cursor:'pointer' }}
                    >
                      {toggling === s.id ? '...' : s.status==='published' ? '⬇️ إلغاء النشر' : '🚀 نشر'}
                    </button>
                    <button
                      className="mobile-stack-act"
                      onClick={() => handleDelete(s.id)}
                      disabled={deleting === s.id}
                      style={{ background:'#fee2e2', color:'#b91c1c', border:'none', borderRadius:10, padding:'6px 13px', fontSize:'.75rem', fontWeight:700, cursor:'pointer' }}
                    >
                      {deleting === s.id ? '...' : '🗑'}
                    </button>
                  </div>
                </div>
                {shareFor === s.id && (
                  <StoryShareLink
                    story={s}
                    onChanged={(token) => setStories(p => p.map(x => x.id === s.id
                      ? { ...x, share_token: token, featured_home: token ? x.featured_home : false } : x))}
                    onStoryChanged={(updated) => setStories(p => p.map(x =>
                      x.id === updated.id ? updated : (updated.featured_home ? { ...x, featured_home: false } : x)))}
                  />
                )}
                {editFor === s.id && (
                  <div ref={editRef} style={{ background:'#fff', border:'2px solid #7C5CD9', borderRadius:16, padding:'16px 18px', boxShadow:'0 6px 20px rgba(124,92,217,.12)' }}>
                    <StoryManager key={s.id} editStory={s} onClose={closeEdit} onStoryChange={storyChanged} />
                  </div>
                )}
                {audioFor === s.id && editFor !== s.id && (
                  <StoryAudioPanel
                    story={s}
                    onSaved={(updated) => setStories(p => p.map(x => x.id === updated.id ? updated : x))}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
