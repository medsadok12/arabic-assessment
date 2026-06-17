'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';

const RESOURCES = [
  {
    key: 'huroof',
    icon: '🔤', title: 'الحروف الهجائية',
    desc: 'تعلّم الحروف بأشكالها مع أصوات وأمثلة مشوّقة!',
    tag: 'مستوى 1', link: '/library/huroof', ready: true,
    accent: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', iconBg: '#DBEAFE',
    btnBg: 'linear-gradient(135deg,#3B82F6,#2563EB)',
  },
  {
    key: 'vowel-balloon',
    icon: '🔊', title: 'الحركات والتشكيل',
    desc: 'اكتشف الفتحة والكسرة والضمة مع أمثلة صوتية!',
    tag: 'مستوى 1', link: '/library/games/vowel-balloon', ready: true,
    accent: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', iconBg: '#EDE9FE',
    btnBg: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
  },
  {
    key: 'reading',
    icon: '📖', title: 'القراءة المقطعية',
    desc: 'قطّع الكلمات وتعلّم القراءة خطوة بخطوة!',
    tag: 'مستوى 1', link: '#', ready: false,
    accent: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', iconBg: '#D1FAE5',
  },
  {
    key: 'writing',
    icon: '✍️', title: 'الكتابة الصحيحة',
    desc: 'تدرّب على الكتابة الصحيحة وصحّح أخطاءك!',
    tag: 'مستوى 2', link: '#', ready: false,
    accent: '#F97316', bg: '#FFF7ED', border: '#FED7AA', iconBg: '#FFEDD5',
  },
  {
    key: 'listening',
    icon: '👂', title: 'الاستماع والفهم',
    desc: 'استمع وافهم — نصوص صوتية تنمّي مهاراتك!',
    tag: 'مستوى 2', link: '#', ready: false,
    accent: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', iconBg: '#FEF3C7',
  },
  {
    key: 'speaking',
    icon: '💬', title: 'التعبير الشفهي',
    desc: 'تحدّث بثقة — حوارات تنمّي لغتك العربية!',
    tag: 'مستوى 3', link: '#', ready: false,
    accent: '#EC4899', bg: '#FDF2F8', border: '#FBCFE8', iconBg: '#FCE7F3',
  },
  {
    key: 'literature',
    icon: '📝', title: 'النصوص الأدبية',
    desc: 'قصص رائعة تناسب عمرك وتشعل خيالك!',
    tag: 'مستوى 3', link: '#', ready: false,
    accent: '#14B8A6', bg: '#F0FDFA', border: '#99F6E4', iconBg: '#CCFBF1',
  },
  {
    key: 'letter-catcher',
    icon: '🎮', title: 'صيّاد الحروف',
    desc: 'أوجد الحرف الناقص — هل أنت صيّاد ماهر؟',
    tag: 'تعزيزي', link: '/library/games/letter-catcher', ready: true,
    accent: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE', iconBg: '#E0E7FF',
    btnBg: 'linear-gradient(135deg,#6366F1,#4F46E5)',
  },
  {
    key: 'word-scramble',
    icon: '🔀', title: 'رتّب الكلمة',
    desc: 'رتّب الحروف المبعثرة لتكوّن كلمة صحيحة!',
    tag: 'تعزيزي', link: '/library/games/word-scramble', ready: true,
    accent: '#EF4444', bg: '#FEF2F2', border: '#FECACA', iconBg: '#FEE2E2',
    btnBg: 'linear-gradient(135deg,#EF4444,#DC2626)',
  },
  {
    key: 'word-image-match',
    icon: '🖼️', title: 'صِل الكلمة بصورتها',
    desc: 'وصّل كل كلمة بصورتها — لعبة بصرية رائعة!',
    tag: 'تعزيزي', link: '/library/games/word-image-match', ready: true,
    accent: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC', iconBg: '#CFFAFE',
    btnBg: 'linear-gradient(135deg,#06B6D4,#0891B2)',
  },
  {
    key: 'word-smash',
    icon: '🔨', title: 'مطرقة التفكيك',
    desc: 'فكّك الكلمة إلى مقاطعها — اضرب الإجابة الصحيحة!',
    tag: 'تعزيزي', link: '/library/games/word-smash', ready: true,
    accent: '#84CC16', bg: '#F7FEE7', border: '#BEF264', iconBg: '#ECFCCB',
    btnBg: 'linear-gradient(135deg,#84CC16,#65A30D)',
  },
];

