'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { resizeImageToWebp } from '../../lib/image-resize';
import { libraryOverview } from '../../lib/library-progress';
import useLibraryProgress from './useLibraryProgress';
import ActivityProgress from './ActivityProgress';
import StoriesShelf from './stories-preview/StoriesPreview';

const RESOURCES = [
  {
    key: 'scrabble', icon: '🧩', title: 'سكرابل الصغار',
    desc: 'أضف الحروف واكتشف الكلمات المتقاطعة!',
    tag: 'تعزيزي', link: '/library/games/scrabble', ready: true,
    accent: '#7C5CD9', dark: '#6141AF', rot: 2, bg: '#F4EEFC', border: '#D7C7F0', iconBg: '#E9DFF7',
    btnBg: 'linear-gradient(135deg,#7C5CD9,#6141AF)',
  },
  {
    key: 'huroof',
    icon: '🔤', title: 'الحروف الهجائية',
    desc: 'تعلّم الحروف بأشكالها مع أصوات وأمثلة مشوّقة!',
    tag: 'مستوى 1', link: '/library/huroof', ready: true,
    accent: '#3B82F6', dark: '#1D4ED8', rot: -4, bg: '#EFF6FF', border: '#BFDBFE', iconBg: '#DBEAFE',
    btnBg: 'linear-gradient(135deg,#3B82F6,#2563EB)',
  },
  {
    key: 'vowel-balloon',
    icon: '🔊', title: 'الحركات والتشكيل',
    desc: 'اكتشف الفتحة والكسرة والضمة مع أمثلة صوتية!',
    tag: 'مستوى 1', link: '/library/games/vowel-balloon', ready: true,
    accent: '#8B5CF6', dark: '#6D28D9', rot: 3, bg: '#F5F3FF', border: '#DDD6FE', iconBg: '#EDE9FE',
    btnBg: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
  },
  {
    key: 'reading',
    icon: '📖', title: 'القراءة المقطعية',
    desc: 'قطّع الكلمات وتعلّم القراءة خطوة بخطوة!',
    tag: 'مستوى 1', link: '#', ready: false,
    accent: '#10B981', dark: '#047857', rot: -3, bg: '#ECFDF5', border: '#A7F3D0', iconBg: '#D1FAE5',
  },
  {
    key: 'writing',
    icon: '✍️', title: 'الكتابة الصحيحة',
    desc: 'تدرّب على الكتابة الصحيحة وصحّح أخطاءك!',
    tag: 'مستوى 2', link: '#', ready: false,
    accent: '#F97316', dark: '#C2410C', rot: 4, bg: '#FFF7ED', border: '#FED7AA', iconBg: '#FFEDD5',
  },
  {
    key: 'listening',
    icon: '👂', title: 'الاستماع والفهم',
    desc: 'استمع وافهم — نصوص صوتية تنمّي مهاراتك!',
    tag: 'مستوى 2', link: '#', ready: false,
    accent: '#F59E0B', dark: '#B45309', rot: -2, bg: '#FFFBEB', border: '#FDE68A', iconBg: '#FEF3C7',
  },
  {
    key: 'speaking',
    icon: '💬', title: 'التعبير الشفهي',
    desc: 'تحدّث بثقة — حوارات تنمّي لغتك العربية!',
    tag: 'مستوى 3', link: '#', ready: false,
    accent: '#EC4899', dark: '#BE185D', rot: 3, bg: '#FDF2F8', border: '#FBCFE8', iconBg: '#FCE7F3',
  },
  {
    key: 'literature',
    icon: '📝', title: 'مشهدٌ وحكاية',
    desc: 'انظر إلى الصورة وتخيّل… ثم احكِ حكايتها بالكتابة أو بصوتك!',
    tag: 'تعبيري', link: '/library/scenes', ready: true,
    accent: '#14B8A6', dark: '#0F766E', rot: -4, bg: '#F0FDFA', border: '#99F6E4', iconBg: '#CCFBF1',
    btnBg: 'linear-gradient(135deg,#14B8A6,#0F766E)',
  },
  {
    key: 'letter-catcher',
    icon: '🎮', title: 'صيّاد الحروف',
    desc: 'أوجد الحرف الناقص — هل أنت صيّاد ماهر؟',
    tag: 'تعزيزي', link: '/library/games/letter-catcher', ready: true,
    accent: '#6366F1', dark: '#4338CA', rot: 3, bg: '#EEF2FF', border: '#C7D2FE', iconBg: '#E0E7FF',
    btnBg: 'linear-gradient(135deg,#6366F1,#4F46E5)',
  },
  {
    key: 'word-scramble',
    icon: '🔀', title: 'رتّب الكلمة',
    desc: 'رتّب الحروف المبعثرة لتكوّن كلمة صحيحة!',
    tag: 'تعزيزي', link: '/library/games/word-scramble', ready: true,
    accent: '#EF4444', dark: '#B91C1C', rot: -4, bg: '#FEF2F2', border: '#FECACA', iconBg: '#FEE2E2',
    btnBg: 'linear-gradient(135deg,#EF4444,#DC2626)',
  },
  {
    key: 'word-image-match',
    icon: '🖼️', title: 'صِل الكلمة بصورتها',
    desc: 'وصّل كل كلمة بصورتها — لعبة بصرية رائعة!',
    tag: 'تعزيزي', link: '/library/games/word-image-match', ready: true,
    accent: '#06B6D4', dark: '#0E7490', rot: 2, bg: '#ECFEFF', border: '#A5F3FC', iconBg: '#CFFAFE',
    btnBg: 'linear-gradient(135deg,#06B6D4,#0891B2)',
  },
  {
    key: 'word-smash',
    icon: '🔨', title: 'مطرقة التفكيك',
    desc: 'فكّك الكلمة إلى مقاطعها — اضرب الإجابة الصحيحة!',
    tag: 'تعزيزي', link: '/library/games/word-smash', ready: true,
    accent: '#84CC16', dark: '#4D7C0F', rot: -3, bg: '#F7FEE7', border: '#BEF264', iconBg: '#ECFCCB',
    btnBg: 'linear-gradient(135deg,#84CC16,#65A30D)',
  },
  {
    key: 'word-wheel',
    icon: '🎡', title: 'عجلة الكلمات',
    desc: 'كوّن كلمات من حروف العجلة — الحرف الأوسط إلزامي!',
    tag: 'تعزيزي', link: '/library/games/word-wheel', ready: true,
    accent: '#F59E0B', dark: '#B45309', rot: 4, bg: '#FFFBEB', border: '#FDE68A', iconBg: '#FEF3C7',
    btnBg: 'linear-gradient(135deg,#F59E0B,#D97706)',
  },
  {
    key: 'puzzle',
    icon: '🧩', title: 'الأحجية السحرية',
    desc: 'اجمع نقاطاً من الألعاب واكتشف الصورة المخفية قطعةً قطعة!',
    tag: 'تعزيزي', link: '/library/puzzle', ready: true,
    accent: '#A855F7', dark: '#7E22CE', rot: -2, bg: '#FAF5FF', border: '#E9D5FF', iconBg: '#F3E8FF',
    btnBg: 'linear-gradient(135deg,#A855F7,#9333EA)',
  },
  {
    key: 'challenge',
    icon: '⚡', title: 'وضع التحدي',
    desc: 'تحدّى صديقك في الوقت الحقيقي — من يجيب أولاً يفوز!',
    tag: 'تعزيزي', link: '/library/games/challenge', ready: true,
    accent: '#6366F1', dark: '#4338CA', rot: 3, bg: '#EEF2FF', border: '#C7D2FE', iconBg: '#E0E7FF',
    btnBg: 'linear-gradient(135deg,#6366F1,#4F46E5)',
  },
  {
    key: 'flashcards',
    icon: '🃏', title: 'بطاقات الحفظ',
    desc: 'راجع مفرداتك يومياً — الكلمات الصعبة تعود تلقائياً!',
    tag: 'تعزيزي', link: '/library/flashcards', ready: true,
    accent: '#312E81', dark: '#1E1B4B', rot: -3, bg: '#EEF2FF', border: '#A5B4FC', iconBg: '#E0E7FF',
    btnBg: 'linear-gradient(135deg,#312E81,#4338CA)',
  },
  {
    key: 'discover-objects',
    icon: '🔎', title: 'أكتشف الأشياء',
    desc: 'حلّ ألغاز فهيم، واكتشف الأشياء، وركّب كلماتها وافهم جملها!',
    tag: 'اكتشافي', link: '/library/discover-objects', ready: true,
    accent: '#7C5CD9', dark: '#6141AF', rot: -3, bg: '#F4EEFC', border: '#D7C7F0', iconBg: '#E9DFF7',
    btnBg: 'linear-gradient(135deg,#7C5CD9,#6141AF)',
  },
];

