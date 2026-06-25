'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────
   بيانات البطاقات — لا يُحذف أي عنصر
───────────────────────────────────────────────────────── */
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

const TAG_COLORS = {
  'مستوى 1': { bg: '#dbeafe', color: '#1D4ED8' },
  'مستوى 2': { bg: '#ffedd5', color: '#C2410C' },
  'مستوى 3': { bg: '#fce7f3', color: '#BE185D' },
  'تعزيزي':  { bg: '#d1fae5', color: '#065F46' },
};

/* ─────────────────────────────────────────────────────────
   ثوابت تخطيط المسار
───────────────────────────────────────────────────────── */
// نسب أفقية (% من عرض الحاوية) لكل بطاقة — تتعرّج يساراً ويميناً
const XPCTS = [50, 71, 29, 71, 29, 71, 29, 71, 29, 71, 29, 71, 29, 71, 50];
const VW    = 720;   // عرض viewBox للـ SVG
const VGAP  = 218;   // مسافة رأسية بين قمم البطاقات
const TOP0  = 55;    // offset من أعلى حاوية المسار
const CCY   = 92;    // مركز البطاقة (top + CCY = مركز الأيقونة)

function cardPos(i) {
  return { x: Math.round(XPCTS[i] * VW / 100), y: TOP0 + i * VGAP + CCY };
}
const ALL_POS = RESOURCES.map((_, i) => cardPos(i));
const TOTAL_H = TOP0 + (RESOURCES.length - 1) * VGAP + CCY + 140;

// مسار SVG: منحنيات كوبيكية ناعمة تمر بين البطاقات
function makePath() {
  const p = ALL_POS;
  let d = `M ${p[0].x} ${TOP0 - 20}`;
  for (let i = 0; i < p.length - 1; i++) {
    const mY = Math.round((p[i].y + p[i + 1].y) / 2);
    d += ` C ${p[i].x} ${mY},${p[i + 1].x} ${mY},${p[i + 1].x} ${p[i + 1].y}`;
  }
  return d;
}
const PATH_D = makePath();

// ألوان مقاطع المسار
const SEG_COLORS = [
  '#f472b6','#a78bfa','#34d399','#fbbf24',
  '#fb923c','#818cf8','#22d3ee','#f472b6',
];

function makeSegments() {
  const segs = [];
  for (let i = 0; i < ALL_POS.length - 1; i++) {
    const p1 = ALL_POS[i], p2 = ALL_POS[i + 1];
    const mY = Math.round((p1.y + p2.y) / 2);
    segs.push({
      d: `M ${p1.x} ${p1.y} C ${p1.x} ${mY},${p2.x} ${mY},${p2.x} ${p2.y}`,
      color: SEG_COLORS[Math.floor(i / 2) % SEG_COLORS.length],
    });
  }
  return segs;
}
const SEGMENTS = makeSegments();

// نقاط وسيطة على المسار
function makeDots() {
  const dots = [];
  for (let i = 0; i < ALL_POS.length - 1; i++) {
    const p1 = ALL_POS[i], p2 = ALL_POS[i + 1];
    const mY = (p1.y + p2.y) / 2;
    for (const t of [0.3, 0.7]) {
      const mt = 1 - t;
      const bx = mt*mt*mt*p1.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p2.x;
      const by = mt*mt*mt*p1.y + 3*mt*mt*t*mY   + 3*mt*t*t*mY   + t*t*t*p2.y;
      dots.push({ x: Math.round(bx), y: Math.round(by) });
    }
  }
  return dots;
}
const DOTS = makeDots();

