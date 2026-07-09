'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from './Navbar';
import ParentPanel from './ParentPanel';
import FaheemWidget from './FaheemWidget';
import LifeSceneSimulator from './LifeSceneSimulator';
import { useLanguage } from '../contexts/LanguageContext';
import { createClient } from '../lib/supabase';
import AvatarShop from './AvatarShop';
import DashboardHero3D from './DashboardHero3D';
import WordOfDay from './WordOfDay';
import StreakFreeze from './StreakFreeze';

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
  { icon: '📅', title: 'تقويمي',      desc: 'حصصي القادمة والمنتهية',  href: '/dashboard/calendar', grad: 'linear-gradient(135deg,#1A2B4A,#2d4373)' },
  { icon: '📖', title: 'بنك الكلمات', desc: 'تعلّم كلمات جديدة يومياً', href: '/dashboard/lexicon',  grad: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
  { icon: '📈', title: 'تقاريري',     desc: 'تابع تطوّرك ونتائجك',     href: '/dashboard/progress', grad: 'linear-gradient(135deg,#059669,#10b981)' },
];

export default function DashboardContent({
  user, assessments, isStudent,
  upcomingSessions, displayName, studentGender,
  attendancePct, attendedCount, attendanceTotal,
  homework = [], sessionNotes = [],
  streakCount = 0, loggedToday = false, last7Days = [],
  masteredCount = 0, studiedCount = 0,
  hasHero = false,
}) {
  const { t, lang } = useLanguage();
  const locale = 'en-GB';

  const nextSession = upcomingSessions[0] ?? null;
  const pendingHw   = homework.filter(h => h.status !== 'done').length;

  // ── today must come from state so server/client initial renders match ──
  const [today, setToday] = useState('');
  useEffect(() => { setToday(new Date().toISOString().slice(0, 10)); }, []);

  // ── Live session status — polls Supabase every 15 s to detect teacher "active" ──
  const [liveStatus, setLiveStatus] = useState(nextSession?.status ?? 'scheduled');
  const announcedActiveRef = useRef(false);

  useEffect(() => {
    if (!nextSession?.id) return;
    setLiveStatus(nextSession.status ?? 'scheduled');
    setAttendanceLogged(nextSession.attended === true);
    announcedActiveRef.current = false;
  }, [nextSession?.id]);

  useEffect(() => {
    if (!nextSession?.id) return;
    const supabase = createClient();

    async function pollStatus() {
      const { data } = await supabase
        .from('sessions')
        .select('status')
        .eq('id', nextSession.id)
        .single();
      if (data?.status) setLiveStatus(data.status);
    }
    pollStatus();
    const intervalId = setInterval(pollStatus, 15000);

    // Realtime — تحديث فوري لحظة يغيّر المعلم الحالة إلى active
    const channel = supabase
      .channel(`session-status-${nextSession.id}`)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'sessions',
        filter: `id=eq.${nextSession.id}`,
      }, (payload) => {
        if (payload.new?.status) setLiveStatus(payload.new.status);
      })
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [nextSession?.id]);


  // ── Live clock ──
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Session timing (للعداد التنازلي فقط — لا تحكم في الأزرار) ──────────
  const sessionDT    = nextSession ? new Date(`${nextSession.session_date}T${nextSession.start_time}`) : null;
  const duration     = nextSession?.duration_minutes ?? 60;
  const sessionEndDT = sessionDT ? new Date(sessionDT.getTime() + duration * 60000) : null;

  const diffMs    = sessionDT    ? sessionDT    - now : null;
  const diffEndMs = sessionEndDT ? sessionEndDT - now : null;
  const diffMins  = diffMs != null ? diffMs / 60000 : null;

  // ── مصدر الحقيقة الوحيد: حالة الحصة من قاعدة البيانات (liveStatus) ──
  // لا نعتمد على ساعة المتصفح لفتح/قفل الأزرار — فقط status من السيرفر

  /** الحصة نشطة: يعتمد حصراً على liveStatus من DB */
  const isLiveOrActive = liveStatus === 'active';

  /** الحصة انتهت: فقط إذا لم يكن السيرفر يقول active وانقضى وقتها محلياً */
  const sessionHasEnded = !isLiveOrActive && (sessionEndDT ? now >= sessionEndDT : false);

  // عداد تنازلي داخل بطاقة الحصة (يظهر فقط عند ≤ 60 دقيقة)
  let cardCountdown = null;
  if (diffMs != null && diffMs > 0 && diffMs <= 3600000) {
    const secs = Math.floor(diffMs / 1000);
    const hh   = Math.floor(secs / 3600);
    const mm   = Math.floor((secs % 3600) / 60);
    const ss   = secs % 60;
    cardCountdown = hh > 0
      ? `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
      : `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  }


  // ── Audio reminders — fires ONCE per session at precise second thresholds ──
  const announced1hRef   = useRef(false);
  const announced5minRef = useRef(false);
  const announced30sRef  = useRef(false);
  const announcedForRef  = useRef(null);

  // Integer seconds remaining — changes every second, gives exact threshold matching
  const remainingSecs = diffMs != null && diffMs > 0 ? Math.floor(diffMs / 1000) : null;

  // Tries pre-recorded file first; falls back to browser TTS on any failure
  function playAudio(fileName, fallbackText) {
    const audio = new Audio(`/sounds/${fileName}`);
    audio.playbackRate = 1.05;
    audio.play().catch(() => {
      if (!fallbackText || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      let done = false;
      function doSpeak() {
        if (done) return;
        done = true;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(fallbackText);
        u.lang = 'ar-SA';
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
      }
      if (window.speechSynthesis.getVoices().length > 0) {
        doSpeak();
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
        setTimeout(doSpeak, 600);
      }
    });
  }

  // Announce "session started" once when liveStatus becomes 'active'
  useEffect(() => {
    if (liveStatus !== 'active' || announcedActiveRef.current) return;
    announcedActiveRef.current = true;
    playAudio('session-started.mp3', 'دَرْسُكَ بَدَأْ، اُدْخُلْ لِلْقَاعَهْ يَا بَطَلْ');
  }, [liveStatus]);

  useEffect(() => {
    // Skip countdown audio entirely if session is already active
    if (liveStatus === 'active') return;
    if (!nextSession || remainingSecs == null || remainingSecs <= 0) return;

    // Reset flags when session changes
    if (announcedForRef.current !== nextSession.id) {
      announcedForRef.current  = nextSession.id;
      announced1hRef.current   = false;
      announced5minRef.current = false;
      announced30sRef.current  = false;
    }

    // Window 1 — 58:00→60:00 before session (3480–3600 s)
    if (remainingSecs <= 3600 && remainingSecs > 3480 && !announced1hRef.current) {
      announced1hRef.current = true;
      playAudio('session-1hour.mp3', 'لَدَيْكَ دَرْسٌ بَعْدَ سَاعَهْ');
    }

    // Window 2 — 1:00→5:00 before session (60–300 s)
    // Fires immediately on page-load if student opens dashboard inside this window
    if (remainingSecs <= 300 && remainingSecs > 60 && !announced5minRef.current) {
      announced5minRef.current = true;
      playAudio('session-soon.mp3', 'تَنْبِيهْ، حِصَّتُكَ سَتَبْدَأُ بَعْدَ قَلِيلْ، اِسْتَعِدَّ يَا بَطَلْ');
    }

    // Window 3 — ≤ 30 seconds before session
    if (remainingSecs <= 30 && !announced30sRef.current) {
      announced30sRef.current = true;
      playAudio('session-now.mp3', 'دَرْسُكَ بَدَأْ، اُدْخُلْ لِلْقَاعَهْ يَا بَطَلْ');
    }
  }, [remainingSecs, nextSession?.id, liveStatus]);

  // ── Attendance state — seed from server value so refresh shows correct state ──
  const [attendanceLogged, setAttendanceLogged] = useState(nextSession?.attended === true);
  const [attLoading,       setAttLoading]       = useState(false);
  const [attError,         setAttError]         = useState(null);
  const [sessionCardHidden, setSessionCardHidden] = useState(false);

  // تُجلب حالة الحضور فقط بعد أن يبدأ المعلم الحصة (liveStatus === 'active')
  useEffect(() => {
    if (!nextSession || liveStatus !== 'active') return;
    fetch(`/api/student/attendance?session_id=${nextSession.id}`)
      .then(r => r.json())
      .then(d => { if (d.logged) setAttendanceLogged(true); })
      .catch(() => {});
  }, [liveStatus, nextSession?.id]);

  async function logAttendance() {
    if (!nextSession || attLoading || attendanceLogged) return;
    setAttLoading(true);
    setAttError(null);
    try {
      const res  = await fetch('/api/student/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: nextSession.id }),
      });
      const data = await res.json();
      if (data.ok || data.already) {
        setAttendanceLogged(true);
        const meetUrl = data.meet_link || nextSession.meet_link;
        if (meetUrl) {
          window.open(meetUrl, '_blank', 'noopener');
          setTimeout(() => setSessionCardHidden(true), 1800);
        } else {
          setTimeout(() => setSessionCardHidden(true), 1800);
        }
      } else {
        setAttError(data.error ?? 'تعذّر تسجيل الحضور — حاول مرة أخرى');
      }
    } catch {
      setAttError('خطأ في الاتصال — تحقق من الإنترنت');
    }
    setAttLoading(false);
  }

  // ── Time label (عرض فقط — لا يتحكم في الأزرار) ──
  let timeLabel = '';
  if (sessionHasEnded) {
    timeLabel = '⏹️ انتهت الحصة';
  } else if (isLiveOrActive) {
    const minsLeft = diffEndMs != null ? Math.ceil(diffEndMs / 60000) : null;
    timeLabel = minsLeft != null && minsLeft > 0 ? `🔴 جارية — يتبقى ${minsLeft} د` : '🔴 الحصة جارية الآن';
  } else if (cardCountdown) {
    timeLabel = `⏱️ ${cardCountdown}`;
  } else if (diffMins != null) {
    const d = Math.floor(diffMins / 1440);
    timeLabel = `📆 بعد ${d} ${d === 1 ? 'يوم' : 'أيام'}`;
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
                      box-shadow:0 6px 28px rgba(26,43,74,.2); margin-bottom:28px; }
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
          50%     { box-shadow:0 6px 24px rgba(26,43,74,.45); transform:scale(1.04); }
        }

        /* ── Streak widget ── */
        .streak-card {
          background: linear-gradient(135deg,#fff7ed,#fef3c7);
          border: 2px solid #fcd34d; border-radius: 20px;
          padding: 18px 20px; margin-bottom: 24px;
        }
        .streak-header { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-bottom:4px; }
        .streak-fire   { font-size:2rem; line-height:1; animation:streakFlicker 1.4s ease-in-out infinite; display:inline-block; }
        .streak-num    { font-size:2.6rem; font-weight:900; color:#b45309; line-height:1; }
        .streak-unit   { font-size:.95rem; font-weight:800; color:#92400e; }
        .streak-badge  { display:inline-block; background:#fef3c7; border:1.5px solid #fcd34d;
                         border-radius:20px; padding:3px 10px; font-size:.72rem; font-weight:800;
                         color:#92400e; }
        .streak-msg    { font-size:.78rem; color:#78350f; font-weight:700; margin-bottom:14px; }
        .streak-dots   { display:flex; gap:6px; align-items:center; }
        .streak-dot-wrap { display:flex; flex-direction:column; align-items:center; flex:1; }
        .streak-dot {
          width:100%; aspect-ratio:1; max-width:38px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:.78rem; font-weight:900;
        }
        .streak-dot.on     { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff;
                             box-shadow:0 3px 8px rgba(245,158,11,.4); font-size:1rem; }
        .streak-dot.off    { background:#f1f5f9; color:#94a3b8; border:1.5px dashed #cbd5e1; font-size:.72rem; font-weight:700; }
        .streak-dot.future { background:#f8fafc; border:1.5px dashed #e2e8f0; color:#d1d5db; font-size:.72rem; font-weight:700; }
        .streak-dot.today.on  { box-shadow:0 0 0 3px #fcd34d, 0 4px 12px rgba(245,158,11,.5); }
        .streak-dot.today.off { background:#fef9c3; border:2px solid #f59e0b; color:#d97706; font-size:.72rem; font-weight:800; }
        @keyframes streakFlicker {
          0%,100%{transform:scale(1) rotate(-3deg)} 50%{transform:scale(1.12) rotate(3deg)}
        }
        @media(max-width:500px){
          .streak-num{font-size:2rem;} .streak-dots{gap:4px;}
          .streak-dot{font-size:.65rem;}
        }

        /* ── Progress card ── */
        .prog-card {
          background: linear-gradient(160deg,#f0f9ff 0%,#eef5fe 100%);
          border: 1.5px solid #bae6fd;
          border-radius: 20px; padding: 18px 20px; margin-bottom: 24px;
        }
        .prog-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
        }
        .prog-title {
          font-size: .95rem; font-weight: 900; color: #0c4a6e;
          display: flex; align-items: center; gap: 7px;
        }
        .prog-badge {
          font-size: .7rem; font-weight: 700; color: #0284c7;
          background: #e0f2fe; border-radius: 20px; padding: 3px 10px;
        }
        .prog-metrics {
          display: grid; grid-template-columns: repeat(3,1fr); gap: 10px;
        }
        .prog-metric {
          background: #fff; border-radius: 14px; padding: 14px 10px;
          text-align: center; border: 1px solid #e0f2fe;
          display: flex; flex-direction: column; align-items: center;
        }
        .prog-icon  { font-size: 1.5rem; line-height: 1; margin-bottom: 6px; }
        .prog-val   { font-size: 1.65rem; font-weight: 900; line-height: 1; }
        .prog-lbl   { font-size: .7rem; color: #64748b; font-weight: 700; margin-top: 4px; }
        .prog-sub   { font-size: .65rem; color: #94a3b8; margin-top: 2px; }
        .prog-bar   { width: 100%; height: 4px; background: #f1f5f9; border-radius: 99;
                      overflow: hidden; margin-top: 8px; }
        .prog-fill  { height: 100%; border-radius: 99; transition: width 1.2s ease; }
        @media(max-width:420px){
          .prog-metrics { grid-template-columns: 1fr; }
          .prog-metric  { flex-direction: row; text-align: right; gap: 12px; padding: 12px 14px; }
          .prog-icon    { margin-bottom: 0; font-size: 1.3rem; flex-shrink: 0; }
          .prog-val     { font-size: 1.3rem; }
          .prog-bar     { margin-top: 4px; }
        }

        /* ── Hero discovery card ── */
        .hero-discover {
          display: flex; align-items: center; gap: 16px;
          background: linear-gradient(135deg,#1A2B4A 0%,#2d3e6b 100%);
          border-radius: 18px; padding: 18px 22px; margin-bottom: 24px;
          border: 2px solid rgba(232,184,75,.35);
          box-shadow: 0 4px 20px rgba(26,43,74,.2);
        }
        .hero-discover-icon { font-size: 2.6rem; line-height: 1; flex-shrink: 0; }
        .hero-discover-body { flex: 1; min-width: 0; }
        .hero-discover-title { font-size: 1rem; font-weight: 900; color: #E8B84B; margin-bottom: 3px; }
        .hero-discover-desc  { font-size: .83rem; color: rgba(255,255,255,.8); line-height: 1.5; }
        .hero-discover-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: #E8B84B; color: #1A2B4A; font-weight: 900;
          font-size: .88rem; border-radius: 12px; padding: 10px 18px;
          text-decoration: none; flex-shrink: 0; white-space: nowrap;
          transition: transform .15s, box-shadow .15s;
        }
        .hero-discover-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(232,184,75,.4); }
        @media(max-width:500px) {
          .hero-discover { flex-wrap: wrap; }
          .hero-discover-btn { width: 100%; justify-content: center; }
        }
      `}</style>

      <Navbar user={user} />
      <main className="page-wrap db-page">
        <div className="db-wrap">

          {/* ── Header ── */}
          <div style={{ marginBottom:8 }}>
            <div className="db-hello">أهلاً، {displayName} 👋</div>
            <div className="db-sub" style={{ marginBottom:0 }}>
              {pendingHw > 0
                ? `لديك ${pendingHw} واجب${pendingHw === 1 ? '' : 'ات'} معلّقة`
                : nextSession
                  ? 'كل شيء على ما يرام — حصتك القادمة في الأسفل'
                  : 'مرحباً بك في أكاديمية عارم'}
            </div>
          </div>

          {/* ── AvatarShop — fixed on right edge, desktop only (mobile → bottom nav) ── */}
          {isStudent && (
            <div className="avatar-shop-desktop" style={{
              position: 'fixed',
              right: 12,
              top: 242,
              zIndex: 48,
            }}>
              <AvatarShop user={user} displayName={displayName} />
            </div>
          )}
          <DashboardHero3D
            displayName={displayName}
            pendingHw={pendingHw}
            nextSession={nextSession}
            isStudent={isStudent}
          />

          {/* ── Hero discovery card — يختفي بمجرد اختيار الطالب بطله ── */}
          {isStudent && !hasHero && (
            <div className="hero-discover">
              <div className="hero-discover-icon">🦸</div>
              <div className="hero-discover-body">
                <div className="hero-discover-title">اختر بطلك!</div>
                <div className="hero-discover-desc">
                  ادخل استوديو الأبطال واختر شخصيتك — كل بطل له شخصية مميزة خاصة بك ✨
                </div>
              </div>
              <Link href="/dashboard/heroes-studio" className="hero-discover-btn">
                استوديو الأبطال ←
              </Link>
            </div>
          )}

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

          {/* ── Streak ── */}
          {(() => {
            const msg =
              streakCount === 0 ? 'ابدأ رحلتك اليوم — العب أي لعبة! 💪'
            : streakCount === 1 ? 'بداية رائعة! واصل غداً 🌟'
            : streakCount < 5  ? 'أنت في المسار الصحيح! 🚀'
            : streakCount < 10 ? 'ممتاز! سلسلتك تشتعل 🔥'
            : streakCount < 20 ? `${streakCount} يوماً بلا توقف — إنجاز رائع! 🏅`
            : `${streakCount} يوماً! أنت أسطوري 🏆`;
            return (
              <div className="streak-card">

                {/* العداد مدمج مع النص: 🔥 2 يوم متتاليًا */}
                <div className="streak-header">
                  <span className="streak-fire">{streakCount > 0 ? '🔥' : '💤'}</span>
                  <span className="streak-unit">
                    {streakCount === 0 ? 'لا توجد سلسلة بعد' : `اليوم ${streakCount}`}
                  </span>
                  {loggedToday && <span className="streak-badge">✅ لعبت اليوم</span>}
                </div>

                <div className="streak-msg">{msg}</div>

                {/* خط الأيام: اليوم (اليمين) ← الأيام القادمة (اليسار) */}
                <div className="streak-dots">
                  {last7Days.map((d) => {
                    const cls = [
                      'streak-dot',
                      d.isFuture ? 'future' : d.active ? 'on' : 'off',
                      d.isToday  ? 'today'  : '',
                    ].filter(Boolean).join(' ');
                    return (
                      <div key={d.date} className="streak-dot-wrap">
                        <div className={cls}>
                          {d.active ? '★' : d.day}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })()}

          {isStudent && <StreakFreeze />}

          {isStudent && <WordOfDay />}

          {/* ── Personal Progress Card ── */}
          <div className="prog-card">
            <div className="prog-header">
              <div className="prog-title">📈 تقدمك الشخصي</div>
              <span className="prog-badge">محدّث الآن</span>
            </div>
            <div className="prog-metrics">

              {/* Mastered Words */}
              <div className="prog-metric">
                <div className="prog-icon">🧠</div>
                <div className="prog-val" style={{ color: masteredCount > 0 ? '#0369a1' : studiedCount > 0 ? '#0891b2' : '#94a3b8' }}>
                  {studiedCount > 0 ? (masteredCount > 0 ? masteredCount : studiedCount) : '—'}
                </div>
                <div className="prog-lbl">
                  {masteredCount > 0 ? 'كلمة محفوظة ✨'
                   : studiedCount > 0 ? 'كلمة قيد التعلم'
                   : 'لم تبدأ بعد'}
                </div>
                {masteredCount > 0 && studiedCount > masteredCount && (
                  <div className="prog-sub">{studiedCount - masteredCount} قيد التعلم</div>
                )}
                {masteredCount === 0 && studiedCount > 0 && (
                  <div className="prog-sub">احفظها {5} مرات لتُتقنها</div>
                )}
                {studiedCount === 0 && (
                  <div className="prog-sub">ابدأ بالبطاقات! ✨</div>
                )}
                {studiedCount > 0 && (
                  <div className="prog-bar">
                    <div className="prog-fill" style={{
                      width: masteredCount > 0
                        ? `${Math.round((masteredCount / studiedCount) * 100)}%`
                        : '20%',
                      background: 'linear-gradient(90deg,#0369a1,#0ea5e9)',
                    }} />
                  </div>
                )}
              </div>

              {/* Attendance */}
              <div className="prog-metric">
                <div className="prog-icon">🏫</div>
                <div className="prog-val" style={{
                  color: attendancePct == null ? '#94a3b8'
                       : attendancePct >= 80    ? '#059669'
                       : attendancePct >= 60    ? '#d97706'
                       :                          '#dc2626',
                }}>
                  {attendancePct != null ? `${attendancePct}%` : '—'}
                </div>
                <div className="prog-lbl">نسبة الحضور</div>
                {attendancePct != null && (
                  <div className="prog-sub">{attendedCount} من {attendanceTotal} حصة</div>
                )}
                {attendancePct != null && (
                  <div className="prog-bar">
                    <div className="prog-fill" style={{
                      width: `${attendancePct}%`,
                      background: attendancePct >= 80 ? 'linear-gradient(90deg,#059669,#10b981)'
                                : attendancePct >= 60 ? 'linear-gradient(90deg,#d97706,#f59e0b)'
                                :                       'linear-gradient(90deg,#dc2626,#f87171)',
                    }} />
                  </div>
                )}
                {attendancePct == null && (
                  <div className="prog-sub">لا حصص مسجّلة بعد</div>
                )}
              </div>

              {/* Last Assessment */}
              <div className="prog-metric">
                <div className="prog-icon">📊</div>
                <div className="prog-val" style={{ color: assessments?.[0] ? '#6366f1' : '#94a3b8' }}>
                  {assessments?.[0] ? `م ${assessments[0].level}` : '—'}
                </div>
                <div className="prog-lbl">آخر تقييم</div>
                {assessments?.[0] ? (
                  <div className="prog-sub">
                    {new Date(assessments[0].completed_at).toLocaleDateString('ar-u-nu-latn', { day:'numeric', month:'short' })}
                  </div>
                ) : (
                  <div className="prog-sub">لا تقييمات بعد</div>
                )}
                {assessments?.[0]?.score != null && (
                  <div className="prog-bar">
                    <div className="prog-fill" style={{
                      width: `${Math.min(Math.round((assessments[0].score / (assessments[0].level * 10 || 60)) * 100), 100)}%`,
                      background: 'linear-gradient(90deg,#6366f1,#a855f7)',
                    }} />
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Next session ── */}
          {nextSession && !sessionCardHidden && (() => {

            // ── لون البطاقة ──
            const cardBg = sessionHasEnded
              ? 'linear-gradient(135deg,#64748b,#475569)'
              : isLiveOrActive
                ? 'linear-gradient(135deg,#1a7c40,#15803d)'
                : 'linear-gradient(135deg,oklch(0.74 0.13 28),oklch(0.62 0.14 28))';

            // ── تسمية الحالة ──
            const statusLabel = sessionHasEnded
              ? '⏹️ انتهت الحصة'
              : isLiveOrActive
                ? '🔴 بدأت الحصة جارية الآن'
                : diffMins != null && diffMins <= 60
                  ? '🔔 الحصة قادمة قريباً'
                  : 'الحصة القادمة';

            // ── الحالة 1: أكثر من 60 دقيقة — لا زر، لا عداد ──
            const showAttendArea = diffMins != null && diffMins <= 60 || isLiveOrActive || sessionHasEnded;

            // ── منطقة الحضور ──
            let attendanceArea = null;
            if (showAttendArea) {
              if (attendanceLogged && (isLiveOrActive || sessionHasEnded)) {
                attendanceArea = (
                  <div style={{ background:'rgba(34,197,94,.25)', border:'1.5px solid rgba(34,197,94,.5)', borderRadius:12, padding:'11px 18px', color:'#fff', fontWeight:800, fontSize:'.9rem', whiteSpace:'nowrap', flexShrink:0, textAlign:'center' }}>
                    ✅ تم تسجيل الحضور
                  </div>
                );
              } else if (sessionHasEnded) {
                attendanceArea = (
                  <div style={{ background:'rgba(239,68,68,.18)', border:'1.5px solid rgba(239,68,68,.4)', borderRadius:12, padding:'11px 18px', color:'rgba(255,255,255,.8)', fontWeight:700, fontSize:'.88rem', flexShrink:0, textAlign:'center' }}>
                    ⏰ انتهى وقت التسجيل
                  </div>
                );
              } else if (isLiveOrActive) {
                // ── الحالة 3: المعلم ضغط "ابدأ الحصة" → الزر نشط ──
                attendanceArea = (
                  <div style={{ flexShrink:0, textAlign:'center' }}>
                    <button
                      onClick={logAttendance}
                      disabled={attLoading}
                      style={{
                        borderRadius:12, padding:'12px 22px',
                        fontWeight:900, fontSize:'.92rem', whiteSpace:'nowrap',
                        border:'none', cursor: attLoading ? 'wait' : 'pointer', fontFamily:'inherit',
                        background:'#fff', color:'#1a7c40',
                        boxShadow:'0 4px 16px rgba(0,0,0,.18)',
                        animation: attLoading ? 'none' : 'attPulse 1.8s ease-in-out infinite',
                        display:'block', width:'100%', opacity: attLoading ? .7 : 1,
                      }}>
                      {attLoading ? '⏳ جارٍ التسجيل...' : '🟢 سجّل حضورك'}
                    </button>
                    {attError && (
                      <div style={{ marginTop:6, fontSize:'.78rem', color:'#fca5a5', fontWeight:700 }}>
                        ⚠️ {attError}
                      </div>
                    )}
                  </div>
                );
              } else {
                // ── الحالة 2: ≤ 60 دقيقة لكن المعلم لم يبدأ بعد — الزر مقفل + عداد ──
                attendanceArea = (
                  <div style={{ flexShrink:0, textAlign:'center', minWidth:130 }}>
                    <button disabled style={{
                      borderRadius:12, padding:'11px 20px',
                      fontWeight:800, fontSize:'.88rem', whiteSpace:'nowrap',
                      border:'none', fontFamily:'inherit',
                      background:'rgba(255,255,255,.15)', color:'rgba(255,255,255,.55)',
                      cursor:'not-allowed', display:'block', width:'100%',
                    }}>
                      🔒 سجّل حضورك
                    </button>
                    {cardCountdown && (
                      <div style={{
                        marginTop:8, display:'inline-block',
                        background:'rgba(239,68,68,.28)', border:'1.5px solid rgba(239,68,68,.55)',
                        borderRadius:20, padding:'4px 14px',
                        fontSize:'.9rem', color:'#fca5a5',
                        fontWeight:900, fontVariantNumeric:'tabular-nums', letterSpacing:2,
                      }}>
                        🔴 {cardCountdown}
                      </div>
                    )}
                    <div style={{ marginTop:4, fontSize:'.74rem', color:'rgba(255,255,255,.5)' }}>
                      ينتظر إشارة المعلم
                    </div>
                  </div>
                );
              }
            }

            return (
              <div className="db-session" style={{ background: cardBg, alignItems: 'flex-start' }}>
                <div style={{ fontSize:'2.8rem', lineHeight:1, paddingTop:2 }}>
                  {sessionHasEnded ? '✅' : isLiveOrActive ? '📹' : '🎥'}
                </div>
                <div className="db-session-body">
                  <div style={{ fontSize:'.78rem', opacity:.8, fontWeight:600, marginBottom:3 }}>
                    {statusLabel}
                  </div>
                  <div style={{ fontWeight:900, fontSize:'1.1rem' }}>
                    {nextSession.subject || 'حصة عامة'}
                  </div>
                  <div style={{ fontSize:'.83rem', opacity:.9, display:'flex', gap:14, flexWrap:'wrap', marginTop:5 }}>
                    <span>👤 {nextSession.teacher_name}</span>
                    <span>📅 {new Date(nextSession.session_date).toLocaleDateString(locale, { weekday:'long', day:'numeric', month:'long' })}</span>
                    <span>⏰ {nextSession.start_time?.slice(0, 5)}</span>
                    {nextSession.duration_minutes && <span>⌛ {nextSession.duration_minutes} د</span>}
                  </div>
                  {/* الحصة هادئة عند >60 دقيقة — عداد فقط في نافذة الـ 60 دقيقة */}
                  {!sessionHasEnded && !isLiveOrActive && diffMins != null && diffMins > 60 && (
                    <span className="db-session-badge">
                      📆 بعد {Math.floor(diffMins / 1440) >= 1 ? `${Math.floor(diffMins / 1440)} يوم` : `${Math.ceil(diffMins)} دقيقة`}
                    </span>
                  )}
                </div>
                {attendanceArea}
              </div>
            );
          })()}

          {/* ── Empty state: no upcoming sessions → nudge toward the library ── */}
          {upcomingSessions.length === 0 && (
            <div className="db-sec">
              <div style={{
                background: 'linear-gradient(135deg,#fff,#FAF7F2)',
                border: '2px dashed var(--border)',
                borderRadius: 16, padding: '30px 22px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '2.8rem', marginBottom: 8, lineHeight: 1 }}>🚀</div>
                <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#1e293b', marginBottom: 6 }}>
                  لا حصص قادمة الآن — لكنّ المغامرة لا تتوقّف!
                </div>
                <div style={{ fontSize: '.9rem', color: 'var(--muted)', marginBottom: 18, lineHeight: 1.7, maxWidth: '38ch', marginInline: 'auto' }}>
                  اذهب إلى المكتبة والعب لعبةً جديدة، أو اقرأ قصّةً ممتعة، واجمع النقاط 🌟
                </div>
                <Link href="/library" style={{
                  display: 'inline-block', background: 'var(--accent)', color: 'var(--primary)',
                  fontWeight: 800, fontSize: '.95rem', textDecoration: 'none',
                  borderRadius: 12, padding: '12px 30px',
                  boxShadow: '0 4px 14px rgba(232,184,75,.4)',
                }}>
                  🎮 إلى المكتبة
                </Link>
              </div>
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
          {isStudent && <FaheemWidget studentName={displayName} studentGender={studentGender} streakCount={streakCount} masteredCount={masteredCount} />}

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
              <div className="table-scroll-wrapper" style={{ background: '#fff', borderRadius: 14, border: '1.5px solid var(--border)' }}>
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
