'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ══════════════════════════════════════════════════════
   Constants
══════════════════════════════════════════════════════ */
const LEVEL_LABELS = ['جديدة','مبتدئ','أساسي','متوسط','متقدم','محفوظة ✨'];
const LEVEL_COLORS = ['#94a3b8','#f87171','#fbbf24','#6366f1','#0284c7','#059669'];

const ACTIVITY_META = [
  { key: 'huroof',           name: 'الحروف',     icon: '🔤', href: '/library/huroof' },
  { key: 'vowel-balloon',    name: 'الحركات',    icon: '🎈', href: '/library/games/vowel-balloon' },
  { key: 'letter-catcher',   name: 'صيّاد',      icon: '🎯', href: '/library/games/letter-catcher' },
  { key: 'word-scramble',    name: 'رتّب',       icon: '🔀', href: '/library/games/word-scramble' },
  { key: 'word-image-match', name: 'صِل',        icon: '🖼️', href: '/library/games/word-image-match' },
  { key: 'word-smash',       name: 'مطرقة',      icon: '🔨', href: '/library/games/word-smash' },
  { key: 'word-wheel',       name: 'عجلة',       icon: '🎡', href: '/library/games/word-wheel' },
  { key: 'flashcards',       name: 'بطاقات',     icon: '🃏', href: '/library/flashcards' },
  { key: 'puzzle',           name: 'الأحجية',    icon: '🧩', href: '/library/puzzle' },
  { key: 'challenge',        name: 'التحدي',     icon: '⚡', href: '/library/games/challenge' },
];

const PTS_LEVELS = [
  { min: 0,    color: '#D97706', icon: '🌱', name: 'مبتدئ'  },
  { min: 1000, color: '#94A3B8', icon: '⚡', name: 'مستكشف' },
  { min: 2000, color: '#F59E0B', icon: '⭐', name: 'بطل'    },
  { min: 3000, color: '#A78BFA', icon: '💎', name: 'محترف'  },
  { min: 4000, color: '#22D3EE', icon: '🚀', name: 'أسطورة' },
];

const BADGES = [
  { id: 'pts_100',   icon: '💫', name: '١٠٠ نقطة',     desc: 'جمعت أول ١٠٠ نقطة!',             cat: 'نقاط',   color: '#F59E0B' },
  { id: 'pts_500',   icon: '⭐', name: '٥٠٠ نقطة',     desc: 'نجم صاعد! ٥٠٠ نقطة!',            cat: 'نقاط',   color: '#F59E0B' },
  { id: 'pts_1000',  icon: '🌟', name: 'ألف نقطة',     desc: 'بلغت ١٠٠٠ نقطة!',                cat: 'نقاط',   color: '#F59E0B' },
  { id: 'pts_3000',  icon: '🏆', name: 'بطل النقاط',   desc: '٣٠٠٠ نقطة! أنت أسطورة!',          cat: 'نقاط',   color: '#F59E0B' },
  { id: 'fc_first',  icon: '🃏', name: 'بداية الرحلة', desc: 'بدأت بطاقات الحفظ!',              cat: 'بطاقات', color: '#059669' },
  { id: 'fc_10',     icon: '📖', name: '١٠ كلمات',     desc: 'حفظت ١٠ كلمات!',                 cat: 'بطاقات', color: '#059669' },
  { id: 'fc_50',     icon: '📚', name: '٥٠ كلمة',      desc: 'حفظت ٥٠ كلمة! مميز!',            cat: 'بطاقات', color: '#059669' },
  { id: 'fc_100',    icon: '🎓', name: 'مئة كلمة',     desc: 'حفظت ١٠٠ كلمة! رائع!',           cat: 'بطاقات', color: '#059669' },
  { id: 'streak_3',  icon: '🔥', name: '٣ أيام',       desc: '٣ أيام متواصلة!',                 cat: 'انتظام', color: '#DC2626' },
  { id: 'streak_7',  icon: '💪', name: 'أسبوع كامل',   desc: 'أسبوع متواصل! واصل!',             cat: 'انتظام', color: '#DC2626' },
  { id: 'streak_30', icon: '👑', name: 'شهر متواصل',   desc: 'بطل المثابرة! ٣٠ يوماً!',         cat: 'انتظام', color: '#DC2626' },
  { id: 'act_1',     icon: '🌱', name: 'أول خطوة',     desc: 'أتممت نشاطاً!',                   cat: 'أنشطة',  color: '#6366F1' },
  { id: 'act_5',     icon: '🎯', name: '٥ أنشطة',      desc: 'أتممت ٥ أنشطة مختلفة!',           cat: 'أنشطة',  color: '#6366F1' },
  { id: 'act_all',   icon: '🌈', name: 'مستكشف شامل',  desc: 'جربت جميع الأنشطة العشرة!',       cat: 'أنشطة',  color: '#6366F1' },
  { id: 'acc_80',    icon: '🎖️', name: 'دقة عالية',    desc: 'دقة إجابات ٨٠٪ أو أكثر!',         cat: 'دقة',    color: '#0EA5E9' },
  { id: 'acc_90',    icon: '💎', name: 'شبه مثالي',    desc: 'دقة إجابات ٩٠٪ أو أكثر!',         cat: 'دقة',    color: '#0EA5E9' },
];