/* ─────────────────────────────────────────────────────────
   حلوى طائرة خلفية
───────────────────────────────────────────────────────── */
const CANDIES = [
  { e:'🍭', top:'2%',  left:'4%',  s:5,   d:0    },
  { e:'⭐', top:'5%',  right:'6%', s:6.5, d:1    },
  { e:'🍬', top:'10%', left:'16%', s:4,   d:.4   },
  { e:'✨', top:'17%', right:'4%', s:5.5, d:2    },
  { e:'🌟', top:'24%', left:'3%',  s:6,   d:1.5  },
  { e:'🍭', top:'32%', right:'12%',s:5,   d:.8   },
  { e:'🍦', top:'44%', left:'8%',  s:4.5, d:2.5  },
  { e:'🎀', top:'54%', right:'5%', s:5,   d:1.2  },
  { e:'🍬', top:'63%', left:'5%',  s:6,   d:.3   },
  { e:'⭐', top:'72%', right:'10%',s:5,   d:1.8  },
  { e:'🌈', top:'82%', left:'7%',  s:4,   d:.7   },
  { e:'✨', top:'90%', right:'6%', s:5.5, d:2.2  },
];

/* ─────────────────────────────────────────────────────────
   مساعد base64
───────────────────────────────────────────────────────── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ══════════════════════════════════════════════════════════
   المكوّن الرئيسي
══════════════════════════════════════════════════════════ */
export default function LibraryGrid({ initialMeta, isTeacher }) {
  const [cardMeta,  setCardMeta]  = useState(initialMeta || {});
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
      {/* ── أنماط CSS ── */}
      <style>{`
        @keyframes libFloat {
          0%,100% { transform:translateY(0) rotate(0deg) scale(1); }
          33%      { transform:translateY(-13px) rotate(-5deg) scale(1.04); }
          66%      { transform:translateY(-6px)  rotate(4deg)  scale(.97); }
        }
        @keyframes libCardIn {
          from { opacity:0; transform:translateX(-50%) translateY(22px) scale(.88); }
          to   { opacity:1; transform:translateX(-50%) translateY(0)    scale(1); }
        }
        @keyframes libPingRing {
          0%   { transform:scale(1); opacity:.7; }
          100% { transform:scale(2.2); opacity:0; }
        }

        /* حاوية الخلفية الكاملة */
        .lib-bg {
          position: relative;
          margin: -8px -16px -32px;
          padding: 0 0 60px;
          background: linear-gradient(180deg,
            #0f0524 0%, #1a0540 10%, #220a50 22%,
            #1a1060 38%, #0e1545 58%, #08112a 78%, #060e22 100%);
          overflow: hidden;
          min-height: 100vh;
          direction: rtl;
          font-family: 'Cairo','Tajawal',sans-serif;
        }

        /* الهيدر */
        .lib-hero {
          text-align: center;
          padding: 40px 20px 24px;
          position: relative; z-index: 2;
        }
        .lib-hero h1 {
          font-size: 2rem; font-weight: 900; color: #fff; margin: 0 0 6px;
          text-shadow: 0 0 40px rgba(244,114,182,.65), 0 2px 8px rgba(0,0,0,.5);
        }
        .lib-hero p { color: #c4b5fd; font-size: .95rem; font-weight: 600; margin: 0 0 16px; }

        /* حاوية المسار */
        .lib-path-wrap {
          position: relative;
          max-width: 740px;
          margin: 0 auto;
          padding: 0 10px;
        }
        .lib-path-svg {
          position: absolute; top: 0; left: 0;
          width: 100%; pointer-events: none;
        }

        /* البطاقة الواحدة على المسار */
        .lib-node {
          position: absolute;
          width: 185px;
          transform: translateX(-50%);
          animation: libCardIn .45s cubic-bezier(.34,1.56,.64,1) both;
          z-index: 3;
        }
        .lib-node-inner {
          border-radius: 20px;
          padding: 14px 12px 12px;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 5px; border: 2px solid;
          text-decoration: none; cursor: pointer;
          position: relative; overflow: hidden;
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(14px);
          transition: transform .22s cubic-bezier(.34,1.56,.64,1),
                      box-shadow .2s ease;
        }
        .lib-node-inner:hover {
          transform: translateY(-7px) scale(1.04);
        }
        .lib-node-inner.coming {
          opacity: .75; cursor: default;
        }
        .lib-node-inner.coming:hover { transform: none; }

        /* حلقة توهج للبطاقات الجاهزة */
        .lib-glow-ring {
          position: absolute; inset: -6px;
          border-radius: 26px;
          pointer-events: none; z-index: -1;
          opacity: 0;
          transition: opacity .3s;
        }
        .lib-node-inner:hover .lib-glow-ring { opacity: 1; }

        .lib-icon-wrap {
          width: 52px; height: 52px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.9rem; flex-shrink: 0; overflow: hidden;
        }
        .lib-tag {
          position: absolute; top: 9px; right: 9px;
          border-radius: 20px; padding: 2px 8px;
          font-size: .62rem; font-weight: 800;
        }
        .lib-edit-btn {
          position: absolute; top: 9px; left: 9px;
          background: rgba(255,255,255,.9); border: none; border-radius: 8px;
          width: 26px; height: 26px; cursor: pointer; font-size: .78rem;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,.15);
          opacity: 0; transition: opacity .18s; z-index: 2;
        }
        .lib-node-inner:hover .lib-edit-btn { opacity: 1; }
        .lib-card-title {
          font-size: .88rem; font-weight: 800;
          color: #1e293b; line-height: 1.3; margin: 0;
        }
        .lib-card-desc {
          font-size: .7rem; color: #64748b;
          line-height: 1.45; margin: 0; flex: 1;
        }
        .lib-start-btn {
          display: inline-block; border: none; border-radius: 50px;
          padding: 5px 14px; color: #fff; font-size: .74rem; font-weight: 700;
          cursor: pointer; font-family: 'Cairo','Tajawal',sans-serif;
          transition: transform .16s, box-shadow .16s;
          box-shadow: 0 3px 10px rgba(0,0,0,.2); text-decoration: none;
          margin-top: 2px;
        }
        .lib-start-btn:hover { transform: scale(1.07); box-shadow: 0 5px 16px rgba(0,0,0,.25); }
        .lib-coming-badge {
          display: inline-block; background: #f1f5f9; color: #94a3b8;
          border-radius: 50px; padding: 4px 12px; font-size: .7rem;
          font-weight: 700; border: 1.5px dashed #cbd5e1; margin-top: 2px;
        }

        /* نقاط التوهج خلف بعض البطاقات */
        .lib-ping {
          position: absolute; border-radius: 50%;
          animation: libPingRing 2.2s ease-out infinite;
          pointer-events: none; z-index: 2;
        }

        @media (max-width: 600px) {
          .lib-bg { margin: -8px -12px -24px; }
          .lib-hero h1 { font-size: 1.5rem; }
          .lib-node { width: 148px; }
          .lib-icon-wrap { width: 44px; height: 44px; font-size: 1.6rem; }
          .lib-card-title { font-size: .8rem; }
          .lib-card-desc { font-size: .65rem; }
          .lib-start-btn { font-size: .68rem; padding: 4px 11px; }
        }
      `}</style>

      {/* ═══ الخلفية الكاملة ═══ */}
      <div className="lib-bg">

        {/* أقواس ضوئية محيطية */}
        <div aria-hidden="true" style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
          <div style={{ position:'absolute', width:400, height:400, top:-60, left:-90, borderRadius:'50%', background:'radial-gradient(circle,#f472b6,transparent 70%)', opacity:.22, filter:'blur(40px)' }} />
          <div style={{ position:'absolute', width:340, height:340, top:'26%', right:-70, borderRadius:'50%', background:'radial-gradient(circle,#818cf8,transparent 70%)', opacity:.18, filter:'blur(38px)' }} />
          <div style={{ position:'absolute', width:360, height:360, top:'56%', left:-80, borderRadius:'50%', background:'radial-gradient(circle,#34d399,transparent 70%)', opacity:.17, filter:'blur(40px)' }} />
          <div style={{ position:'absolute', width:300, height:300, top:'82%', right:-60, borderRadius:'50%', background:'radial-gradient(circle,#fb923c,transparent 70%)', opacity:.18, filter:'blur(36px)' }} />
        </div>

        {/* حلوى طائرة */}
        <div aria-hidden="true" style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
          {CANDIES.map((c, i) => (
            <span key={i} style={{
              position:'absolute', fontSize:'1.75rem', lineHeight:1,
              top:c.top, [c.left?'left':'right']: c.left||c.right,
              opacity:.28,
              animation:`libFloat ${c.s}s ease-in-out infinite ${c.d}s`,
              userSelect:'none',
            }}>{c.e}</span>
          ))}
        </div>

        {/* ═══ الهيدر ═══ */}
        <div className="lib-hero">
          <div style={{ fontSize:'2.6rem', lineHeight:1, marginBottom:8, animation:'libFloat 4s ease-in-out infinite', display:'inline-block' }}>🍭</div>
          <h1>رحلة التعلّم العربية</h1>
          <p>اختر نشاطاً وابدأ مغامرتك في اللغة العربية!</p>
          {isTeacher && (
            <span style={{ background:'rgba(255,255,255,.12)', color:'#a5f3fc', borderRadius:20, padding:'3px 14px', fontSize:'.78rem', fontWeight:700, border:'1px solid rgba(165,243,252,.3)' }}>
              ✏️ حرّك الماوس فوق أي بطاقة للتعديل
            </span>
          )}
        </div>

        {/* ═══ حاوية المسار والبطاقات ═══ */}
        <div className="lib-path-wrap" style={{ height: TOTAL_H }}>

          {/* SVG المسار */}
          <svg
            className="lib-path-svg"
            viewBox={`0 0 ${VW} ${TOTAL_H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ height: TOTAL_H }}
          >
            {/* ظل المسار */}
            <path d={PATH_D} stroke="rgba(0,0,0,.45)" strokeWidth={88} strokeLinecap="round" fill="none"/>
            {/* قاعدة داكنة */}
            <path d={PATH_D} stroke="#1e0a4a" strokeWidth={74} strokeLinecap="round" fill="none"/>
            {/* مقاطع ملونة */}
            {SEGMENTS.map((seg, i) => (
              <path key={i} d={seg.d} stroke={seg.color} strokeWidth={58} strokeLinecap="round" fill="none" opacity=".82"/>
            ))}
            {/* وميض مركزي */}
            <path d={PATH_D} stroke="rgba(255,255,255,.14)" strokeWidth={18} strokeLinecap="round" fill="none" strokeDasharray="1 52"/>
            {/* حافة لامعة */}
            <path d={PATH_D} stroke="rgba(255,255,255,.2)" strokeWidth={2.5} strokeLinecap="round" fill="none" strokeDasharray="30 22"/>
            {/* نقاط وسيطة */}
            {DOTS.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={i % 3 === 0 ? 7 : 5}
                fill={SEG_COLORS[Math.floor(i / 4) % SEG_COLORS.length]} opacity=".6"/>
            ))}
          </svg>

          {/* البطاقات */}
          {RESOURCES.map((r, i) => {
            const meta         = cardMeta[r.key] || {};
            const displayTitle = meta.title       || r.title;
            const displayDesc  = meta.description || r.desc;
            const displayImg   = meta.image_url   || null;
            const displayIcon  = displayImg ? null : (meta.icon || r.icon);
            const tagStyle     = TAG_COLORS[r.tag] ?? { bg: '#f1f5f9', color: '#475569' };
            const pos          = ALL_POS[i];
            const topPx        = TOP0 + i * VGAP;

            /* حلقة نبض للبطاقات الجاهزة */
            const showPing = r.ready && (i < 3 || i === 7);

            const cardInner = (
              <>
                {showPing && (
                  <div className="lib-ping" style={{
                    width: 185, height: 185, top: -5, left: -5,
                    border: `2.5px solid ${r.accent}55`,
                    animationDelay: `${i * 0.3}s`,
                  }}/>
                )}
                {/* زجاجية الشبح */}
                <div className="lib-glow-ring" style={{
                  background: `radial-gradient(ellipse at center, ${r.accent}25, transparent 70%)`,
                  boxShadow: `0 0 28px ${r.accent}55`,
                }}/>

                {/* أيقونة تعديل للمعلم */}
                {isTeacher && (
                  <button
                    className="lib-edit-btn"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); openEdit(r); }}
                    title="تعديل البطاقة"
                  >✏️</button>
                )}

                {/* وسم المستوى */}
                <span className="lib-tag" style={{ background: tagStyle.bg, color: tagStyle.color }}>
                  {r.tag}
                </span>

                {/* الأيقونة */}
                <div className="lib-icon-wrap" style={{ background: r.iconBg, marginTop: 14 }}>
                  {displayImg
                    ? <img src={displayImg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : displayIcon
                  }
                </div>

                {/* العنوان */}
                <p className="lib-card-title">{displayTitle}</p>

                {/* الوصف */}
                <p className="lib-card-desc">{displayDesc}</p>

                {/* زر الانطلاق */}
                {r.ready
                  ? <span className="lib-start-btn" style={{ background: r.btnBg }}>ابدأ الآن ←</span>
                  : <span className="lib-coming-badge">قريباً…</span>
                }
              </>
            );

            return (
              <div
                key={r.key}
                className="lib-node"
                style={{
                  top: topPx,
                  left: `${XPCTS[i]}%`,
                  animationDelay: `${i * 0.055}s`,
                }}
              >
                {r.ready ? (
                  <Link
                    href={r.link}
                    className="lib-node-inner"
                    style={{ background: r.bg, borderColor: r.border, boxShadow: `0 6px 24px ${r.accent}22` }}
                  >
                    {cardInner}
                  </Link>
                ) : (
                  <div
                    className="lib-node-inner coming"
                    style={{ background: r.bg, borderColor: r.border }}
                  >
                    {cardInner}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* مسافة سفلية */}
        <div style={{ height: 40 }} />
      </div>

      {/* ═══════════════════════════════════════════
          نافذة تعديل بطاقة — محفوظة كاملاً للمعلمين
      ═══════════════════════════════════════════ */}
      {isTeacher && editing && editingResource && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}
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
              title="انقر لتغيير الصورة"
              style={{ width:90, height:90, borderRadius:18, margin:'0 auto 16px', background:editingResource.iconBg, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', border:'2px dashed #e5e7eb', fontSize:'2.8rem', boxShadow:'0 4px 14px rgba(0,0,0,.1)' }}
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
                <input value={editImg ? '' : editIcon} onChange={e => { setEditIcon(e.target.value); setEditImg(null); }} disabled={!!editImg} placeholder="🎯" maxLength={2}
                  style={{ width:56, textAlign:'center', fontSize:'1.5rem', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'6px', fontFamily:'inherit', background:editImg?'#f3f4f6':'#fff' }} />
                <input value={editImg ? '' : editIcon} onChange={e => { setEditIcon(e.target.value); setEditImg(null); }} disabled={!!editImg} placeholder="أو اكتب أي نص"
                  style={{ flex:1, border:'1.5px solid #e5e7eb', borderRadius:10, padding:'8px 12px', fontFamily:'inherit', fontSize:'.9rem', direction:'rtl', background:editImg?'#f3f4f6':'#fff' }} />
              </div>
              {editImg && <span style={{ fontSize:'.75rem', color:'#9ca3af' }}>الأيقونة معطّلة — الصورة تحل محلها</span>}
            </label>

            <label style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
              <span style={{ fontWeight:700, color:'#374151', fontSize:'.85rem' }}>عنوان النشاط</span>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                style={{ border:'1.5px solid #e5e7eb', borderRadius:10, padding:'8px 12px', fontFamily:'inherit', fontSize:'.95rem', direction:'rtl' }} />
            </label>

            <label style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:18 }}>
              <span style={{ fontWeight:700, color:'#374151', fontSize:'.85rem' }}>الوصف</span>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                style={{ border:'1.5px solid #e5e7eb', borderRadius:10, padding:'8px 12px', fontFamily:'inherit', fontSize:'.88rem', direction:'rtl', resize:'vertical' }} />
            </label>

            {msg && (
              <div style={{ marginBottom:12, padding:'8px 12px', borderRadius:8, fontSize:'.85rem', fontWeight:700, background:msg.ok?'#d4edda':'#f8d7da', color:msg.ok?'#155724':'#721c24' }}>
                {msg.text}
              </div>
            )}

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
