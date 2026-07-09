'use client';
import { useState, useEffect } from 'react';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function StoriesTab({ lang }) {
  const [stories,  setStories]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);

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

  if (stories === null) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'#94a3b8', fontWeight:700, fontFamily:'Cairo,Tajawal,sans-serif' }}>⏳ جارٍ التحميل...</div>
  );

  return (
    <div style={{ direction:'rtl', fontFamily:'Cairo,Tajawal,sans-serif' }}>
      <style>{`
        @media (max-width:640px) {
          /* بطاقة القصة تصبح عمودية على الجوال: المعلومات فوق، الأزرار في صف كامل تحتها */
          .bst-row     { flex-direction:column; align-items:stretch !important; gap:0 !important; }
          .bst-main    { width:100%; }
          .bst-actions { width:100%; margin-top:14px; flex-wrap:wrap; }
          .bst-act     { flex:1 1 calc(50% - 4px); max-width:calc(50% - 4px); box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center; }
        }
      `}</style>
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
          {stories.map(s => (
            <div key={s.id} className="bst-row" style={{
              display:'flex', alignItems:'center', gap:14,
              background:'#fff', borderRadius:16, padding:'14px 18px',
              border:'1.5px solid #f1f5f9', boxShadow:'0 2px 10px rgba(0,0,0,.05)',
            }}>
              <div className="bst-main" style={{ display:'flex', alignItems:'center', gap:14, flex:1, minWidth:0 }}>
                <div style={{ width:48, height:48, borderRadius:12, background: s.bg || '#ecfdf5', border:`2px solid ${s.border_color || '#6ee7b7'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.7rem', flexShrink:0 }}>
                  {s.icon || '📖'}
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
                  </div>
                </div>
              </div>
              <div className="bst-actions" style={{ display:'flex', gap:8, flexShrink:0 }}>
                {s.status === 'published' && (
                  <a className="bst-act" href={`/library/stories/${s.slug}`} target="_blank" style={{ background:'#ecfdf5', color:'#065f46', border:'1.5px solid #86efac', borderRadius:10, padding:'6px 13px', fontSize:'.75rem', fontWeight:700, textDecoration:'none' }}>
                    👁 عرض
                  </a>
                )}
                <button
                  className="bst-act"
                  onClick={() => handleToggle(s)}
                  disabled={toggling === s.id}
                  style={{ background: s.status==='published'?'#fef3c7':'#d1fae5', color: s.status==='published'?'#78350f':'#065f46', border:'none', borderRadius:10, padding:'6px 13px', fontSize:'.75rem', fontWeight:700, cursor:'pointer' }}
                >
                  {toggling === s.id ? '...' : s.status==='published' ? '⬇️ إلغاء النشر' : '🚀 نشر'}
                </button>
                <button
                  className="bst-act"
                  onClick={() => handleDelete(s.id)}
                  disabled={deleting === s.id}
                  style={{ background:'#fee2e2', color:'#b91c1c', border:'none', borderRadius:10, padding:'6px 13px', fontSize:'.75rem', fontWeight:700, cursor:'pointer' }}
                >
                  {deleting === s.id ? '...' : '🗑'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
