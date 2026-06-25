'use client';
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
            background: d.isToday
              ? '#6366f1'
              : d.active ? '#c7d2fe' : '#f1f5f9',
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

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function ProgressDashboard({
  totalPoints, earnedPoints, thisWeekTotal, lastWeekTotal,
  weeklyData, flashLevels, masteredCount, totalFlash,
  accuracy, currentStreak, bestStreak, last21Days,
  completed, completedCount, totalActivities,
  recentLogs, gameAccuracy, gamesPlayedCount,
  puzzleCount, user,
}) {
  const fullName = user?.user_metadata?.full_name ?? '';

  const weekDelta = lastWeekTotal > 0
    ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
    : null;

  const totalFlashAll = flashLevels.reduce((s, c) => s + c, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        .prog-wrap { font-family:'Cairo','Tajawal',sans-serif; direction:rtl; padding:20px 0 80px; }
        .prog-stat-grid  { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; margin-bottom:18px; }
        .prog-row-3-1    { display:grid; grid-template-columns:2fr 1fr; gap:16px; margin-bottom:16px; }
        .prog-row-half   { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
        .prog-row-full   { margin-bottom:16px; }
        @media(max-width:680px){
          .prog-row-3-1  { grid-template-columns:1fr; }
          .prog-row-half { grid-template-columns:1fr; }
        }
      `}</style>

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

          {/* Weekly bar chart */}
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

          {/* Streak calendar */}
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

          {/* Flashcard level bars */}
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

          {/* Activities completion grid */}
          <div style={CARD_STYLE}>
            <SectionTitle icon="🎮" title="إتمام الأنشطة" />

            {/* Progress bar */}
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

            {/* Activity tiles */}
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
                      transition: 'all .18s',
                      cursor: 'pointer',
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
                        color: done ? '#059669' : '#94a3b8',
                        lineHeight: 1.2,
                      }}>{a.name}</div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Per-game accuracy */}
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

        {/* ── Row 4: Recent activity ── */}
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
