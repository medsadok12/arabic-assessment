'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';

/* زوايا ومقاييس المروحة لـ 5 بطاقات */
const FAN_CFG = [
  { rot: -32, scale: 0.72, opacity: 0.6, z: 1 },
  { rot: -16, scale: 0.86, opacity: 0.82, z: 2 },
  { rot:   0, scale: 1,    opacity: 1,    z: 5 },
  { rot:  16, scale: 0.86, opacity: 0.82, z: 2 },
  { rot:  32, scale: 0.72, opacity: 0.6,  z: 1 },
];
const CAROUSEL_GROUPS = [
  { tag: 'مستوى 1', emoji: '⭐' },
  { tag: 'مستوى 2', emoji: '📗' },
  { tag: 'مستوى 3', emoji: '🏆' },
  { tag: 'تعزيزي',  emoji: '🎮' },
];

function FanCarousel({ items, renderCard }) {
  const [idx, setIdx] = useState(0);
  const total = items.length;
  const go = (n) => setIdx(i => ((i + n) + total) % total);

  /* نحدد البطاقات الظاهرة: أقصى 5 (‎−2 إلى +2 من المركز) */
  const offsets = total >= 5 ? [-2,-1,0,1,2]
                : total === 4 ? [-1,0,0,1]   // fallback
                : total === 3 ? [-1,0,1]
                : total === 2 ? [0,1]
                : [0];

  /* نختار إعدادات المروحة حسب عدد البطاقات */
  const cfg = total >= 5 ? FAN_CFG
    : total === 3 ? [FAN_CFG[1], FAN_CFG[2], FAN_CFG[3]]
    : total === 2 ? [FAN_CFG[2], FAN_CFG[3]]
    : [FAN_CFG[2]];

  return (
    <div className="fan-car">
      <button className={`fan-arr fan-arr-r${total <= 1 ? ' fan-hidden' : ''}`}
        onClick={() => go(-1)} aria-label="السابق">›</button>

      <div className="fan-stage">
        {offsets.map((off, si) => {
          const ci = ((idx + off) % total + total) % total;
          const c  = cfg[si] || FAN_CFG[2];
          return (
            <div key={`${ci}-${si}`} className={`fan-slot${off === 0 ? ' fan-active' : ''}`}
              style={{
                transform: `rotate(${c.rot}deg) scale(${c.scale})`,
                opacity:   c.opacity,
                zIndex:    c.z,
              }}
              onClick={() => off !== 0 && go(off)}
            >
              {renderCard(items[ci], ci)}
            </div>
          );
        })}
      </div>

      <button className={`fan-arr fan-arr-l${total <= 1 ? ' fan-hidden' : ''}`}
        onClick={() => go(1)} aria-label="التالي">‹</button>

      {total > 1 && (
        <div className="fan-dots">
          {items.map((_, i) => (
            <button key={i} className={`fan-dot${i === idx ? ' active' : ''}`}
              onClick={() => setIdx(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

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
  {
    key: 'word-wheel',
    icon: '🎡', title: 'عجلة الكلمات',
    desc: 'كوّن كلمات من حروف العجلة — الحرف الأوسط إلزامي!',
    tag: 'تعزيزي', link: '/library/games/word-wheel', ready: true,
    accent: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', iconBg: '#FEF3C7',
    btnBg: 'linear-gradient(135deg,#F59E0B,#D97706)',
  },
  {
    key: 'puzzle',
    icon: '🧩', title: 'الأحجية السحرية',
    desc: 'اجمع نقاطاً من الألعاب واكتشف الصورة المخفية قطعةً قطعة!',
    tag: 'تعزيزي', link: '/library/puzzle', ready: true,
    accent: '#A855F7', bg: '#FAF5FF', border: '#E9D5FF', iconBg: '#F3E8FF',
    btnBg: 'linear-gradient(135deg,#A855F7,#9333EA)',
  },
  {
    key: 'challenge',
    icon: '⚡', title: 'وضع التحدي',
    desc: 'تحدّى صديقك في الوقت الحقيقي — من يجيب أولاً يفوز!',
    tag: 'تعزيزي', link: '/library/games/challenge', ready: true,
    accent: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE', iconBg: '#E0E7FF',
    btnBg: 'linear-gradient(135deg,#6366F1,#4F46E5)',
  },
  {
    key: 'flashcards',
    icon: '🃏', title: 'بطاقات الحفظ',
    desc: 'راجع مفرداتك يومياً — الكلمات الصعبة تعود تلقائياً!',
    tag: 'تعزيزي', link: '/library/flashcards', ready: true,
    accent: '#312E81', bg: '#EEF2FF', border: '#A5B4FC', iconBg: '#E0E7FF',
    btnBg: 'linear-gradient(135deg,#312E81,#4338CA)',
  },
];

/* STORIES loaded dynamically from DB — see initialStories prop */

const TAG_COLORS = {
  'مستوى 1': { bg: '#EFF6FF', color: '#1D4ED8' },
  'مستوى 2': { bg: '#FFF7ED', color: '#C2410C' },
  'مستوى 3': { bg: '#FDF2F8', color: '#BE185D' },
  'تعزيزي':  { bg: '#ECFDF5', color: '#065F46' },
};

const FILTERS = ['الكل', 'مستوى 1', 'مستوى 2', 'مستوى 3', 'تعزيزي'];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function LibraryGrid({ initialMeta, isTeacher, initialProgress, initialStories }) {
  const stories = initialStories || [];
  const [cardMeta,      setCardMeta]      = useState(initialMeta || {});
  const [editing,       setEditing]       = useState(null);
  const [editIcon,      setEditIcon]      = useState('');
  const [editImg,       setEditImg]       = useState(null);
  const [editTitle,     setEditTitle]     = useState('');
  const [editDesc,      setEditDesc]      = useState('');
  const [saving,        setSaving]        = useState(false);
  const [msg,           setMsg]           = useState(null);
  const [activeFilter,  setActiveFilter]  = useState('الكل');
  const [search,        setSearch]        = useState('');
  const [bannerDismiss, setBannerDismiss] = useState(false);
  const fileRef = useRef();

  /* ── مجموعة المكتملة ── */
  const completedKeys = new Set(
    Object.entries(initialProgress || {})
      .filter(([, done]) => done)
      .map(([k]) => k)
  );
  const hasAnyProgress = completedKeys.size > 0;

  /* ── النشاط التالي المقترح ── */
  const lastDoneIdx = RESOURCES.reduce(
    (last, r, i) => (completedKeys.has(r.key) ? i : last), -1
  );
  const nextActivity =
    RESOURCES.find((r, i) => r.ready && !completedKeys.has(r.key) && i > lastDoneIdx) ||
    RESOURCES.find(r => r.ready && !completedKeys.has(r.key));

  /* ── فلترة ── */
  const filtered = RESOURCES.filter(r => {
    const meta  = cardMeta[r.key] || {};
    const title = (meta.title || r.title).toLowerCase();
    const desc  = (meta.description || r.desc).toLowerCase();
    const q     = search.trim().toLowerCase();
    return (activeFilter === 'الكل' || r.tag === activeFilter)
        && (!q || title.includes(q) || desc.includes(q));
  });

  /* ── إحصاء شريط التقدم ── */
  const totalInFilter = activeFilter === 'الكل'
    ? RESOURCES.length
    : RESOURCES.filter(r => r.tag === activeFilter).length;
  const readyInFilter = activeFilter === 'الكل'
    ? RESOURCES.filter(r => r.ready).length
    : RESOURCES.filter(r => r.tag === activeFilter && r.ready).length;
  const doneInFilter = activeFilter === 'الكل'
    ? RESOURCES.filter(r => completedKeys.has(r.key)).length
    : RESOURCES.filter(r => r.tag === activeFilter && completedKeys.has(r.key)).length;

  const progressPct = hasAnyProgress
    ? (readyInFilter > 0 ? Math.round((doneInFilter / readyInFilter) * 100) : 0)
    : Math.round((readyInFilter / totalInFilter) * 100);

  /* ── معالجات التعديل ── */
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
          card_key:    editing,
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
        @keyframes libCardIn {
          from { opacity:0; transform:translateY(20px) scale(.92); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }
        @keyframes libIconPop {
          0%   { transform:scale(1) rotate(0deg); }
          40%  { transform:scale(1.28) rotate(-8deg); }
          70%  { transform:scale(1.14) rotate(5deg); }
          100% { transform:scale(1.1) rotate(0deg); }
        }
        @keyframes libBannerIn {
          from { opacity:0; transform:translateY(-10px); }
          to   { opacity:1; transform:translateY(0); }
        }

        .lib-page { direction:rtl; font-family:inherit; }

        /* ── هيدر ── */
        .lib-header { text-align:center; margin-bottom:20px; }
        .lib-header h1 {
          font-size:1.75rem; font-weight:900; margin:0 0 4px;
          background:linear-gradient(135deg,#4f46e5,#7c3aed,#ec4899);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          background-clip:text;
        }
        .lib-header p { font-size:.88rem; color:#64748b; margin:0; font-weight:600; }

        /* ── بنر الاستمرار ── */
        .lib-banner {
          display:flex; align-items:center; gap:12px;
          background:linear-gradient(135deg,#ecfdf5,#d1fae5);
          border:1.5px solid #86efac; border-radius:16px;
          padding:14px 16px; margin-bottom:20px;
          animation:libBannerIn .35s ease both;
          direction:rtl;
        }
        @media (max-width:600px) { .lib-banner { flex-wrap:wrap; gap:8px; } }
        .lib-banner-icon { font-size:2rem; flex-shrink:0; }
        .lib-banner-text { flex:1; min-width:0; }
        .lib-banner-title { font-size:.85rem; font-weight:900; color:#065f46; margin:0 0 2px; }
        .lib-banner-sub   { font-size:.75rem; color:#047857; margin:0;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .lib-banner-btn {
          background:linear-gradient(135deg,#22c55e,#16a34a);
          color:#fff; border:none; border-radius:50px;
          padding:8px 18px; font-size:.82rem; font-weight:700;
          cursor:pointer; font-family:inherit;
          text-decoration:none; white-space:nowrap; flex-shrink:0;
          box-shadow:0 4px 12px rgba(34,197,94,.35);
          transition:transform .18s, box-shadow .18s;
        }
        .lib-banner-btn:hover { transform:scale(1.05); box-shadow:0 6px 16px rgba(34,197,94,.45); }
        .lib-banner-close {
          background:none; border:none; cursor:pointer;
          font-size:1rem; color:#6b7280; padding:4px 6px; border-radius:8px;
          flex-shrink:0; transition:background .15s;
        }
        .lib-banner-close:hover { background:rgba(0,0,0,.08); }

        /* ── بحث ── */
        .lib-search-wrap { position:relative; margin-bottom:14px; }
        .lib-search {
          width:100%; border:2px solid #e2e8f0; border-radius:14px;
          padding:10px 42px 10px 16px; font-size:.92rem;
          font-family:inherit; direction:rtl;
          background:#fff; color:#1e293b; outline:none; box-sizing:border-box;
          transition:border-color .18s, box-shadow .18s;
        }
        .lib-search:focus { border-color:#818cf8; box-shadow:0 0 0 3px rgba(129,140,248,.15); }
        .lib-search-icon {
          position:absolute; top:50%; right:14px; transform:translateY(-50%);
          font-size:1rem; pointer-events:none;
        }

        /* ── فلاتر ── */
        .lib-filters {
          display:flex; gap:7px; flex-wrap:wrap; justify-content:center;
          margin-bottom:16px;
        }
        .lib-filter-btn {
          display:inline-flex; align-items:center; gap:5px;
          border:2px solid #e2e8f0; border-radius:50px;
          padding:5px 13px; font-size:.8rem; font-weight:700;
          cursor:pointer; background:#fff; color:#64748b;
          font-family:inherit;
          transition:all .18s;
        }
        .lib-filter-btn:hover:not(.active) { border-color:#a5b4fc; color:#4f46e5; }
        .lib-filter-btn.active {
          background:linear-gradient(135deg,#6366f1,#8b5cf6);
          color:#fff; border-color:transparent;
          box-shadow:0 4px 14px rgba(99,102,241,.32);
        }
        .lib-filter-count {
          background:rgba(0,0,0,.1); border-radius:50%;
          min-width:18px; height:18px; padding:0 2px;
          font-size:.6rem; display:flex; align-items:center; justify-content:center;
        }
        .lib-filter-btn.active .lib-filter-count { background:rgba(255,255,255,.25); }

        /* ── شريط التقدم ── */
        .lib-progress {
          display:flex; align-items:center; gap:10px;
          margin-bottom:18px; direction:rtl;
        }
        .lib-progress-track {
          flex:1; height:7px; background:#e2e8f0; border-radius:99px; overflow:hidden;
        }
        .lib-progress-fill {
          height:100%;
          background:linear-gradient(90deg,#22c55e,#4ade80);
          border-radius:99px;
          transition:width .6s cubic-bezier(.4,0,.2,1);
        }
        .lib-progress-fill.avail {
          background:linear-gradient(90deg,#6366f1,#a78bfa);
        }
        .lib-progress-label {
          font-size:.72rem; color:#64748b; font-weight:700; white-space:nowrap;
        }

        /* ── الشبكة ── */
        .lib-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));
          gap:16px;
        }
        @media (max-width:600px) {
          .lib-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
          .lib-header h1 { font-size:1.3rem; }
          .lib-filter-btn { font-size:.75rem; padding:4px 10px; }
        }
        @media (max-width:380px) { .lib-grid { grid-template-columns:1fr; } }

        /* ── البطاقة ── */
        .lib-card {
          border-radius:18px; padding:18px 14px 14px;
          display:flex; flex-direction:column; align-items:center;
          text-align:center; gap:7px; border:2px solid;
          text-decoration:none; position:relative; overflow:hidden;
          animation:libCardIn .42s cubic-bezier(.34,1.56,.64,1) both;
          transition:transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
        }
        .lib-card.ready::after {
          content:''; position:absolute; inset:0; pointer-events:none;
          background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.38) 50%,transparent 65%);
          transform:translateX(-100%); transition:transform .45s ease;
        }
        .lib-card.ready:hover::after { transform:translateX(110%); }
        .lib-card.ready:hover {
          transform:translateY(-7px) scale(1.035);
          box-shadow:0 18px 40px rgba(0,0,0,.14);
        }
        .lib-card.coming { opacity:.78; cursor:default; }
        .lib-card.lvl1   { box-shadow:0 4px 18px rgba(99,102,241,.12); }
        .lib-card.lvl1.ready:hover { box-shadow:0 18px 40px rgba(99,102,241,.22) !important; }
        /* بطاقة مكتملة: حدود خضراء خفيفة */
        .lib-card.done {
          border-color:#86efac !important;
          box-shadow:0 4px 16px rgba(34,197,94,.14);
        }
        .lib-card.done.ready:hover { box-shadow:0 18px 40px rgba(34,197,94,.2) !important; }

        /* ── أيقونة ── */
        .lib-icon-outer { position:relative; flex-shrink:0; margin-top:8px; }
        .lib-icon-wrap {
          width:64px; height:64px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:2.3rem; overflow:hidden;
          transition:transform .22s cubic-bezier(.34,1.56,.64,1),
                      box-shadow .2s;
        }
        .lib-card.ready:hover .lib-icon-wrap {
          animation:libIconPop .45s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        @media (max-width:600px) {
          .lib-icon-wrap { width:52px; height:52px; font-size:1.8rem; }
          .lib-card { padding:13px 10px 11px; gap:5px; }
          .lib-icon-outer { margin-top:4px; }
        }

        /* ✓ شارة الإكمال */
        .lib-done-badge {
          position:absolute; bottom:-4px; right:-4px; z-index:2;
          background:#22c55e; color:#fff; border-radius:50%;
          width:22px; height:22px; font-size:.78rem; font-weight:900;
          display:flex; align-items:center; justify-content:center;
          border:2.5px solid #fff;
          box-shadow:0 2px 6px rgba(34,197,94,.45);
        }

        /* ── وسم ── */
        .lib-tag {
          position:absolute; top:10px; right:10px;
          border-radius:20px; padding:2px 9px;
          font-size:.63rem; font-weight:800;
        }

        /* ── عنوان ووصف ── */
        .lib-card-title { font-size:.92rem; font-weight:800; color:#1e293b; margin:0; line-height:1.3; }
        .lib-card-desc  { font-size:.73rem; color:#64748b; line-height:1.5; margin:0; flex:1; }
        @media (max-width:600px) {
          .lib-card-title { font-size:.82rem; }
          .lib-card-desc  { font-size:.67rem; }
        }

        /* ── زر ابدأ / العب مجدداً ── */
        .lib-start-btn {
          display:inline-block; border:none; border-radius:50px;
          padding:7px 18px; color:#fff; font-size:.8rem; font-weight:700;
          cursor:pointer; font-family:inherit;
          box-shadow:0 4px 12px rgba(0,0,0,.18); text-decoration:none;
          transition:transform .18s, box-shadow .18s;
        }
        .lib-card.ready:hover .lib-start-btn { transform:scale(1.08); box-shadow:0 7px 20px rgba(0,0,0,.24); }
        .lib-replay-btn {
          display:inline-flex; align-items:center; gap:5px;
          border:none; border-radius:50px;
          padding:7px 14px; color:#fff; font-size:.78rem; font-weight:700;
          cursor:pointer; font-family:inherit;
          text-decoration:none;
          background:linear-gradient(135deg,#22c55e,#16a34a);
          box-shadow:0 4px 12px rgba(34,197,94,.3);
          transition:transform .18s, box-shadow .18s;
        }
        .lib-card.ready:hover .lib-replay-btn { transform:scale(1.08); }

        /* ── قريباً ── */
        .lib-coming-badge {
          display:inline-flex; align-items:center; gap:5px;
          background:#f1f5f9; color:#94a3b8;
          border-radius:50px; padding:6px 14px; font-size:.73rem; font-weight:700;
          border:1.5px dashed #cbd5e1;
        }

        /* ── طبقة قفل ── */
        .lib-lock-overlay {
          position:absolute; inset:0; border-radius:16px;
          background:rgba(255,255,255,.52); backdrop-filter:blur(2px);
          display:flex; align-items:center; justify-content:center;
          font-size:2.2rem; opacity:0; pointer-events:none;
          transition:opacity .18s;
        }
        .lib-card.coming:hover .lib-lock-overlay { opacity:1; }

        /* ── زر تعديل المعلم ── */
        .lib-edit-btn {
          position:absolute; top:10px; left:10px;
          background:rgba(255,255,255,.92); border:none; border-radius:8px;
          width:28px; height:28px; cursor:pointer; font-size:.82rem;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,.15); opacity:0;
          transition:opacity .18s; z-index:3;
        }
        .lib-card:hover .lib-edit-btn { opacity:1; }

        /* ── حالة فارغة ── */
        .lib-empty {
          grid-column:1/-1; text-align:center; padding:48px 20px;
          color:#94a3b8; font-weight:700; font-size:.92rem;
        }
        .lib-empty span { display:block; font-size:2.8rem; margin-bottom:10px; }

        /* ══ مروحة البطاقات (Card Fan Carousel) ══ */
        .fan-car {
          position:relative; padding:0 44px; margin-bottom:28px;
          user-select:none;
        }
        .fan-stage {
          position:relative; height:310px;
          display:flex; align-items:flex-end; justify-content:center;
          overflow:visible;
        }
        /* كل بطاقة تنبثق من نقطة محورية تحتها — هذا يصنع شكل المروحة */
        .fan-slot {
          position:absolute;
          width:min(210px, 58vw);
          bottom:0; left:50%;
          margin-left:calc(min(210px, 58vw) / -2);
          transform-origin: 50% 148%;
          transition: transform .44s cubic-bezier(.34,1.1,.64,1),
                      opacity  .32s ease;
          cursor:pointer;
        }
        .fan-slot.fan-active { cursor:default; }
        .fan-slot .lib-card {
          width:100%; box-sizing:border-box;
          animation:none !important;
          transition:box-shadow .22s;
        }
        .fan-slot.fan-active .lib-card {
          box-shadow:0 24px 60px rgba(0,0,0,.22) !important;
        }
        /* أسهم التنقل */
        .fan-arr {
          position:absolute; top:128px; z-index:10;
          background:#fff; border:1.5px solid #e2e8f0; border-radius:50%;
          width:40px; height:40px; font-size:1.4rem; font-weight:700;
          cursor:pointer; box-shadow:0 4px 14px rgba(0,0,0,.12);
          display:flex; align-items:center; justify-content:center;
          transition:transform .2s, box-shadow .2s;
          color:#4f46e5; padding:0; line-height:1;
        }
        .fan-arr:hover { transform:scale(1.12); box-shadow:0 6px 20px rgba(0,0,0,.18); }
        .fan-arr-r { right:0; }
        .fan-arr-l { left:0; }
        .fan-hidden { opacity:0; pointer-events:none; }
        /* نقاط التنقل */
        .fan-dots {
          display:flex; justify-content:center; gap:6px; margin-top:14px;
        }
        .fan-dot {
          width:8px; height:8px; border-radius:99px; border:none;
          background:#cbd5e1; cursor:pointer; transition:all .3s; padding:0;
        }
        .fan-dot.active { width:22px; background:#6366f1; }
        /* رأس المجموعة */
        .fan-group-header {
          display:flex; align-items:center; gap:8px;
          margin:24px 0 14px; direction:rtl;
        }
        .fan-group-label {
          font-size:.78rem; font-weight:800; border-radius:20px;
          padding:4px 13px; flex-shrink:0;
        }
        .fan-group-line {
          flex:1; height:1.5px;
          background:linear-gradient(90deg,#e2e8f0,transparent);
        }
        .fan-group-count { font-size:.7rem; color:#94a3b8; font-weight:700; flex-shrink:0; }
        @media (max-width:600px) {
          .fan-car   { padding:0 36px; }
          .fan-stage { height:270px; }
          .fan-slot  { width:min(185px, 64vw); margin-left:calc(min(185px,64vw)/-2); }
          .fan-arr   { width:32px; height:32px; font-size:1.1rem; top:110px; }
        }

        /* ══════════════════════════════════════════
           قسم القصص والحكايات
        ══════════════════════════════════════════ */
        @keyframes storyCardIn {
          from { opacity:0; transform:translateX(18px) scale(.94); }
          to   { opacity:1; transform:translateX(0)    scale(1); }
        }
        @keyframes storyStarTwinkle {
          0%,100% { opacity:.55; }
          50%      { opacity:1; }
        }
        @keyframes storySparkle {
          0%,100% { opacity:0; transform:scale(.3) rotate(0deg); }
          45%,55% { opacity:1; transform:scale(1.15) rotate(180deg); }
        }
        @keyframes storyMoonGlow {
          0%,100% { box-shadow:0 0 10px 3px rgba(245,208,100,.35),0 0 24px 6px rgba(245,208,100,.15); }
          50%      { box-shadow:0 0 18px 6px rgba(245,208,100,.65),0 0 40px 12px rgba(245,208,100,.28); }
        }
        @keyframes storyOwlFloat {
          0%,100% { transform:translateY(0) rotate(-2deg); }
          50%      { transform:translateY(-8px) rotate(2deg); }
        }
        @keyframes storyTreeSway {
          0%,100% { transform-origin:bottom center; transform:rotate(0deg); }
          50%      { transform-origin:bottom center; transform:rotate(1.4deg); }
        }
        @keyframes storyMistDrift {
          0%,100% { opacity:.22; transform:scaleX(1); }
          50%      { opacity:.35; transform:scaleX(1.06); }
        }

        .stories-section {
          margin-top:44px;
          border-radius:26px;
          overflow:hidden;
          box-shadow:0 12px 48px rgba(0,0,0,.35), 0 2px 12px rgba(0,0,0,.15);
        }

        /* ── البانر العلوي — غابة ليلية سحرية ── */
        .stories-top-banner {
          background:
            radial-gradient(ellipse at 78% 15%, rgba(124,58,237,.22) 0%, transparent 48%),
            radial-gradient(ellipse at 10% 85%, rgba(16,185,129,.26) 0%, transparent 44%),
            radial-gradient(ellipse at 45% 100%, rgba(6,78,59,.55) 0%, transparent 52%),
            linear-gradient(168deg, #060e1e 0%, #0c1a38 22%, #081f13 60%, #040d09 100%);
          min-height:195px;
          padding:22px 26px 22px;
          display:flex; align-items:center; gap:18px;
          position:relative; overflow:hidden;
          border-bottom:1px solid rgba(16,185,129,.12);
        }

        /* نجوم السماء */
        .stories-banner-stars {
          position:absolute; inset:0; pointer-events:none;
          background-image:
            radial-gradient(circle 1.5px at 11% 16%, rgba(255,255,255,.9) 0%,transparent 100%),
            radial-gradient(circle 1px  at 27% 9%,  rgba(255,255,255,.7) 0%,transparent 100%),
            radial-gradient(circle 2px  at 43% 20%, rgba(255,255,255,.75)0%,transparent 100%),
            radial-gradient(circle 1px  at 57% 7%,  rgba(255,255,255,.55)0%,transparent 100%),
            radial-gradient(circle 1.5px at 71% 14%, rgba(255,255,255,.85)0%,transparent 100%),
            radial-gradient(circle 1px  at 84% 25%, rgba(255,255,255,.6) 0%,transparent 100%),
            radial-gradient(circle 1px  at 19% 36%, rgba(255,255,255,.45)0%,transparent 100%),
            radial-gradient(circle 1.5px at 38% 28%, rgba(255,255,255,.55)0%,transparent 100%),
            radial-gradient(circle 1px  at 53% 33%, rgba(255,255,255,.4) 0%,transparent 100%),
            radial-gradient(circle 2px  at 67% 22%, rgba(255,255,255,.65)0%,transparent 100%),
            radial-gradient(circle 1px  at 79% 38%, rgba(255,255,255,.45)0%,transparent 100%),
            radial-gradient(circle 1px  at 93% 11%, rgba(255,255,255,.7) 0%,transparent 100%),
            radial-gradient(circle 1px  at 6%  48%, rgba(255,255,255,.35)0%,transparent 100%),
            radial-gradient(circle 1.5px at 88% 42%, rgba(255,255,255,.5) 0%,transparent 100%);
          animation:storyStarTwinkle 4s ease-in-out infinite;
        }

        /* ضباب الغابة */
        .stories-banner-mist {
          position:absolute; bottom:0; left:0; right:0; height:72px;
          background:linear-gradient(to top, rgba(6,78,59,.42) 0%, rgba(6,78,59,.14) 55%, transparent 100%);
          pointer-events:none;
          animation:storyMistDrift 7s ease-in-out infinite;
        }

        /* أشجار الظل — يمين */
        .stories-trees-r {
          position:absolute; bottom:0; right:14px;
          display:flex; align-items:flex-end; gap:3px;
          pointer-events:none;
        }
        /* أشجار الظل — يسار */
        .stories-trees-l {
          position:absolute; bottom:0; left:10px;
          display:flex; align-items:flex-end; gap:4px;
          pointer-events:none;
        }
        .s-tree {
          background:rgba(3,14,8,.88);
          clip-path:polygon(50% 0%,0% 100%,100% 100%);
        }

        .stories-banner-deco {
          position:absolute; inset:0; pointer-events:none; user-select:none;
        }

        /* ── قسم البطاقات السفلي ── */
        .stories-bottom {
          background:linear-gradient(160deg,#0c1a0f 0%,#0f2318 50%,#0a1c10 100%);
          padding:16px 20px 20px;
          display:flex; flex-direction:column; gap:10px;
          border-top:1px solid rgba(16,185,129,.12);
        }
        .stories-scroll-header {
          display:flex; align-items:center;
          justify-content:space-between; flex-shrink:0;
        }
        .stories-scroll-title {
          font-size:.9rem; font-weight:900; color:#a7f3d0;
          display:flex; align-items:center; gap:6px;
        }
        .stories-soon-badge {
          background:rgba(16,185,129,.15); color:#6ee7b7;
          border:1px solid rgba(16,185,129,.3); border-radius:20px;
          padding:3px 10px; font-size:.68rem; font-weight:800;
        }
        .stories-hint {
          color:rgba(110,231,183,.55); font-size:.74rem; font-weight:600; margin:0;
          display:flex; align-items:center; gap:5px;
        }

        /* ── شريط الأفقي ── */
        .stories-scroll {
          display:flex; gap:13px;
          overflow-x:auto; padding-bottom:8px; padding-top:2px;
          scroll-snap-type:x mandatory;
          -webkit-overflow-scrolling:touch;
        }
        .stories-scroll::-webkit-scrollbar { height:4px; }
        .stories-scroll::-webkit-scrollbar-track { background:rgba(16,185,129,.08); border-radius:99px; }
        .stories-scroll::-webkit-scrollbar-thumb { background:rgba(16,185,129,.4); border-radius:99px; }

        /* ── بطاقة القصة ── */
        .story-card {
          flex-shrink:0; width:144px;
          border-radius:18px; padding:16px 12px 14px;
          display:flex; flex-direction:column; align-items:center;
          text-align:center; gap:6px; border:2px solid;
          scroll-snap-align:start;
          animation:storyCardIn .42s cubic-bezier(.34,1.56,.64,1) both;
          transition:transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
          position:relative; cursor:pointer; text-decoration:none;
        }
        .story-card.s-ready:hover {
          transform:translateY(-6px) scale(1.04);
          box-shadow:0 14px 32px rgba(5,150,105,.22);
        }
        .story-card.s-locked { opacity:.75; cursor:default; }

        .story-icon { font-size:2.6rem; line-height:1; }
        .story-level-badge {
          border-radius:20px; padding:2px 9px;
          font-size:.59rem; font-weight:800;
          background:rgba(0,0,0,.07);
        }
        .story-title {
          font-size:.77rem; font-weight:800; color:#1e293b;
          margin:0; line-height:1.38;
        }
        .story-length { font-size:.62rem; color:#475569; font-weight:600; }

        .story-read-btn {
          display:inline-block; border:none; border-radius:50px;
          padding:6px 13px; color:#fff; font-size:.7rem; font-weight:800;
          cursor:pointer; font-family:inherit;
          box-shadow:0 3px 10px rgba(0,0,0,.2);
          transition:transform .15s; text-decoration:none;
        }
        .story-card.s-ready:hover .story-read-btn { transform:scale(1.1); }

        .story-locked-btn {
          display:inline-flex; align-items:center; gap:4px;
          background:#f1f5f9; color:#94a3b8;
          border:1.5px dashed #cbd5e1; border-radius:50px;
          padding:5px 12px; font-size:.65rem; font-weight:700;
        }
      `}</style>

      <div className="lib-page">

        {/* ── هيدر ── */}
        <div className="lib-header">
          <h1>🌟 اختر نشاطك وابدأ الرحلة</h1>
          <p>15 نشاطاً متنوعاً لتعلّم العربية بمتعة وإبداع</p>
        </div>

        {/* ── بنر الاستمرار / البداية ── */}
        {!isTeacher && nextActivity && !bannerDismiss && (() => {
          const meta = cardMeta[nextActivity.key] || {};
          const icon = meta.image_url ? '🖼️' : (meta.icon || nextActivity.icon);
          const title = meta.title || nextActivity.title;
          return (
            <div className="lib-banner">
              <span className="lib-banner-icon">{icon}</span>
              <div className="lib-banner-text">
                <p className="lib-banner-title">
                  {hasAnyProgress ? '👋 استمر من حيث توقفت!' : '🚀 ابدأ رحلتك من هنا!'}
                </p>
                <p className="lib-banner-sub">{title}</p>
              </div>
              <Link href={nextActivity.link} className="lib-banner-btn">
                {hasAnyProgress ? 'استمر ←' : 'ابدأ الآن ←'}
              </Link>
              <button className="lib-banner-close" onClick={() => setBannerDismiss(true)}>✕</button>
            </div>
          );
        })()}

        {/* ── بحث ── */}
        <div className="lib-search-wrap">
          <span className="lib-search-icon">🔍</span>
          <input
            className="lib-search"
            type="text"
            placeholder="ابحث عن نشاط..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* ── فلاتر ── */}
        <div className="lib-filters">
          {FILTERS.map(f => {
            const count = f === 'الكل'
              ? RESOURCES.length
              : RESOURCES.filter(r => r.tag === f).length;
            return (
              <button
                key={f}
                className={`lib-filter-btn${activeFilter === f ? ' active' : ''}`}
                onClick={() => { setActiveFilter(f); setSearch(''); }}
              >
                {f}
                <span className="lib-filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── شريط التقدم ── */}
        <div className="lib-progress">
          <div className="lib-progress-track">
            <div
              className={`lib-progress-fill${hasAnyProgress ? '' : ' avail'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="lib-progress-label">
            {hasAnyProgress
              ? `${doneInFilter}/${readyInFilter} مكتمل ✓`
              : `${readyInFilter}/${totalInFilter} متاح`
            }
          </span>
        </div>

        {/* ── الشبكة / مروحة البطاقات ── */}
        {(() => {
          /* دالة رسم بطاقة واحدة — مشتركة بين المروحة والشبكة */
          const renderLibCard = (r, i) => {
            const meta         = cardMeta[r.key] || {};
            const displayTitle = meta.title       || r.title;
            const displayDesc  = meta.description || r.desc;
            const displayImg   = meta.image_url   || null;
            const displayIcon  = displayImg ? null : (meta.icon || r.icon);
            const tagStyle     = TAG_COLORS[r.tag] ?? { bg:'#f1f5f9', color:'#475569' };
            const isLvl1       = r.tag === 'مستوى 1';
            const done         = completedKeys.has(r.key);
            const cardContent = (
              <>
                {isTeacher && (
                  <button className="lib-edit-btn"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); openEdit(r); }}
                    title="تعديل البطاقة">✏️</button>
                )}
                <span className="lib-tag" style={{ background:tagStyle.bg, color:tagStyle.color }}>{r.tag}</span>
                {isLvl1 && r.ready && !done && (
                  <span style={{ position:'absolute', top:9, left:isTeacher?42:10, fontSize:'.85rem' }}>⭐</span>
                )}
                <div className="lib-icon-outer">
                  <div className="lib-icon-wrap" style={{
                    background: r.iconBg,
                    boxShadow: done ? '0 0 0 2.5px #22c55e, 0 0 0 5px rgba(34,197,94,.12)' : 'none',
                  }}>
                    {displayImg
                      ? <img src={displayImg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      : <span style={{ filter:r.ready?'none':'grayscale(1) brightness(.65)' }}>{displayIcon}</span>
                    }
                  </div>
                  {done && <span className="lib-done-badge">✓</span>}
                </div>
                <p className="lib-card-title">{displayTitle}</p>
                <p className="lib-card-desc">{displayDesc}</p>
                {r.ready
                  ? done
                    ? <span className="lib-replay-btn">✓ العب مجدداً</span>
                    : <span className="lib-start-btn" style={{ background:r.btnBg }}>ابدأ الآن ←</span>
                  : <span className="lib-coming-badge">🔒 قريباً</span>
                }
                {!r.ready && <div className="lib-lock-overlay">🔒</div>}
              </>
            );
            const cls = ['lib-card', r.ready?'ready':'coming', isLvl1?'lvl1':'', done?'done':''].filter(Boolean).join(' ');
            const sty = { background:r.bg, borderColor:done?'#86efac':r.border, boxShadow:r.ready?`0 4px 16px ${r.accent}18`:'none' };
            return r.ready
              ? <Link key={r.key} href={r.link} className={cls} style={sty}>{cardContent}</Link>
              : <div  key={r.key}               className={cls} style={sty}>{cardContent}</div>;
          };

          /* عند البحث → شبكة عادية للتصفح السريع */
          if (search.trim()) return (
            <div className="lib-grid" id="lib-activities-grid">
              {filtered.length === 0
                ? <div className="lib-empty"><span>🔍</span>لا توجد نتائج مطابقة</div>
                : filtered.map(renderLibCard)
              }
            </div>
          );

          /* بدون بحث → مروحة مجمّعة بالمستوى */
          const visibleGroups = CAROUSEL_GROUPS
            .filter(g => activeFilter === 'الكل' || g.tag === activeFilter)
            .map(g => ({ ...g, items: filtered.filter(r => r.tag === g.tag) }))
            .filter(g => g.items.length > 0);

          if (visibleGroups.length === 0) return (
            <div className="lib-grid" id="lib-activities-grid">
              <div className="lib-empty"><span>🔍</span>لا توجد نتائج مطابقة</div>
            </div>
          );

          return (
            <div id="lib-activities-grid">
              {visibleGroups.map(g => {
                const tagStyle = TAG_COLORS[g.tag] ?? { bg:'#f1f5f9', color:'#475569' };
                return (
                  <div key={g.tag}>
                    <div className="fan-group-header">
                      <span className="fan-group-label" style={{ background:tagStyle.bg, color:tagStyle.color }}>
                        {g.emoji} {g.tag}
                      </span>
                      <div className="fan-group-line" />
                      <span className="fan-group-count">{g.items.length} {g.items.length === 1 ? 'نشاط' : 'أنشطة'}</span>
                    </div>
                    <FanCarousel items={g.items} renderCard={renderLibCard} />
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════
            قسم القصص والحكايات
        ══════════════════════════════════════════════ */}
        <div className="stories-section">

          {/* ── البانر العلوي — غابة ليلية سحرية ── */}
          <div className="stories-top-banner">

            {/* نجوم + ضباب + أشجار ظل */}
            <div className="stories-banner-stars" aria-hidden="true" />
            <div className="stories-banner-mist"  aria-hidden="true" />

            {/* أشجار ظل — يمين */}
            <div className="stories-trees-r" aria-hidden="true">
              <div className="s-tree" style={{width:18,height:52,animation:'storyTreeSway 5s ease-in-out infinite .4s'}}/>
              <div className="s-tree" style={{width:26,height:76,animation:'storyTreeSway 6s ease-in-out infinite'}}/>
              <div className="s-tree" style={{width:16,height:44,animation:'storyTreeSway 4.5s ease-in-out infinite .8s'}}/>
            </div>

            {/* أشجار ظل — يسار */}
            <div className="stories-trees-l" aria-hidden="true">
              <div className="s-tree" style={{width:14,height:40,animation:'storyTreeSway 5.5s ease-in-out infinite .2s'}}/>
              <div className="s-tree" style={{width:22,height:64,animation:'storyTreeSway 4.8s ease-in-out infinite .6s'}}/>
            </div>

            {/* ✦ بريق متحرك */}
            <div className="stories-banner-deco" aria-hidden="true">
              <span style={{position:'absolute',top:'18%',right:'22%',fontSize:'1rem',animation:'storySparkle 3.2s ease-in-out infinite'}}>✦</span>
              <span style={{position:'absolute',top:'12%',right:'38%',fontSize:'.7rem',color:'#f5d87a',animation:'storySparkle 4s ease-in-out infinite 1.1s'}}>★</span>
              <span style={{position:'absolute',top:'28%',left:'38%',fontSize:'.8rem',animation:'storySparkle 3.6s ease-in-out infinite .6s'}}>✦</span>
              <span style={{position:'absolute',top:'10%',left:'25%',fontSize:'.65rem',color:'#a78bfa',animation:'storySparkle 5s ease-in-out infinite 1.8s'}}>◆</span>
              <span style={{position:'absolute',top:'38%',right:'12%',fontSize:'.75rem',color:'#6ee7b7',animation:'storySparkle 4.4s ease-in-out infinite 2.2s'}}>✦</span>
            </div>

            {/* القمر + الكائنات */}
            <div style={{position:'relative',zIndex:2,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
              {/* هلال القمر */}
              <div style={{
                position:'relative', width:42, height:42,
                borderRadius:'50%',
                background:'#f5d080',
                animation:'storyMoonGlow 3s ease-in-out infinite',
                flexShrink:0,
              }}>
                {/* الجزء الداكن ليكوّن الهلال */}
                <div style={{
                  position:'absolute', top:-4, right:-4,
                  width:36, height:36, borderRadius:'50%',
                  background:'#0a1628',
                }}/>
              </div>
              {/* الكائنات */}
              <div style={{
                fontSize:'2.8rem', lineHeight:1,
                filter:'drop-shadow(0 4px 18px rgba(0,0,0,.5))',
                animation:'storyOwlFloat 4s ease-in-out infinite',
              }}>🦁</div>
            </div>

            {/* النص الرئيسي */}
            <div style={{position:'relative',zIndex:2,flex:1,minWidth:0}}>
              <h2 style={{
                fontWeight:900, fontSize:'1.2rem',
                margin:'0 0 6px', lineHeight:1.4,
                background:'linear-gradient(135deg,#ffffff 0%,#a7f3d0 50%,#f5d080 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                backgroundClip:'text',
                filter:'drop-shadow(0 2px 12px rgba(16,185,129,.4))',
              }}>
                حكايات الغابة السحرية
              </h2>
              <p style={{
                color:'rgba(255,255,255,.68)', fontSize:'.8rem',
                margin:'0 0 12px', lineHeight:1.65,
              }}>
                قصص تنمّي الخيال وتُثري اللغة العربية
              </p>
              {/* شارة حيوانات صغيرة */}
              <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                {['🦊','🐇','🦉','🐢'].map(e => (
                  <span key={e} style={{
                    fontSize:'1.3rem',
                    filter:'drop-shadow(0 2px 6px rgba(0,0,0,.4))',
                    opacity:.85,
                  }}>{e}</span>
                ))}
                <span style={{
                  color:'rgba(167,243,208,.7)', fontSize:'.65rem',
                  fontWeight:700, marginRight:4,
                }}>أبطال قصصنا</span>
              </div>
            </div>

            {/* شارة الإحصاء */}
            <div style={{
              position:'relative', zIndex:2, flexShrink:0,
              background:'rgba(255,255,255,.08)',
              border:'1px solid rgba(167,243,208,.25)',
              borderRadius:16, padding:'12px 16px', textAlign:'center',
              backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
              boxShadow:'0 4px 20px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.1)',
            }}>
              <div style={{
                color:'#a7f3d0', fontSize:'.78rem', fontWeight:900,
                marginBottom:5, letterSpacing:'.3px',
              }}>
                {stories.length > 0 ? `✨ ${stories.length} قصة متاحة` : '✨ قصص قادمة'}
              </div>
              <div style={{display:'flex',justifyContent:'center',gap:5,marginBottom:6}}>
                {[1,2,3].map(l => (
                  <span key={l} style={{
                    background:'rgba(16,185,129,.2)',
                    border:'1px solid rgba(16,185,129,.35)',
                    borderRadius:20, padding:'1px 7px',
                    fontSize:'.58rem', fontWeight:800, color:'#6ee7b7',
                  }}>م {l}</span>
                ))}
              </div>
              <div style={{
                width:'100%', height:3, borderRadius:99,
                background:'rgba(255,255,255,.1)',
                overflow:'hidden',
              }}>
                <div style={{
                  height:'100%', borderRadius:99,
                  width: stories.length > 0 ? '100%' : '30%',
                  background:'linear-gradient(90deg,#10b981,#f5d080)',
                  transition:'width 1s ease',
                }}/>
              </div>
            </div>
          </div>

          {/* ── شريط بطاقات القصص ── */}
          <div className="stories-bottom">

            <div className="stories-scroll-header">
              <div className="stories-scroll-title">
                <span>📖</span>
                قصص وحكايات
              </div>
              {stories.length === 0
                ? <span className="stories-soon-badge">🔜 قريباً</span>
                : <span className="stories-soon-badge">{stories.length} قصة متاحة</span>
              }
            </div>

            {stories.length > 0 && (
              <p className="stories-hint">
                <span>←</span>
                مرّر لاستكشاف المزيد من القصص
              </p>
            )}

            {stories.length === 0 ? (
              <p style={{ color:'rgba(110,231,183,.65)', fontSize:'.82rem', fontWeight:700, textAlign:'center', padding:'18px 0' }}>
                القصص قادمة قريباً — ترقّب المزيد! 🌟
              </p>
            ) : (
              <div className="stories-scroll">
                {stories.map((s, i) => {
                  const accent = s.accent || '#10b981';
                  const level  = `مستوى ${s.level || 1}`;
                  const cardEl = (
                    <>
                      <span style={{
                        position:'absolute', top:8, left:8,
                        background: accent, color:'#fff',
                        borderRadius:20, padding:'2px 7px',
                        fontSize:'.56rem', fontWeight:900,
                      }}>جديد ✨</span>
                      <div className="story-icon">{s.icon || '📖'}</div>
                      <div className="story-level-badge" style={{ color: accent }}>{level}</div>
                      <p className="story-title">{s.title}</p>
                      <div className="story-length">⏱ {s.length || 'قصيرة'}</div>
                      <span className="story-read-btn" style={{ background: `linear-gradient(135deg,${accent},${accent}bb)` }}>
                        اقرأ الآن ←
                      </span>
                    </>
                  );
                  return (
                    <Link
                      key={s.id}
                      href={`/library/stories/${s.slug}`}
                      className="story-card s-ready"
                      style={{
                        background:    s.bg || '#ecfdf5',
                        borderColor:   s.border_color || '#6ee7b7',
                        boxShadow:     `0 4px 18px ${accent}20`,
                        animationDelay:`${i * 0.07}s`,
                      }}
                    >
                      {cardEl}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

        </div>
        {/* نهاية قسم القصص */}

      </div>

      {/* ══════════════════════════════════════════════
          نافذة التعديل — محفوظة كاملاً للمعلمين
      ══════════════════════════════════════════════ */}
      {isTeacher && editing && editingResource && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:20 }}
          onClick={closeEdit}
        >
          <div
            style={{ background:'#fff', borderRadius:20, padding:'24px 20px', width:'100%', maxWidth:420, boxShadow:'0 16px 48px rgba(0,0,0,.3)', maxHeight:'90vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <h3 style={{ margin:0, color:'#1f2937', fontSize:'1.05rem', fontWeight:800 }}>✏️ تعديل البطاقة</h3>
              <button onClick={closeEdit} style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:'1rem' }}>✕</button>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              style={{ width:90, height:90, borderRadius:18, margin:'0 auto 16px', background:editingResource.iconBg, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', border:'2px dashed #e5e7eb', fontSize:'2.8rem', boxShadow:'0 4px 14px rgba(0,0,0,.1)' }}
            >
              {editImg ? <img src={editImg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : editIcon}
            </div>
            <input type="file" accept="image/*" hidden ref={fileRef}
              onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                const b64 = await fileToBase64(f);
                setEditImg(b64); setEditIcon('');
              }}
            />

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

            <label style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
              <span style={{ fontWeight:700, color:'#374151', fontSize:'.85rem' }}>الأيقونة (رمز)</span>
              <div style={{ display:'flex', gap:8 }}>
                <input value={editImg?'':editIcon} onChange={e => { setEditIcon(e.target.value); setEditImg(null); }} disabled={!!editImg} placeholder="مثال: 🎯" maxLength={2}
                  style={{ width:56, textAlign:'center', fontSize:'1.5rem', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'6px', fontFamily:'inherit', background:editImg?'#f3f4f6':'#fff' }}/>
                <input value={editImg?'':editIcon} onChange={e => { setEditIcon(e.target.value); setEditImg(null); }} disabled={!!editImg} placeholder="أو اكتب أي نص"
                  style={{ flex:1, border:'1.5px solid #e5e7eb', borderRadius:10, padding:'8px 12px', fontFamily:'inherit', fontSize:'.9rem', direction:'rtl', background:editImg?'#f3f4f6':'#fff' }}/>
              </div>
              {editImg && <span style={{ fontSize:'.75rem', color:'#9ca3af' }}>الأيقونة معطّلة — الصورة تحل محلها</span>}
            </label>

            <label style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
              <span style={{ fontWeight:700, color:'#374151', fontSize:'.85rem' }}>عنوان النشاط</span>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                style={{ border:'1.5px solid #e5e7eb', borderRadius:10, padding:'8px 12px', fontFamily:'inherit', fontSize:'.95rem', direction:'rtl' }}/>
            </label>

            <label style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:18 }}>
              <span style={{ fontWeight:700, color:'#374151', fontSize:'.85rem' }}>الوصف</span>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                style={{ border:'1.5px solid #e5e7eb', borderRadius:10, padding:'8px 12px', fontFamily:'inherit', fontSize:'.88rem', direction:'rtl', resize:'vertical' }}/>
            </label>

            {msg && (
              <div style={{ marginBottom:12, padding:'8px 12px', borderRadius:8, fontSize:'.85rem', fontWeight:700, background:msg.ok?'#d4edda':'#f8d7da', color:msg.ok?'#155724':'#721c24' }}>
                {msg.text}
              </div>
            )}

            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex:1, background:'linear-gradient(135deg,#5b4fc4,#7c3aed)', border:'none', borderRadius:12, padding:'11px', color:'#fff', fontSize:'.92rem', fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}
              >{saving?'جارٍ الحفظ…':'💾 حفظ التغييرات'}</button>

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