const BADGE_CATS = [
  { key: 'نقاط',   label: '⭐ النقاط'       },
  { key: 'بطاقات', label: '🃏 بطاقات الحفظ' },
  { key: 'انتظام', label: '🔥 الانتظام'     },
  { key: 'أنشطة',  label: '🎮 الأنشطة'     },
  { key: 'دقة',    label: '🎯 الدقة'        },
];

/* ══════════════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════════════ */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const sec = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (sec < 60)     return 'الآن';
  if (sec < 3600)   return `منذ ${Math.floor(sec / 60)} د`;
  if (sec < 86400)  return `منذ ${Math.floor(sec / 3600)} س`;
  if (sec < 172800) return 'الأمس';
  return `قبل ${Math.floor(sec / 86400)} أيام`;
}

/* ══════════════════════════════════════════════════════
   Reusable sub-components
══════════════════════════════════════════════════════ */
const CARD_STYLE = {
  background: 'white',
  borderRadius: 20,
  padding: '20px 22px',
  boxShadow: '0 2px 16px rgba(0,0,0,.06)',
};

function SectionTitle({ icon, title }) {
  return (
    <div style={{
      fontSize: '.82rem', fontWeight: 700, color: '#94a3b8',
      marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7,
    }}>
      <span style={{ fontSize: '.95rem' }}>{icon}</span>
      {title}
    </div>
  );
}

