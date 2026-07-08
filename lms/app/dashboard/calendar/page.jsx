'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';

const DAYS_AR   = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];
const DAYS_FULL = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function fmtFullDate(iso) {
  const [y, m, d] = iso.split('-');
  const date = new Date(iso);
  return `${DAYS_FULL[date.getDay()]}، ${parseInt(d)} ${MONTHS_AR[parseInt(m) - 1]} ${y}`;
}

export default function CalendarPage() {
  const supabase = createClient();
  const router   = useRouter();
  const [user,     setUser]     = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [today]                 = useState(() => new Date().toISOString().slice(0, 10));
  const [curYear,  setCurYear]  = useState(() => new Date().getFullYear());
  const [curMonth, setCurMonth] = useState(() => new Date().getMonth());
  const [selected, setSelected] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/auth/login'); return; }
      setUser(u);
      // جلب جميع الحصص (ماضية وقادمة) لعرضها في التقويم
      supabase
        .from('sessions')
        .select('id, teacher_name, session_date, start_time, duration_minutes, subject, status, meet_link, room_name')
        .eq('student_email', u.email?.toLowerCase())
        .in('status', ['scheduled', 'completed'])
        .order('session_date', { ascending: true })
        .order('start_time',   { ascending: true })
        .then(({ data }) => { setSessions(data ?? []); setLoading(false); });
    });
  }, []);

  // أيام الشهر الحالي
  const firstDay  = new Date(curYear, curMonth, 1).getDay();
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();

  // خريطة: iso → عدد الحصص
  const sessionMap = {};
  sessions.forEach(s => {
    sessionMap[s.session_date] = (sessionMap[s.session_date] || 0) + 1;
  });

  // حصص اليوم المختار
  const daySessions = sessions.filter(s => s.session_date === selected);

  function prevMonth() {
    if (curMonth === 0) { setCurYear(y => y - 1); setCurMonth(11); }
    else setCurMonth(m => m - 1);
  }
  function nextMonth() {
    if (curMonth === 11) { setCurYear(y => y + 1); setCurMonth(0); }
    else setCurMonth(m => m + 1);
  }
  function goToday() {
    const now = new Date();
    setCurYear(now.getFullYear());
    setCurMonth(now.getMonth());
    setSelected(today);
  }

  const joinUrl = s => s.meet_link ?? null;
  const isPast  = s => s.status === 'completed' || s.session_date < today;

  if (!user) return null;

  return (
    <>
      <Navbar user={user} />
      <main style={{ minHeight: 'calc(100vh - 64px)', background: 'var(--bg)', padding: '28px 0', direction: 'rtl' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <Link href="/dashboard" className="btn btn-outline btn-sm">← لوحتي</Link>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
              📅 تقويمي
            </h1>
            <button onClick={goToday} className="btn btn-outline btn-sm" style={{ marginRight: 'auto' }}>
              اليوم
            </button>
          </div>

          {/* Calendar card */}
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px rgba(26,43,74,.10)', overflow: 'hidden', marginBottom: 20 }}>

            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--primary)', padding: '4px 8px', borderRadius: 8 }}>›</button>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
                {MONTHS_AR[curMonth]} {curYear}
              </span>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--primary)', padding: '4px 8px', borderRadius: 8 }}>‹</button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 12px 4px' }}>
              {DAYS_AR.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '.72rem', fontWeight: 700, color: 'var(--muted)', padding: '4px 0' }}>{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '4px 12px 16px', gap: '4px 0' }}>
              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}

              {Array.from({ length: daysInMonth }, (_, i) => {
                const day     = i + 1;
                const iso     = isoDate(curYear, curMonth, day);
                const isToday = iso === today;
                const isSel   = iso === selected;
                const count   = sessionMap[iso] || 0;

                return (
                  <div key={day} onClick={() => setSelected(iso)}
                    style={{
                      textAlign: 'center', padding: '6px 2px', cursor: 'pointer',
                      borderRadius: 10, transition: 'background .15s',
                      background: isSel ? 'var(--primary)' : isToday ? 'var(--primary-lt)' : 'transparent',
                    }}>
                    <div style={{
                      fontSize: '.88rem', fontWeight: isSel || isToday ? 800 : 500,
                      color: isSel ? '#fff' : isToday ? 'var(--primary)' : 'var(--text)',
                      lineHeight: 1.6,
                    }}>{day}</div>
                    {/* Session dot */}
                    {count > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                        {Array.from({ length: Math.min(count, 3) }, (_, j) => (
                          <div key={j} style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: isSel ? 'rgba(255,255,255,.7)' : 'var(--primary)',
                          }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected day sessions */}
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px rgba(26,43,74,.08)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--text)' }}>
                {fmtFullDate(selected)}
              </span>
              {daySessions.length > 0 && (
                <span style={{ background: 'var(--primary-lt)', color: 'var(--primary)', borderRadius: 20, padding: '2px 10px', fontSize: '.78rem', fontWeight: 700 }}>
                  {daySessions.length} {daySessions.length === 1 ? 'حصة' : 'حصص'}
                </span>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>جارٍ التحميل...</div>
            ) : daySessions.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>لا توجد حصص في هذا اليوم</p>
              </div>
            ) : (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {daySessions.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 12,
                    background: isPast(s) ? '#f9fafb' : 'var(--primary-lt)',
                    border: `1px solid ${isPast(s) ? 'var(--border)' : '#c5d5fb'}`,
                  }}>
                    <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>
                      {isPast(s) ? '✅' : '🎥'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '.95rem', marginBottom: 3, color: 'var(--text)' }}>
                        {s.subject || 'حصة عامة'}
                      </div>
                      <div style={{ fontSize: '.82rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <span>👤 {s.teacher_name}</span>
                        <span>⏰ {s.start_time?.slice(0, 5)}</span>
                        {s.duration_minutes && <span>⏱️ {s.duration_minutes} د</span>}
                      </div>
                    </div>
                    {!isPast(s) && joinUrl(s) && (
                      <a href={joinUrl(s)} target="_blank" rel="noopener noreferrer"
                        className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                        انضم 🎥
                      </a>
                    )}
                    {isPast(s) && (
                      <span style={{ fontSize: '.75rem', color: 'var(--muted)', flexShrink: 0 }}>منتهية</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </>
  );
}