/* STORIES loaded dynamically from DB — see initialStories prop */

/* صورة البطاقة تُصغَّر في المتصفح (تُعرض بحجم ~100px) ثم تُرسل كـdata URL صغير؛
   الخادم يرفعها إلى Storage ويحفظ رابطها فقط (lib/library-card-image.js) */
async function cardImageToDataUrl(file) {
  const blob = await resizeImageToWebp(file, 320);
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export default function LibraryGrid({ initialMeta, isTeacher, initialStories, ownerId }) {
  const stories = initialStories || [];
  const [cardMeta,      setCardMeta]      = useState(initialMeta || {});
  const [editing,       setEditing]       = useState(null);
  const [editIcon,      setEditIcon]      = useState('');
  const [editImg,       setEditImg]       = useState(null);
  const [editTitle,     setEditTitle]     = useState('');
  const [editDesc,      setEditDesc]      = useState('');
  const [saving,        setSaving]        = useState(false);
  const [msg,           setMsg]           = useState(null);
  const [bannerDismiss, setBannerDismiss] = useState(false);
  const [selectedKey,   setSelectedKey]   = useState(null);
  const fileRef    = useRef();

  const { progress: activityProgress, ready: progressReady, preview, error: progressError, refresh } = useLibraryProgress(isTeacher);
  const overview = libraryOverview(RESOURCES, activityProgress);
  const completedKeys = new Set(RESOURCES.filter(r => activityProgress[r.key]?.status === 'completed').map(r => r.key));
  const hasAnyProgress = overview.hasProgress;
  const nextActivity = !preview && progressReady ? overview.next : null;
  const continuingNext = nextActivity && ['in-progress', 'practiced'].includes(activityProgress[nextActivity.key]?.status);
  const replayNext = nextActivity && activityProgress[nextActivity.key]?.status === 'completed';
  const hasProgressError = !!progressError || Object.values(activityProgress).some(p => p.status === 'unknown');

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
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error);
      setCardMeta(prev => ({ ...prev, [editing]: json.card }));
      setMsg({ ok: true, text: '✅ تم الحفظ بنجاح' });
      setTimeout(closeEdit, 800);
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message || 'فشل الحفظ'}` });
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

  const editingResource  = RESOURCES.find(r => r.key === editing);
  const selectedResource = RESOURCES.find(r => r.key === selectedKey);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .lib-journey-summary { margin:0 0 22px; padding:16px; border:1px solid #E8B84B; border-radius:18px; background:#FAF7F1; color:#1A2B4A; }
        .lib-journey-summary>strong { display:block; font-size:.95rem; margin-bottom:10px; }
        .lib-journey-counts { display:flex; flex-wrap:wrap; gap:8px; font-size:.8rem; }
        .lib-journey-counts>span { background:#fff; padding:7px 10px; border-radius:10px; }
        .lib-journey-error { margin:12px 0 0; font-size:.85rem; line-height:1.8; }
        .lib-journey-error button { min-height:44px; margin-inline-start:8px; padding:6px 12px; border:1px solid #7C5CD9; border-radius:10px; background:#fff; color:#1A2B4A; font:inherit; font-weight:700; cursor:pointer; }
        .lib-activity-progress { display:flex; flex-direction:column; align-items:center; gap:6px; width:100%; max-width:240px; color:#1A2B4A; font-size:.76rem; line-height:1.6; font-weight:700; }
        .lib-activity-progress.in-progress { color:#6141AF; }
        .lib-activity-progress.completed { color:#1A2B4A; }
        .lib-activity-progress.loading,.lib-activity-progress.unknown,.lib-activity-progress.unavailable { color:#64748b; }
        .lib-activity-meter { display:block; width:100%; max-width:140px; height:6px; border-radius:99px; overflow:hidden; background:#E9DFF7; }
        .lib-activity-meter>span { display:block; height:100%; background:#7C5CD9; border-radius:inherit; }
        .lib-activity-progress.completed .lib-activity-meter>span { background:#2ABB7A; }
        .lib-activity-detail { font-weight:500; font-size:.88rem; }
        .sg-sheet .lib-activity-progress { padding:12px; border-radius:14px; background:#FAF7F1; max-width:100%; box-sizing:border-box; }
        .lib-journey-error button:focus-visible { outline:3px solid #E8B84B; outline-offset:3px; }
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
        @keyframes libFaheemFloat {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-8px); }
        }

        .lib-page {
          direction:rtl; font-family:inherit;
          background-color:#FAF7F2;
          background-image: radial-gradient(#E8B84B2e 1.6px, transparent 1.6px);
          background-size: 22px 22px;
        }

        /* ── هيدر ── */
        .lib-header { text-align:center; margin-bottom:18px; }
        .lib-header h1 {
          font-size:1.75rem; font-weight:900; margin:0;
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

        /* ── الشبكة — دائماً عمودان جنباً إلى جنب ── */
        .lib-grid {
          display:grid;
          grid-template-columns:repeat(2, 1fr);
          gap:16px;
        }
        @media (max-width:600px) {
          .lib-grid { gap:10px; }
          .lib-header h1 { font-size:1.3rem; }
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

        /* ── زر تعديل المعلم ── */
        .lib-edit-btn {
          position:absolute; top:10px; left:10px;
          background:rgba(255,255,255,.92); border:none; border-radius:8px;
          width:28px; height:28px; cursor:pointer; font-size:.82rem;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,.15); opacity:0;
          transition:opacity .18s; z-index:3;
        }
        /* ══════════════════════════════════════════
           شبكة بسيطة + نافذة تفاصيل عند الضغط — العرض الافتراضي الجديد
        ══════════════════════════════════════════ */
        @keyframes sgSheetUp { from { transform:translateY(24px); opacity:.4; } to { transform:translateY(0); opacity:1; } }
        @keyframes sgFade    { from { opacity:0; } to { opacity:1; } }

        /* ── بطاقة بسيطة: صورة وعنوان فقط — أسلوب "ملصق مرح" ── */
        .sg-card {
          all:unset; cursor:pointer; box-sizing:border-box;
          border-radius:16px; padding:16px 8px 12px;
          display:flex; flex-direction:column; align-items:center; text-align:center; gap:9px;
          position:relative;
          transition:transform .15s;
        }
        .sg-card:active { transform:scale(.96); }
        .sg-card-icon {
          position:relative; width:56px; height:56px; border-radius:20px;
          border:3.5px solid #fff; box-sizing:border-box;
          display:flex; align-items:center; justify-content:center; font-size:1.65rem;
        }
        .sg-card-title { font-size:.78rem; font-weight:800; color:#1e293b; line-height:1.3; }
        .sg-card-lock {
          position:absolute; bottom:-6px; left:-6px; width:19px; height:19px; border-radius:50%;
          background:#fff; border:2px solid #e2e8f0; display:flex; align-items:center; justify-content:center; font-size:.56rem;
          box-shadow:0 2px 4px rgba(0,0,0,.12);
        }
        .sg-card:hover .lib-edit-btn { opacity:1; }

        /* ── نافذة التفاصيل عند الضغط ── */
        .sg-overlay {
          position:fixed; inset:0; background:rgba(15,23,42,.55); z-index:200;
          display:flex; align-items:flex-end; justify-content:center;
          animation:sgFade .2s ease-out;
        }
        .sg-sheet {
          background:#fff; width:100%; max-width:480px; border-radius:26px 26px 0 0;
          padding:20px 20px calc(30px + env(safe-area-inset-bottom, 0px)); box-shadow:0 -10px 40px rgba(0,0,0,.3);
          animation:sgSheetUp .22s ease-out; box-sizing:border-box; direction:rtl;
        }
        .sg-sheet-top { display:flex; justify-content:flex-end; margin-bottom:-6px; }
        .sg-sheet-close {
          background:#f1f5f9; border:none; border-radius:50%;
          width:32px; height:32px; cursor:pointer; font-size:1rem; color:#64748b;
          display:flex; align-items:center; justify-content:center;
        }
        .sg-sheet-body { display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; }
        .sg-sheet-icon {
          width:88px; height:88px; border-radius:28px;
          border:4px solid #fff; box-sizing:border-box;
          display:flex; align-items:center; justify-content:center; font-size:2.6rem;
        }
        .sg-sheet-tag   { background:#f1f5f9; color:#475569; border-radius:50px; padding:4px 13px; font-size:.7rem; font-weight:800; }
        .sg-sheet-title { font-size:1.05rem; font-weight:900; color:#1e293b; margin:0; }
        .sg-sheet-desc  { font-size:.8rem; color:#64748b; line-height:1.7; padding:0 4px; margin:0; }
        .sg-sheet-actions { margin-top:20px; }
        .sg-sheet-cta {
          display:flex; align-items:center; justify-content:center; gap:6px;
          border-radius:50px; padding:13px; color:#fff; font-size:.9rem; font-weight:800;
          text-decoration:none; border:none; cursor:pointer; font-family:inherit;
        }
        .sg-sheet-locked {
          display:flex; align-items:center; justify-content:center; gap:6px;
          border-radius:50px; padding:13px; color:#94a3b8; font-size:.85rem; font-weight:800;
          background:#f8fafc; border:2px dashed #cbd5e1;
        }
        .sg-sheet-edit {
          display:flex; align-items:center; justify-content:center; gap:6px; width:100%;
          border-radius:50px; padding:11px; color:#5b4fc4; font-size:.82rem; font-weight:700;
          background:#f5f3ff; border:1.5px solid #ddd6fe; cursor:pointer; font-family:inherit;
          margin-top:10px; box-sizing:border-box;
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

        /* صورة الغلاف التي يرفعها المعلم من محرر القصص — تحل محل الأيقونة */
        .story-card.has-cover { width:156px; padding:10px 10px 14px; }
        .story-cover {
          width:100%; aspect-ratio:3 / 4; border-radius:12px; overflow:hidden;
          background:#fff; box-shadow:0 3px 10px rgba(0,0,0,.15);
        }
        .story-cover img { width:100%; height:100%; object-fit:cover; display:block; }
        .story-card.has-cover .story-title { font-size:.9rem; }
        .story-card .story-read-btn { margin-top:auto; }
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
      ` }} />

      <div className="lib-page">

        {/* ── هيدر ── */}
        <div className="lib-header">
          <h1>🌟 اختر نشاطك وابدأ الرحلة</h1>
        </div>

        {/* ── بنر الاستمرار / البداية ── */}
        {!isTeacher && nextActivity && !bannerDismiss && (() => {
          const meta = cardMeta[nextActivity.key] || {};
          const icon = meta.image_url ? '🖼️' : (meta.icon || nextActivity.icon);
          const title = meta.title || nextActivity.title;
          return (
            <div className="lib-banner">
              <div className="lib-banner-text">
                <p className="lib-banner-title">
                  {continuingNext ? '👋 أكمل مغامرتك!' : replayNext ? '🌟 أحسنت! استمتع بمغامراتك مجدّدًا' : hasAnyProgress ? '✨ مغامرة جديدة تنتظرك!' : '🚀 ابدأ رحلتك من هنا!'}
                </p>
                <p className="lib-banner-sub">{title}{continuingNext && ` · ${activityProgress[nextActivity.key].label}`}</p>
              </div>
              <Link href={nextActivity.link} className="lib-banner-btn">
                {continuingNext ? 'أكمل رحلتك ←' : replayNext ? 'ألعب مجدّدًا ←' : 'ابدأ الآن ←'}
              </Link>
              <button className="lib-banner-close" onClick={() => setBannerDismiss(true)}>✕</button>
            </div>
          );
        })()}

        {/* ── فهيم يرافقك في المكتبة ── */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 24px' }}>
          <img
            src="/faheem-tablet-sm.webp"
            alt="فَهِيمٌ"
            width={648} height={729}
            style={{
              height: 152, width: 'auto',
              filter: 'drop-shadow(0 10px 18px rgba(26,43,74,.22))',
              animation: 'libFaheemFloat 3.2s ease-in-out infinite',
            }}
          />
        </div>

        {!isTeacher && !preview && <section className="lib-journey-summary" aria-label="ملخّص رحلتك">
          <strong>✦ رحلتك خطوة بخطوة</strong>
          {!progressReady ? <p role="status">نجهّز إنجازاتك…</p> : !hasProgressError && <div className="lib-journey-counts"><span>✓ {overview.completed} مكتمل</span><span>✦ {overview.continuing} قيد التعلّم</span><span>↻ {overview.practiced} تدرّبت فيه</span></div>}
          {hasProgressError && <p className="lib-journey-error" role="status">{progressError || 'بعض إنجازاتك لم تظهر بعد. إنجازاتك محفوظة.'}<button type="button" onClick={refresh}>أعد المحاولة</button></p>}
        </section>}

        {/* ── الشبكة / مروحة البطاقات ── */}
        {(() => {
          /* بطاقة بسيطة: صورة وعنوان فقط — الضغط عليها يفتح نافذة التفاصيل */
          const renderSimpleCard = (r) => {
            const meta         = cardMeta[r.key] || {};
            const displayTitle = meta.title     || r.title;
            const displayImg   = meta.image_url || null;
            const displayIcon  = displayImg ? null : (meta.icon || r.icon);
            const done         = completedKeys.has(r.key);
            return (
              <button key={r.key} type="button" className="sg-card" onClick={() => setSelectedKey(r.key)}>
                {isTeacher && (
                  <button className="lib-edit-btn"
                    onClick={e => { e.stopPropagation(); openEdit(r); }}
                    title="تعديل البطاقة">✏️</button>
                )}
                <div className="sg-card-icon" style={{
                  background: r.accent,
                  boxShadow: done ? '0 0 0 2.5px #22c55e, 0 0 0 5px rgba(34,197,94,.12)' : `0 0 0 2px ${r.accent}, 3px 4px 0 ${r.dark}`,
                  transform: `rotate(${r.rot}deg)`,
                }}>
                  <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', transform:`rotate(${-r.rot}deg)` }}>
                    {displayImg
                      ? <img src={displayImg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:16 }}/>
                      : <span style={{ filter:r.ready?'none':'grayscale(1) brightness(.7)' }}>{displayIcon}</span>
                    }
                  </span>
                  {done && <span className="lib-done-badge">✓</span>}
                  {!r.ready && <span className="sg-card-lock">🔒</span>}
                </div>
                <span className="sg-card-title">{displayTitle}</span>
                {r.ready && !isTeacher && !preview && <ActivityProgress progress={activityProgress[r.key]} ready={progressReady} />}
              </button>
            );
          };

          /* شبكة واحدة مسطّحة — بلا تقسيم مستويات وبلا أي وصف على البطاقة نفسها */
          return (
            <div className="lib-grid" id="lib-activities-grid">
              {RESOURCES.map(renderSimpleCard)}
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════
            قسم القصص والحكايات
        ══════════════════════════════════════════════ */}
        <StoriesShelf stories={stories} ownerId={ownerId} embedded />
        {/* نهاية قسم القصص */}

      </div>

      {/* ══════════════════════════════════════════════
          نافذة تفاصيل النشاط — تظهر عند الضغط على أي بطاقة
      ══════════════════════════════════════════════ */}
      {selectedResource && (() => {
        const r            = selectedResource;
        const meta         = cardMeta[r.key] || {};
        const displayTitle = meta.title       || r.title;
        const displayDesc  = meta.description || r.desc;
        const displayImg   = meta.image_url   || null;
        const displayIcon  = displayImg ? null : (meta.icon || r.icon);
        const done         = completedKeys.has(r.key);
        const started      = ['in-progress', 'practiced'].includes(activityProgress[r.key]?.status);
        const ctaLabel     = r.tag === 'تعزيزي' ? '🎮 ابدأ اللعب الآن ←' : '📖 ابدأ التعلّم الآن ←';
        const closeSheet   = () => setSelectedKey(null);
        return (
          <div className="sg-overlay" onClick={closeSheet}>
            <div className="sg-sheet" onClick={e => e.stopPropagation()}>
              <div className="sg-sheet-top">
                <button className="sg-sheet-close" onClick={closeSheet}>✕</button>
              </div>
              <div className="sg-sheet-body">
                <div className="sg-sheet-icon" style={{
                  background: r.accent,
                  boxShadow: `0 0 0 2.5px ${r.accent}, 4px 5px 0 ${r.dark}`,
                }}>
                  {displayImg
                    ? <img src={displayImg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:24 }}/>
                    : <span style={{ filter:r.ready?'none':'grayscale(1) brightness(.7)' }}>{displayIcon}</span>
                  }
                </div>
                <span className="sg-sheet-tag">{r.tag}</span>
                <p className="sg-sheet-title">{displayTitle}</p>
                <p className="sg-sheet-desc">{displayDesc}</p>
                {r.ready && !isTeacher && !preview && <ActivityProgress progress={activityProgress[r.key]} ready={progressReady} detail />}
              </div>
              <div className="sg-sheet-actions">
                {r.ready
                  ? done
                    ? <Link href={r.link} className="sg-sheet-cta" style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)' }}>✓ العب مجدداً</Link>
                    : <Link href={r.link} className="sg-sheet-cta" style={{ background:r.btnBg }}>{started ? '✨ أكمل رحلتك ←' : ctaLabel}</Link>
                  : <div className="sg-sheet-locked">🔒 سيكون هذا النشاط متاحاً قريباً</div>
                }
                {isTeacher && (
                  <button className="sg-sheet-edit" onClick={() => { closeSheet(); openEdit(r); }}>
                    ✏️ تعديل هذه البطاقة
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
                const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
                try {
                  const small = await cardImageToDataUrl(f);
                  setEditImg(small); setEditIcon('');
                } catch (err) {
                  setMsg({ ok: false, text: `❌ ${err.message || 'تعذّر تجهيز الصورة'}` });
                }
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

            {editing === 'huroof' && (
              <Link href="/library/huroof"
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, minHeight:46, marginBottom:16, borderRadius:12, border:'2px dashed #E8B84B', background:'#FFFBEB', color:'#1A2B4A', fontWeight:800, fontSize:'.86rem', textDecoration:'none', textAlign:'center', padding:'8px 12px' }}
              >🔤 تعديل محتوى الحروف: صورة كل حرف وصوته وجملته ←</Link>
            )}

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
