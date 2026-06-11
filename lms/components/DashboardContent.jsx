'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from './Navbar';
import ParentPanel from './ParentPanel';
import FaheemWidget from './FaheemWidget';
import LifeSceneSimulator from './LifeSceneSimulator';
import { useLanguage } from '../contexts/LanguageContext';

function HwToggle({ id, status }) {
  const [st, setSt] = useState(status);
  return (
    <button
      onClick={async () => {
        const next = st === 'done' ? 'pending' : 'done';
        await fetch('/api/student/homework', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: next }),
        });
        setSt(next);
      }}
      style={{
        padding: '6px 14px', borderRadius: 20, border: 'none',
        background: st === 'done' ? '#16a34a' : '#f1f5f9',
        color: st === 'done' ? '#fff' : '#475569',
        fontWeight: 700, fontSize: '.82rem', cursor: 'pointer',
        fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap',
        transition: '.2s',
      }}
    >{st === 'done' ? '✅ أنجزته' : '○ إنجاز'}</button>
  );
}

const ACTION_CARDS = [
  { icon: '📅', title: 'تقويمي',      desc: 'حصصي القادمة والمنتهية',  href: '/dashboard/calendar', grad: 'linear-gradient(135deg,#185FA5,#1d4ed8)' },
  { icon: '📖', title: 'بنك الكلمات', desc: 'تعلّم كلمات جديدة يومياً', href: '/dashboard/lexicon',  grad: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
  { icon: '📈', title: 'تقاريري',     desc: 'تابع تطوّرك ونتائجك',     href: '/dashboard/progress', grad: 'linear-gradient(135deg,#059669,#10b981)' },
];

export default function DashboardContent({
  user, assessments, role, isStudent,
  upcomingSessions, displayName, studentGender,
  attendancePct, attendedCount, attendanceTotal,
  homework = [], sessionNotes = [],
}) {
  const { t, lang } = useLanguage();
  const locale = 'en-GB';

  const nextSession = upcomingSessions[0] ?? null;
  const pendingHw   = homework.filter(h => h.status !== 'done').length;
  const today       = new Date().toISOString().slice(0, 10);

  // ── Live clock ──
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Session timing ──
  const sessionDT  = nextSession ? new Date(`${nextSession.session_date}T${nextSession.start_time}`) : null;
  const diffMs     = sessionDT ? sessionDT - now : null;
  const diffMins   = diffMs != null ? diffMs / 60000 : null;
  const sessionActive = diffMs != null && diffMs <= 0; // time reached

  // Countdown string (MM:SS) shown when < 1 hour
  let countdown = null;
  if (diffMs != null && diffMs > 0 && diffMs <= 3600000) {
    const secs = Math.floor(diffMs / 1000);
    countdown = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  }

  // ── Audio reminder — plays ONCE when entering the 1-hour window ──
  const audioPlayedRef = useRef(new Set());
  useEffect(() => {
    if (!nextSession || !diffMs) return;
    if (diffMs > 0 && diffMs <= 3600000 && !audioPlayedRef.current.has(nextSession.id)) {
      audioPlayedRef.current.add(nextSession.id);
      const audio = new Audio('/sounds/session-reminder.mp3');
      audio.play().catch(() => {
        if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance('لَدَيْكَ حِصَّةُ لُغَةٍ عَرَبِيَّةٍ بَعْدَ سَاعَةٍ');
          u.lang = 'ar-SA'; u.rate = 0.9;
          window.speechSynthesis.speak(u);
        }
      });
    }
  }, [countdown, nextSession]);

  // ── Attendance state ──
  const [attendanceLogged, setAttendanceLogged] = useState(false);
  const [attLoading,       setAttLoading]       = useState(false);

  useEffect(() => {
    if (!nextSession || !sessionActive) return;
    fetch(`/api/student/attendance?session_id=${nextSession.id}`)
      .then(r => r.json())
      .then(d => { if (d.logged) setAttendanceLogged(true); })
      .catch(() => {});
  }, [sessionActive, nextSession?.id]);

  async function logAttendance() {
    if (!nextSession || attLoading || attendanceLogged) return;
    setAttLoading(true);
    const res = await fetch('/api/student/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: nextSession.id }),
    });
    const data = await res.json();
    if (data.ok) setAttendanceLogged(true);
    setAttLoading(false);
  }

  // ── Time label ──
  let timeLabel = '';
  if (diffMins != null) {
    if (diffMins <= 0)        timeLabel = '🔴 الحصة تبدأ الآن';
    else if (diffMins < 60)   timeLabel = `⏱️ تبدأ بعد ${Math.round(diffMins)} دقيقة`;
    else if (diffMins < 1440) timeLabel = `⏱️ تبدأ بعد ${Math.floor(diffMins / 60)} ساعة`;
    else {
      const d = Math.floor(diffMins / 1440);
      timeLabel = `📆 بعد ${d} ${d === 1 ? 'يوم' : 'أيام'}`;
    }
  }

  return (
    <>
      <style>{`
        .db-wrap { max-width:820px; margin:0 auto; padding:28px 18px 60px; direction:rtl; }
        .db-hello { font-size:1.55rem; font-weight:900; color:var(--primary); margin-bottom:6px; }
        .db-sub   { font-size:.9rem; color:var(--muted); margin-bottom:28px; }

        /* Stats row */
        .db-stats { display:flex; gap:12px; margin-bottom:28px; flex-wrap:wrap; }
        .db-stat  { flex:1; min-width:110px; background:#fff; border:1.5px solid var(--border);
                    border-radius:14px; padding:14px 16px; text-align:center; }
        .db-stat-v { font-size:1.55rem; font-weight:900; color:var(--primary); line-height:1; }
        .db-stat-l { font-size:.75rem; color:var(--muted); margin-top:4px; font-weight:600; }
        .db-stat-i { font-size:1.4rem; margin-bottom:4px; }

        /* Section */
        .db-sec   { margin-bottom:28px; }
        .db-sec-h { font-size:1rem; font-weight:800; color:#1e293b; margin-bottom:12px;
                    display:flex; align-items:center; gap:8px; }
        .db-sec-h::after { content:''; flex:1; height:1.5px; background:var(--border); }

        /* Next session */
        .db-session { border-radius:18px; padding:20px 22px; color:#fff;
                      display:flex; align-items:center; gap:16px; flex-wrap:wrap;
                      box-shadow:0 6px 28px rgba(24,95,165,.2); margin-bottom:28px; }
        .db-session-body { flex:1; min-width:180px; }
        .db-session-badge { display:inline-block; background:rgba(255,255,255,.22);
                            padding:4px 12px; border-radius:20px; font-size:.8rem; font-weight:700; margin-top:8px; }
        .db-session-btn { background:#fff; border-radius:12px; padding:11px 20px;
                          font-weight:800; font-size:.9rem; text-decoration:none;
                          display:inline-flex; align-items:center; gap:7px; white-space:nowrap;
                          transition:.2s; flex-shrink:0; }
        .db-session-btn.dim { background:rgba(255,255,255,.18); color:#fff;
                              border:1.5px solid rgba(255,255,255,.4); }

        /* Homework cards */
        .hw-card { background:#fff; border-radius:14px; border:1.5px solid var(--border);
                   padding:14px 16px; display:flex; align-items:flex-start; gap:12px; }
        .hw-card.done   { border-color:#6ee7b7; background:#f0fdf4; }
        .hw-card.overdue{ border-color:#fca5a5; background:#fff5f5; }

        /* Notes */
        .note-card { background:#fffbeb; border-radius:14px; border:1.5px solid #fcd34d;
                     padding:16px 18px; }
        .note-meta { display:flex; gap:12px; flex-wrap:wrap; font-size:.8rem;
                     color:#92400e; margin-bottom:10px; font-weight:700; }
        .note-text { font-size:.92rem; color:#451a03; line-height:1.8;
                     border-right:3px solid #f59e0b; padding-right:12px; }

        /* Action cards */
        .db-actions { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .db-action  { border-radius:16px; padding:20px 18px; color:#fff; text-decoration:none;
                      display:flex; align-items:center; gap:14px;
                      transition:transform .18s, box-shadow .18s; }
        .db-action:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.15); }
        .db-action-icon { font-size:2rem; line-height:1; flex-shrink:0; }
        .db-action-title{ font-weight:800; font-size:.97rem; margin-bottom:3px; }
        .db-action-desc { font-size:.78rem; opacity:.85; }
        @media(max-width:600px){ .db-actions{grid-template-columns:1fr;} }

        @keyframes attPulse {
          0%,100% { box-shadow:0 4px 16px rgba(0,0,0,.18); transform:scale(1); }
          50%     { box-shadow:0 6px 24px rgba(24,95,165,.45); transform:scale(1.04); }
        }
      `}</style>

      <Navbar user={user} sessionCountdown={isStudent ? countdown : null} />
      <main className="page-wrap">
        <div className="db-wrap">

          {/* ── Header ── */}
          <div className="db-hello">أهلاً، {displayName} 👋</div>
          <div className="db-sub">
            {pendingHw > 0
              ? `لديك ${pendingHw} واجب${pendingHw === 1 ? '' : 'ات'} معلّقة`
              : nextSession
                ? 'كل شيء على ما يرام — حصتك القادمة في الأسفل'
                : 'مرحباً بك في أكاديمية عارم'}
          </div>

          {/* ── Stats ── */}
          <div className="db-stats">
            {attendancePct != null && (
              <div className="db-stat">
                <div className="db-stat-i">🏫</div>
                <div className="db-stat-v" style={{ color: attendancePct >= 80 ? '#059669' : attendancePct >= 60 ? '#d97706' : '#dc2626' }}>
                  {attendancePct}%
                </div>
                <div className="db-stat-l">الحضور ({attendedCount}/{attendanceTotal})</div>
              </div>
            )}
            <div className="db-stat">
              <div className="db-stat-i">📝</div>
              <div className="db-stat-v" style={{ color: pendingHw > 0 ? '#d97706' : '#059669' }}>
                {pendingHw}
              </div>
              <div className="db-stat-l">واجبات معلّقة</div>
            </div>
            <div className="db-stat">
              <div className="db-stat-i">📊</div>
              <div className="db-stat-v">{assessments?.length ?? 0}</div>
              <div className="db-stat-l">تقييماتي</div>
            </div>
            {upcomingSessions.length > 0 && (
              <div className="db-stat">
                <div className="db-stat-i">📅</div>
                <div className="db-stat-v">{upcomingSessions.length}</div>
                <div className="db-stat-l">حصص قادمة</div>
              </div>
            )}
          </div>

          {/* ── Next session ── */}
          {nextSession && (
            <div className="db-session" style={{ background: sessionActive ? 'linear-gradient(135deg,#1a7c40,#15803d)' : 'linear-gradient(135deg,#185FA5,#1d4ed8)' }}>
              <div style={{ fontSize: '2.8rem', lineHeight: 1 }}>🎥</div>
              <div className="db-session-body">
                <div style={{ fontSize: '.78rem', opacity: .8, fontWeight: 600, marginBottom: 3 }}>الحصة القادمة</div>
                <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>
                  {nextSession.subject || 'حصة عامة'}
                </div>
                <div style={{ fontSize: '.83rem', opacity: .9, display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 5 }}>
                  <span>👤 {nextSession.teacher_name}</span>
                  <span>📅 {new Date(nextSession.session_date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  <span>⏰ {nextSession.start_time?.slice(0, 5)}</span>
                </div>
                <span className="db-session-badge">{timeLabel}</span>
              </div>
              {/* زر الحضور */}
              <button
                onClick={logAttendance}
                disabled={!sessionActive || attendanceLogged || attLoading}
                style={{
                  borderRadius: 12, padding: '12px 20px',
                  fontWeight: 900, fontSize: '.92rem', whiteSpace: 'nowrap',
                  border: 'none', cursor: sessionActive && !attendanceLogged ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: '.25s',
                  background: attendanceLogged
                    ? '#16a34a'
                    : sessionActive
                      ? '#fff'
                      : 'rgba(255,255,255,.15)',
                  color: attendanceLogged
                    ? '#fff'
                    : sessionActive
                      ? '#185FA5'
                      : 'rgba(255,255,255,.6)',
                  boxShadow: sessionActive && !attendanceLogged ? '0 4px 16px rgba(0,0,0,.18)' : 'none',
                  animation: sessionActive && !attendanceLogged ? 'attPulse 1.8s ease-in-out infinite' : 'none',
                }}
              >
                {attendanceLogged
                  ? '✅ سُجِّل حضورك'
                  : attLoading
                    ? '...'
                    : sessionActive
                      ? '🟢 سجّل حضورك'
                      : `🔒 ${countdown ? countdown : 'قبل الموعد'}`}
              </button>
            </div>
          )}

          {/* ── Other upcoming sessions ── */}
          {upcomingSessions.length > 1 && (
            <div className="db-sec">
              <div className="db-sec-h">📋 حصص أخرى قادمة</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingSessions.slice(1).map(s => (
                  <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: '1.5px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{s.subject || 'حصة عامة'}</div>
                      <div style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                        <span>👤 {s.teacher_name}</span>
                        <span>📅 {new Date(s.session_date).toLocaleDateString(locale)}</span>
                        <span>⏰ {s.start_time?.slice(0, 5)}</span>
                      </div>
                    </div>
                    <span style={{ fontSize:'.78rem', color:'var(--muted)', whiteSpace:'nowrap' }}>⏳ انتظر المعلم</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Homework ── */}
          {homework.length > 0 && (
            <div className="db-sec">
              <div className="db-sec-h">📝 واجباتي</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {homework.map(h => {
                  const overdue = h.due_date && h.due_date < today && h.status === 'pending';
                  const cls = h.status === 'done' ? 'done' : overdue ? 'overdue' : '';
                  return (
                    <div key={h.id} className={`hw-card ${cls}`}>
                      <div style={{ fontSize: '1.4rem', paddingTop: 2, lineHeight: 1 }}>
                        {h.status === 'done' ? '✅' : overdue ? '⚠️' : '📋'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '.93rem', color: h.status === 'done' ? '#64748b' : '#1e293b', textDecoration: h.status === 'done' ? 'line-through' : 'none', marginBottom: 3 }}>
                          {h.title}
                        </div>
                        <div style={{ fontSize: '.79rem', color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <span>👨‍🏫 {h.teacher_name}</span>
                          {h.due_date && (
                            <span style={{ color: overdue ? '#dc2626' : '#64748b', fontWeight: overdue ? 700 : 400 }}>
                              📅 {h.due_date}{overdue ? ' — متأخر!' : ''}
                            </span>
                          )}
                        </div>
                        {h.description && (
                          <div style={{ marginTop: 5, fontSize: '.83rem', color: '#475569', lineHeight: 1.6 }}>{h.description}</div>
                        )}
                      </div>
                      <HwToggle id={h.id} status={h.status} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Teacher notes ── */}
          {sessionNotes.length > 0 && (
            <div className="db-sec">
              <div className="db-sec-h">🗒️ ملاحظات المعلم</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sessionNotes.map(s => (
                  <div key={s.id} className="note-card">
                    <div className="note-meta">
                      <span>{s.subject || 'حصة عامة'}</span>
                      <span>📅 {new Date(s.session_date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <span>👨‍🏫 {s.teacher_name}</span>
                    </div>
                    <div className="note-text">{s.notes}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Quick actions ── */}
          <div className="db-sec">
            <div className="db-sec-h">🚀 وصول سريع</div>
            <div className="db-actions">
              {ACTION_CARDS.map(a => (
                <Link key={a.href} href={a.href} className="db-action" style={{ background: a.grad }}>
                  <span className="db-action-icon">{a.icon}</span>
                  <div>
                    <div className="db-action-title">{a.title}</div>
                    <div className="db-action-desc">{a.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Faheem widget ── */}
          {isStudent && <FaheemWidget studentName={displayName} studentGender={studentGender} />}

          {/* ── Life-Scene Simulator ── */}
          {isStudent && (
            <div className="db-sec">
              <div className="db-sec-h">🎭 مسرح التعبير</div>
              <LifeSceneSimulator role="student" />
            </div>
          )}

          {/* ── Assessment history ── */}
          {assessments && assessments.length > 0 && (
            <div className="db-sec">
              <div className="db-sec-h">📊 سجل تقييماتي</div>
              <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--primary)' }}>
                      <th style={{ padding: '10px 14px', color: '#fff', textAlign: 'right', fontWeight: 700 }}>المستوى</th>
                      <th style={{ padding: '10px 14px', color: '#fff', textAlign: 'right', fontWeight: 700 }}>الحالة</th>
                      <th style={{ padding: '10px 14px', color: '#fff', textAlign: 'right', fontWeight: 700 }}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.slice(0, 5).map((a, i) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : '#f9fbff' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <span className="badge badge-blue">المستوى {a.level}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className="badge badge-green">تم الإرسال ✓</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: '.82rem' }}>
                          {a.completed_at ? new Date(a.completed_at).toLocaleDateString(locale) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isStudent && <ParentPanel assessments={assessments ?? []} />}

        </div>
      </main>
    </>
  );
}