function StatCard({ icon, iconBg, value, label, sub, subColor = '#059669' }) {
  return (
    <div style={{
      background: 'white', borderRadius: 18, padding: '16px 14px',
      boxShadow: '0 2px 12px rgba(0,0,0,.06)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: iconBg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '.72rem', color: '#64748b', fontWeight: 600, marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: '.7rem', fontWeight: 700, color: subColor, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

function EmptyState({ icon, msg, href, cta = 'ابدأ الآن' }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>{icon}</div>
      <p style={{ color: '#94a3b8', fontSize: '.85rem', marginBottom: 14 }}>{msg}</p>
      <Link href={href} style={{
        display: 'inline-block', background: '#6366f1', color: 'white',
        borderRadius: 10, padding: '8px 18px', fontSize: '.82rem', fontWeight: 700,
        textDecoration: 'none',
      }}>{cta}</Link>
    </div>
  );
}

/* ── Weekly bar chart ── */
function WeeklyBarChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.points), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
      {data.map((d, i) => {
        const h = Math.max(d.points > 0 ? 12 : 4, (d.points / maxVal) * 112);
        return (
          <div key={i} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end',
          }}>
            {d.points > 0 && (
              <div style={{ fontSize: '.62rem', fontWeight: 700, color: d.isToday ? '#6366f1' : '#94a3b8' }}>
                {d.points}
              </div>
            )}
            <div style={{
              width: '100%', borderRadius: '5px 5px 0 0', height: h,
              background: d.isToday
                ? 'linear-gradient(180deg,#818cf8,#4f46e5)'
                : d.points > 0 ? '#c7d2fe' : '#f1f5f9',
            }} />
            <div style={{ fontSize: '.62rem', fontWeight: 700, color: d.isToday ? '#6366f1' : '#94a3b8', whiteSpace: 'nowrap' }}>
              {d.day.slice(0, 3)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Streak calendar ── */
function StreakCalendar({ days }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {days.map((d, i) => (
        <div
          key={i}
          title={d.date}
          style={{
            width: 28, height: 28, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.6rem', fontWeight: 800,
            background: d.isToday ? '#6366f1' : d.active ? '#c7d2fe' : '#f1f5f9',
            color: d.isToday ? 'white' : d.active ? '#4338ca' : '#cbd5e1',
            border: d.isToday ? '1.5px solid #4f46e5' : 'none',
          }}
        >
          {d.isToday ? '●' : d.active ? '✓' : ''}
        </div>
      ))}
    </div>
  );
}

/* ── Celebration Popup ── */
const SPARKLES = ['✨','⭐','💫','🌟','✨','💫','⭐','✨'];

function CelebrationPopup({ item, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const isLevel = item.type === 'level';
  const color   = isLevel ? item.level.color : item.badge.color;
  const icon    = isLevel ? item.level.icon  : item.badge.icon;
  const title   = isLevel ? `ارتقيت إلى "${item.level.name}"!` : item.badge.name;
  const desc    = isLevel ? `وصلت لمستوى ${item.level.name}! واصل التقدم!` : item.badge.desc;
  const typeLabel = isLevel ? '🚀 مستوى جديد!' : '🏅 إنجاز جديد!';

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,.78)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        fontFamily: "'Cairo','Tajawal',sans-serif", direction: 'rtl',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 28,
          padding: '40px 32px 32px', maxWidth: 340, width: '100%',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
          animation: 'celebIn .45s cubic-bezier(.34,1.56,.64,1)',
          boxShadow: `0 0 70px ${color}40, 0 24px 64px rgba(0,0,0,.35)`,
          border: `2px solid ${color}28`,
        }}
      >
        {/* floating sparkles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {SPARKLES.map((s, i) => (
            <span key={i} style={{
              position: 'absolute',
              top: `${-5 + i * 10}%`,
              left: `${5 + i * 11}%`,
              fontSize: '1rem',
              animation: `confettiFall ${1.4 + i * 0.22}s ease-out ${i * 0.1}s forwards`,
              opacity: 0.75,
            }}>{s}</span>
          ))}
        </div>

        {/* type label */}
        <div style={{
          fontSize: '.8rem', fontWeight: 800, color: color,
          marginBottom: 18, letterSpacing: '.5px',
        }}>{typeLabel}</div>

        {/* icon */}
        <div style={{
          width: 90, height: 90, borderRadius: '50%',
          background: `${color}15`,
          border: `3px solid ${color}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.8rem', margin: '0 auto 20px',
          boxShadow: `0 0 32px ${color}55`,
          animation: 'celebBounce 1.2s ease-in-out infinite',
        }}>{icon}</div>

        {/* title */}
        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1e293b', marginBottom: 8 }}>
          {title}
        </div>

        {/* desc */}
        <div style={{ fontSize: '.88rem', color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
          {desc}
        </div>

        {/* button */}
        <button
          onClick={onDismiss}
          style={{
            background: `linear-gradient(135deg,${color},${color}cc)`,
            color: 'white', border: 'none', borderRadius: 14,
            padding: '11px 36px', fontSize: '.95rem', fontWeight: 800,
            cursor: 'pointer', boxShadow: `0 4px 18px ${color}50`,
          }}
        >
          رائع! 🎊
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function ProgressDashboard({
  totalPoints, earnedPoints, thisWeekTotal, lastWeekTotal,
  weeklyData, flashLevels, masteredCount, totalFlash,
  accuracy, currentStreak, bestStreak, last21Days,
  completed, completedCount, totalActivities,
  recentLogs, gameAccuracy, gamesPlayedCount,
  puzzleCount, earnedBadgeIds = [], currentLevelIdx = 0, user,
}) {
  const fullName = user?.user_metadata?.full_name ?? '';
  const [celebQueue, setCelebQueue] = useState([]);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    const seenBadgesKey = `arem_badges_${uid}`;
    const seenLevelKey  = `arem_level_${uid}`;
    const queue = [];

    // Level-up check
    const storedLevel = localStorage.getItem(seenLevelKey);
    if (storedLevel === null) {
      // First visit — initialize silently
      localStorage.setItem(seenLevelKey, String(currentLevelIdx));
    } else {
      const seenLevel = parseInt(storedLevel, 10);
      if (currentLevelIdx > seenLevel) {
        for (let lvl = seenLevel + 1; lvl <= currentLevelIdx; lvl++) {
          if (PTS_LEVELS[lvl]) queue.push({ type: 'level', level: PTS_LEVELS[lvl], levelIdx: lvl });
        }
        localStorage.setItem(seenLevelKey, String(currentLevelIdx));
      }
    }

    // New badges check
    const storedBadges = localStorage.getItem(seenBadgesKey);
    if (storedBadges === null) {
      // First visit — initialize silently
      localStorage.setItem(seenBadgesKey, JSON.stringify(earnedBadgeIds));
    } else {
      const seenBadges = JSON.parse(storedBadges);
      const newIds = earnedBadgeIds.filter(id => !seenBadges.includes(id));
      if (newIds.length > 0) {
        newIds.forEach(id => {
          const badge = BADGES.find(b => b.id === id);
          if (badge) queue.push({ type: 'badge', badge });
        });
        localStorage.setItem(seenBadgesKey, JSON.stringify([...seenBadges, ...newIds]));
      }
    }

    if (queue.length > 0) setCelebQueue(queue);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentCeleb = celebQueue[0] ?? null;
  const dismissCeleb = () => setCelebQueue(q => q.slice(1));

  const weekDelta = lastWeekTotal > 0
    ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
    : null;

  const totalFlashAll = flashLevels.reduce((s, c) => s + c, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        .prog-wrap        { font-family:'Cairo','Tajawal',sans-serif; direction:rtl; padding:20px 0 80px; }
        .prog-stat-grid   { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; margin-bottom:18px; }
        .prog-row-3-1     { display:grid; grid-template-columns:2fr 1fr; gap:16px; margin-bottom:16px; }
        .prog-row-half    { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
        .prog-row-full    { margin-bottom:16px; }
        @media(max-width:680px){
          .prog-row-3-1   { grid-template-columns:1fr; }
          .prog-row-half  { grid-template-columns:1fr; }
        }
        @keyframes celebIn      { from { opacity:0; transform:scale(.55) rotate(-4deg) } to { opacity:1; transform:scale(1) rotate(0) } }
        @keyframes celebBounce  { 0%,100% { transform:scale(1) } 40% { transform:scale(1.1) } 70% { transform:scale(.95) } }
        @keyframes confettiFall { from { transform:translateY(-10px) rotate(0deg); opacity:.8 } to { transform:translateY(90px) rotate(400deg); opacity:0 } }
        @keyframes badgeShimmer { 0%,100% { opacity:.75 } 50% { opacity:1 } }
      `}</style>

      {/* Celebration popup — one item at a time, key resets auto-dismiss timer */}
      {currentCeleb && (
        <CelebrationPopup
          key={currentCeleb.type === 'level' ? `lvl-${currentCeleb.levelIdx}` : `bdg-${currentCeleb.badge.id}`}
          item={currentCeleb}
          onDismiss={dismissCeleb}
        />
      )}

      <div className="prog-wrap">

        {/* ── Page header ── */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 900, color: '#1e3a5f', margin: '0 0 4px' }}>
            📊 تقدّمي
          </h1>
          <p style={{ color: '#64748b', fontSize: '.9rem', margin: 0 }}>
            مرحباً {fullName} — تتبّع رحلتك في تعلّم اللغة العربية
          </p>
        </div>

        {/* ── Row 1: 4 stat boxes ── */}
        <div className="prog-stat-grid">
          <StatCard
            icon="⭐" iconBg="#fffbeb"
            value={earnedPoints.toLocaleString('ar-EG')}
            label="مجموع النقاط المكتسبة"
            sub={weekDelta !== null
              ? `${weekDelta >= 0 ? '↑ +' : '↓ '}${weekDelta}% عن الأسبوع الماضي`
              : `هذا الأسبوع: ${thisWeekTotal}`}
            subColor={weekDelta === null || weekDelta >= 0 ? '#059669' : '#dc2626'}
          />
          <StatCard
            icon="📚" iconBg="#f0fdf4"
            value={masteredCount}
            label="كلمة محفوظة ✨"
            sub={totalFlash > 0 ? `من ${totalFlash} كلمة قيد التعلم` : 'ابدأ بطاقات الحفظ'}
            subColor="#059669"
          />
          <StatCard
            icon="🎯" iconBg="#f5f3ff"
            value={accuracy !== null ? `${accuracy}%` : '--'}
            label="دقة الإجابات"
            sub={accuracy !== null
              ? accuracy >= 80 ? 'ممتاز! 🏆' : accuracy >= 60 ? 'جيد 💪' : 'استمر في التدريب'
              : 'العب ألعاباً لترى دقتك'}
            subColor={accuracy === null ? '#94a3b8' : accuracy >= 80 ? '#059669' : accuracy >= 60 ? '#d97706' : '#64748b'}
          />
          <StatCard
            icon="🔥" iconBg="#fff7ed"
            value={currentStreak}
            label="أيام متواصلة"
            sub={`أفضل سجل: ${bestStreak} يوم`}
            subColor={currentStreak >= 7 ? '#dc2626' : currentStreak >= 3 ? '#d97706' : '#94a3b8'}
          />
        </div>

        {/* ── Row 2: Weekly chart + Streak ── */}
        <div className="prog-row-3-1">

          <div style={CARD_STYLE}>
            <SectionTitle icon="📈" title="تطور النقاط — الأسبوع الجاري" />
            <WeeklyBarChart data={weeklyData} />
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 12,
              fontSize: '.78rem', color: '#64748b', fontWeight: 600,
            }}>
              <span>هذا الأسبوع: <b style={{ color: '#6366f1' }}>{thisWeekTotal} نقطة</b></span>
              {lastWeekTotal > 0 && (
                <span>الأسبوع الماضي: <b style={{ color: '#94a3b8' }}>{lastWeekTotal}</b></span>
              )}
            </div>
          </div>

          <div style={CARD_STYLE}>
            <SectionTitle icon="🔥" title="سجل الحضور — 21 يوم" />
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: currentStreak >= 3 ? '#fff7ed' : '#f8fafc',
              border: `1.5px solid ${currentStreak >= 3 ? '#fed7aa' : '#e2e8f0'}`,
              borderRadius: 20, padding: '5px 12px',
              fontSize: '.8rem', fontWeight: 800,
              color: currentStreak >= 3 ? '#c2410c' : '#475569',
              marginBottom: 12,
            }}>
              🔥 {currentStreak} يوم متواصل
            </div>
            <StreakCalendar days={last21Days} />
            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: '.68rem', color: '#94a3b8', fontWeight: 600 }}>
              <span>
                <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#6366f1', marginLeft: 3 }} />
                اليوم
              </span>
              <span>
                <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#c7d2fe', marginLeft: 3 }} />
                نشط
              </span>
              <span>
                <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#f1f5f9', border: '1px solid #e2e8f0', marginLeft: 3 }} />
                غير نشط
              </span>
            </div>
          </div>
        </div>

        {/* ── Row 3: Flashcard levels + Activities ── */}
        <div className="prog-row-half">

          <div style={CARD_STYLE}>
            <SectionTitle icon="🃏" title="بطاقات الحفظ — توزيع المستويات" />
            {totalFlash === 0 ? (
              <EmptyState icon="🃏" msg="لم تبدأ بطاقات الحفظ بعد" href="/library/flashcards" />
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {[...LEVEL_LABELS].reverse().map((lbl, i) => {
                    const lvl   = 5 - i;
                    const count = flashLevels[lvl] ?? 0;
                    const pct   = totalFlashAll > 0 ? (count / totalFlashAll) * 100 : 0;
                    return (
                      <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          minWidth: 74, fontSize: '.73rem', fontWeight: 700,
                          color: count > 0 ? LEVEL_COLORS[lvl] : '#cbd5e1',
                        }}>{lbl}</div>
                        <div style={{ flex: 1, height: 9, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 99,
                            background: LEVEL_COLORS[lvl],
                            width: `${pct}%`,
                            transition: 'width .6s ease',
                          }} />
                        </div>
                        <div style={{ minWidth: 26, fontSize: '.73rem', fontWeight: 700, color: '#64748b', textAlign: 'left' }}>
                          {count}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{
                  marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9',
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '.74rem', color: '#64748b', fontWeight: 700,
                }}>
                  <span>المجموع: <b style={{ color: '#1e293b' }}>{totalFlash} كلمة</b></span>
                  <span>الإتقان: <b style={{ color: '#059669' }}>
                    {Math.round((masteredCount / totalFlash) * 100)}%
                  </b></span>
                </div>
              </>
            )}
          </div>

          <div style={CARD_STYLE}>
            <SectionTitle icon="🎮" title="إتمام الأنشطة" />

            <div style={{ marginBottom: 14 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '.76rem', fontWeight: 700, marginBottom: 6, color: '#475569',
              }}>
                <span>{completedCount} من {totalActivities} نشاط</span>
                <span style={{ color: '#6366f1' }}>
                  {Math.round((completedCount / totalActivities) * 100)}%
                </span>
              </div>
              <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  background: 'linear-gradient(90deg,#818cf8,#4f46e5)',
                  width: `${(completedCount / totalActivities) * 100}%`,
                  transition: 'width .6s ease',
                }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7 }}>
              {ACTIVITY_META.map(a => {
                const done = completed[a.key];
                return (
                  <Link href={a.href} key={a.key} title={a.name} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '8px 4px', borderRadius: 11,
                      background: done ? '#f0fdf4' : '#f8fafc',
                      border: `1.5px solid ${done ? '#86efac' : '#e2e8f0'}`,
                      transition: 'all .18s', cursor: 'pointer',
                    }}>
                      <div style={{ position: 'relative', fontSize: '1.1rem', lineHeight: 1 }}>
                        {a.icon}
                        {done && (
                          <span style={{
                            position: 'absolute', top: -5, right: -7,
                            background: '#059669', color: 'white',
                            borderRadius: '50%', width: 13, height: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '.52rem', fontWeight: 900,
                          }}>✓</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '.57rem', fontWeight: 700, textAlign: 'center',
                        color: done ? '#059669' : '#94a3b8', lineHeight: 1.2,
                      }}>{a.name}</div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {Object.keys(gameAccuracy).length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>دقة الألعاب</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(gameAccuracy).map(([gid, acc]) => {
                    const meta = ACTIVITY_META.find(a => a.key === gid.replace('_', '-')) ||
                                 { name: gid, icon: '🎮' };
                    return (
                      <div key={gid} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '.8rem' }}>{meta.icon}</span>
                        <div style={{ flex: 1, height: 7, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 99,
                            background: acc >= 80 ? '#059669' : acc >= 60 ? '#d97706' : '#f87171',
                            width: `${acc}%`,
                          }} />
                        </div>
                        <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#64748b', minWidth: 30, textAlign: 'left' }}>
                          {acc}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 4: Achievement Badges ── */}
        <div className="prog-row-full">
          <div style={CARD_STYLE}>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: '.95rem' }}>🏅</span> شارات الإنجاز
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.76rem', fontWeight: 700, color: '#64748b' }}>
                <div style={{ width: 90, height: 7, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    background: 'linear-gradient(90deg,#F59E0B,#6366f1)',
                    width: `${Math.round((earnedBadgeIds.length / BADGES.length) * 100)}%`,
                    transition: 'width .6s ease',
                  }} />
                </div>
                <span><b style={{ color: '#6366f1' }}>{earnedBadgeIds.length}</b>/{BADGES.length}</span>
              </div>
            </div>

            {BADGE_CATS.map(cat => {
              const catBadges = BADGES.filter(b => b.cat === cat.key);
              return (
                <div key={cat.key} style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: '.7rem', fontWeight: 800, color: '#94a3b8',
                    marginBottom: 10, letterSpacing: '.5px',
                  }}>{cat.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))', gap: 9 }}>
                    {catBadges.map(badge => {
                      const earned = earnedBadgeIds.includes(badge.id);
                      return (
                        <div
                          key={badge.id}
                          title={badge.desc}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            gap: 6, padding: '14px 8px', borderRadius: 16,
                            background: earned ? `${badge.color}0e` : '#f8fafc',
                            border: `1.5px solid ${earned ? badge.color + '50' : '#e2e8f0'}`,
                            boxShadow: earned ? `0 4px 16px ${badge.color}20` : 'none',
                            opacity: earned ? 1 : .48,
                            filter: earned ? 'none' : 'grayscale(1)',
                            transition: 'all .2s',
                          }}
                        >
                          <div style={{
                            width: 50, height: 50, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.5rem',
                            background: earned ? `${badge.color}18` : '#f1f5f9',
                            border: `2px solid ${earned ? badge.color + '70' : '#e2e8f0'}`,
                            boxShadow: earned ? `0 0 18px ${badge.color}45` : 'none',
                            animation: earned ? 'badgeShimmer 3s ease-in-out infinite' : 'none',
                          }}>{badge.icon}</div>
                          <div style={{
                            fontSize: '.69rem', fontWeight: 800, textAlign: 'center',
                            color: earned ? badge.color : '#cbd5e1', lineHeight: 1.3,
                          }}>{badge.name}</div>
                          {earned ? (
                            <div style={{
                              fontSize: '.58rem', background: badge.color + 'dd', color: 'white',
                              borderRadius: 99, padding: '2px 9px', fontWeight: 700,
                            }}>✓ محقق</div>
                          ) : (
                            <div style={{
                              fontSize: '.58rem', color: '#cbd5e1',
                              padding: '2px 9px', fontWeight: 600,
                            }}>🔒 مغلق</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Row 5: Recent activity ── */}
        <div className="prog-row-full">
          <div style={CARD_STYLE}>
            <SectionTitle icon="📋" title="آخر الأنشطة" />
            {recentLogs.length === 0 ? (
              <EmptyState icon="🎮" msg="لم تبدأ أي نشاط بعد" href="/library" cta="اذهب للمكتبة" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {recentLogs.map((l, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 12,
                    background: l.bg || '#f8fafc', border: '1px solid #f1f5f9',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', background: 'white',
                      boxShadow: '0 1px 4px rgba(0,0,0,.08)',
                    }}>{l.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.name}
                      </div>
                      <div style={{ fontSize: '.7rem', color: '#94a3b8', marginTop: 1 }}>
                        {timeAgo(l.created_at)}
                      </div>
                    </div>
                    <div style={{ fontSize: '.88rem', fontWeight: 900, color: '#6366f1', flexShrink: 0 }}>
                      +{l.delta} ⭐
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Back to library ── */}
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Link href="/library" style={{
            color: '#94a3b8', fontSize: '.82rem', fontWeight: 700, textDecoration: 'none',
          }}>← العودة للمكتبة</Link>
        </div>

      </div>
    </>
  );
}