const TAG_COLORS = {
  'مستوى 1': { bg: '#EFF6FF', color: '#1D4ED8' },
  'مستوى 2': { bg: '#FFF7ED', color: '#C2410C' },
  'مستوى 3': { bg: '#FDF2F8', color: '#BE185D' },
  'تعزيزي':  { bg: '#ECFDF5', color: '#065F46' },
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function LibraryGrid({ initialMeta, isTeacher }) {
  const [cardMeta, setCardMeta] = useState(initialMeta || {});
  const [editing,   setEditing]   = useState(null);
  const [editIcon,  setEditIcon]  = useState('');
  const [editImg,   setEditImg]   = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc,  setEditDesc]  = useState('');
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);
  const fileRef = useRef();

  const openEdit = (r) => {
    const meta = cardMeta[r.key] || {};
    setEditing(r.key);
    setEditIcon(meta.icon || r.icon || '');
    setEditImg(meta.image_url || null);
    setEditTitle(meta.title || r.title);
    setEditDesc(meta.description || r.desc);
    setMsg(null);
  };

  const closeEdit = () => { setEditing(null); setMsg(null); };

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/library/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_key: editing,
          icon:        editImg ? null : (editIcon || null),
          image_url:   editImg || null,
          title:       editTitle || null,
          description: editDesc  || null,
        }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setCardMeta(prev => ({ ...prev, [editing]: json.card }));
      setMsg({ ok: true, text: '✅ تم الحفظ بنجاح' });
      setTimeout(closeEdit, 800);
    } catch {
      setMsg({ ok: false, text: '❌ فشل الحفظ' });
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await fetch(`/api/library/cards?card_key=${encodeURIComponent(editing)}`, { method: 'DELETE' });
      setCardMeta(prev => { const n = { ...prev }; delete n[editing]; return n; });
      closeEdit();
    } catch {
      setMsg({ ok: false, text: '❌ فشل' });
      setSaving(false);
    }
  };

  const editingResource = RESOURCES.find(r => r.key === editing);

  return (
    <>
      <style>{`
        .lib-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
        }
        @media (max-width: 600px) {
          .lib-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
        }
        @media (max-width: 380px) {
          .lib-grid { grid-template-columns: 1fr; }
        }
        .lib-new-card {
          border-radius: 18px; padding: 22px 18px 18px;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 10px; border: 2px solid;
          transition: transform .2s, box-shadow .2s;
          text-decoration: none; position: relative; overflow: hidden;
        }
        .lib-new-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,.13); }
        .lib-new-card.ready:hover .lib-start-btn { transform: scale(1.06); }
        .lib-icon-wrap {
          width: 72px; height: 72px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 2.6rem; flex-shrink: 0; margin-bottom: 2px;
          overflow: hidden;
        }
        @media (max-width: 600px) {
          .lib-icon-wrap { width: 58px; height: 58px; font-size: 2rem; }
          .lib-new-card  { padding: 16px 12px 14px; }
        }
        .lib-card-title-new { font-size: 1.05rem; font-weight: 800; color: #1e293b; line-height: 1.3; margin: 0; }
        @media (max-width: 600px) { .lib-card-title-new { font-size: .92rem; } }
        .lib-card-desc-new { font-size: .82rem; color: #64748b; line-height: 1.5; margin: 0; flex: 1; }
        .lib-start-btn {
          display: inline-block; border: none; border-radius: 50px;
          padding: 8px 22px; color: #fff; font-size: .88rem; font-weight: 700;
          cursor: pointer; font-family: 'Cairo','Tajawal',sans-serif;
          transition: transform .18s, box-shadow .18s;
          box-shadow: 0 3px 10px rgba(0,0,0,.18); text-decoration: none;
        }
        .lib-start-btn:hover { transform: scale(1.07); box-shadow: 0 6px 18px rgba(0,0,0,.22); }
        .lib-coming-badge {
          display: inline-block; background: #f1f5f9; color: #94a3b8;
          border-radius: 50px; padding: 6px 18px; font-size: .82rem; font-weight: 700;
          border: 1.5px dashed #cbd5e1;
        }
        .lib-tag-new {
          display: inline-block; border-radius: 20px; padding: 3px 11px;
          font-size: .72rem; font-weight: 700;
          position: absolute; top: 12px; right: 12px;
        }
        .lib-edit-btn {
          position: absolute; top: 10px; left: 10px;
          background: rgba(255,255,255,.92); border: none; border-radius: 8px;
          width: 30px; height: 30px; cursor: pointer; font-size: .85rem;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,.15); opacity: 0;
          transition: opacity .18s;
          z-index: 2;
        }
        .lib-new-card:hover .lib-edit-btn { opacity: 1; }
        .lib-edit-btn:hover { background: #fff; box-shadow: 0 3px 12px rgba(0,0,0,.2); }
      `}</style>

      <div className="lib-grid">
        {RESOURCES.map(r => {
          const meta         = cardMeta[r.key] || {};
          const displayTitle = meta.title       || r.title;
          const displayDesc  = meta.description || r.desc;
          const displayImg   = meta.image_url   || null;
          const displayIcon  = displayImg ? null : (meta.icon || r.icon);
          const tagStyle     = TAG_COLORS[r.tag] ?? { bg: '#f1f5f9', color: '#475569' };

          const cardContent = (
            <>
              {/* teacher edit button */}
              {isTeacher && (
                <button
                  className="lib-edit-btn"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); openEdit(r); }}
                  title="تعديل البطاقة"
                >✏️</button>
              )}

              {/* tag */}
              <span className="lib-tag-new" style={{ background: tagStyle.bg, color: tagStyle.color }}>
                {r.tag}
              </span>

              {/* icon / image */}
              <div className="lib-icon-wrap" style={{ background: r.iconBg }}>
                {displayImg
                  ? <img src={displayImg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : displayIcon
                }
              </div>

              {/* title */}
              <p className="lib-card-title-new">{displayTitle}</p>

              {/* desc */}
              <p className="lib-card-desc-new">{displayDesc}</p>

              {/* CTA */}
              {r.ready
                ? <span className="lib-start-btn" style={{ background: r.btnBg }}>ابدأ الآن ←</span>
                : <span className="lib-coming-badge">قريباً…</span>
              }
            </>
          );

          return r.ready ? (
            <Link key={r.key} href={r.link} className="lib-new-card ready"
              style={{ background: r.bg, borderColor: r.border }}>
              {cardContent}
            </Link>
          ) : (
            <div key={r.key} className="lib-new-card"
              style={{ background: r.bg, borderColor: r.border, opacity: .82, cursor: 'default' }}>
              {cardContent}
            </div>
          );
        })}
      </div>

      {/* ── Edit Modal ── */}
      {isTeacher && editing && editingResource && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:20 }}
          onClick={closeEdit}
        >
          <div
            style={{ background:'#fff', borderRadius:20, padding:'24px 20px', width:'100%', maxWidth:420, boxShadow:'0 16px 48px rgba(0,0,0,.3)', maxHeight:'90vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* modal header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <h3 style={{ margin:0, color:'#1f2937', fontSize:'1.05rem', fontWeight:800 }}>✏️ تعديل البطاقة</h3>
              <button onClick={closeEdit} style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:'1rem' }}>✕</button>
            </div>

            {/* image/icon preview */}
            <div
              onClick={() => fileRef.current?.click()}
              title="انقر لتغيير الصورة"
              style={{
                width:90, height:90, borderRadius:18, margin:'0 auto 16px',
                background: editingResource.iconBg, display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', overflow:'hidden', border:'2px dashed #e5e7eb',
                fontSize:'2.8rem', boxShadow:'0 4px 14px rgba(0,0,0,.1)',
              }}
            >
              {editImg
                ? <img src={editImg} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : editIcon
              }
            </div>
            <input type="file" accept="image/*" hidden ref={fileRef}
              onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                const b64 = await fileToBase64(f);
                setEditImg(b64); setEditIcon('');
              }}
            />

            {/* action buttons row */}
            <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:18, flexWrap:'wrap' }}>
              <button onClick={() => fileRef.current?.click()}
                style={{ background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:10, padding:'7px 14px', cursor:'pointer', fontSize:'.82rem', fontWeight:700, color:'#15803d' }}
              >🖼️ تغيير الصورة</button>
              {editImg && (
                <button onClick={() => { setEditImg(null); setEditIcon(editingResource.icon); }}
                  style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:10, padding:'7px 14px', cursor:'pointer', fontSize:'.82rem', fontWeight:700, color:'#b91c1c' }}
                >✕ مسح الصورة</button>
              )}
            </div>

            {/* emoji input */}
            <label style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
              <span style={{ fontWeight:700, color:'#374151', fontSize:'.85rem' }}>الأيقونة (رمز)</span>
              <div style={{ display:'flex', gap:8 }}>
                <input
                  value={editImg ? '' : editIcon}
                  onChange={e => { setEditIcon(e.target.value); setEditImg(null); }}
                  disabled={!!editImg}
                  placeholder="مثال: 🎯"
                  maxLength={2}
                  style={{ width:56, textAlign:'center', fontSize:'1.5rem', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'6px', fontFamily:'inherit', background: editImg ? '#f3f4f6' : '#fff' }}
                />
                <input
                  value={editImg ? '' : editIcon}
                  onChange={e => { setEditIcon(e.target.value); setEditImg(null); }}
                  disabled={!!editImg}
                  placeholder="أو اكتب أي نص"
                  style={{ flex:1, border:'1.5px solid #e5e7eb', borderRadius:10, padding:'8px 12px', fontFamily:'inherit', fontSize:'.9rem', direction:'rtl', background: editImg ? '#f3f4f6' : '#fff' }}
                />
              </div>
              {editImg && <span style={{ fontSize:'.75rem', color:'#9ca3af' }}>الأيقونة معطّلة — الصورة تحل محلها</span>}
            </label>

            {/* title */}
            <label style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
              <span style={{ fontWeight:700, color:'#374151', fontSize:'.85rem' }}>عنوان النشاط</span>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ border:'1.5px solid #e5e7eb', borderRadius:10, padding:'8px 12px', fontFamily:'inherit', fontSize:'.95rem', direction:'rtl' }}
              />
            </label>

            {/* description */}
            <label style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:18 }}>
              <span style={{ fontWeight:700, color:'#374151', fontSize:'.85rem' }}>الوصف</span>
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                rows={3}
                style={{ border:'1.5px solid #e5e7eb', borderRadius:10, padding:'8px 12px', fontFamily:'inherit', fontSize:'.88rem', direction:'rtl', resize:'vertical' }}
              />
            </label>

            {msg && (
              <div style={{ marginBottom:12, padding:'8px 12px', borderRadius:8, fontSize:'.85rem', fontWeight:700, background: msg.ok ? '#d4edda' : '#f8d7da', color: msg.ok ? '#155724' : '#721c24' }}>
                {msg.text}
              </div>
            )}

            {/* footer buttons */}
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex:1, background:'linear-gradient(135deg,#5b4fc4,#7c3aed)', border:'none', borderRadius:12, padding:'11px', color:'#fff', fontSize:'.92rem', fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}
              >{saving ? 'جارٍ الحفظ…' : '💾 حفظ التغييرات'}</button>

              {(cardMeta[editing]?.title || cardMeta[editing]?.image_url || cardMeta[editing]?.icon) && (
                <button onClick={handleReset} disabled={saving}
                  style={{ background:'none', border:'1.5px solid #e5e7eb', borderRadius:12, padding:'10px 16px', color:'#9ca3af', fontSize:'.85rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
                >↩️ إعادة الافتراضي</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
