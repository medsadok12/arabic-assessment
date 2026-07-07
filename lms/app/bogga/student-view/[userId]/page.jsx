import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient } from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

/* ── helpers ── */
function calcStreak(logDates) {
  if (!logDates.length) return 0;
  const todayStr     = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (logDates[0] !== todayStr && logDates[0] !== yesterdayStr) return 0;
  let streak = 0, expected = logDates[0];
  for (const d of logDates) {
    if (d === expected) {
      streak++;
      const dt = new Date(expected); dt.setDate(dt.getDate() - 1);
      expected = dt.toISOString().slice(0, 10);
    } else break;
  }
  return streak;
}

const LEVEL_NAMES = { 0:'مبتدئ', 1:'مستكشف', 2:'بطل', 3:'محترف', 4:'أسطورة' };
const ITEM_NAMES  = {
  star_halo:'هالة النجوم ⭐', smart_glasses:'نظارة ذكية 🕶️',
  graduation_cap:'قبعة التخرج 🎓', hero_scarf:'وشاح البطل 🧣',
  golden_crown:'تاج ذهبي 👑', wizard_hat:'قبعة الساحر 🧙',
};

/* ── page ── */
export default async function StudentViewPage({ params }) {
  const { userId } = params;

  /* layout.jsx already guards admin access — double-check role here */
  const supabase = createClient();
  const { data: { user: viewer } } = await supabase.auth.getUser();
  const viewerRole = getRole(viewer);
  if (viewerRole !== 'super_admin' && viewerRole !== 'admin') redirect('/bogga');

  const admin = createAdminClient();

  /* fetch student auth record */
  const { data: { user: student }, error: stuErr } =
    await admin.auth.admin.getUserById(userId);
  if (stuErr || !student) redirect('/bogga');
  if (getRole(student) !== 'student') redirect('/bogga');

  const email       = student.email ?? '';
  const displayName = student.user_metadata?.full_name ?? email.split('@')[0] ?? '—';
  const avatarURL   = student.user_metadata?.avatar_url ?? null;
  const gender      = student.user_metadata?.gender === 'female' ? 'female' : 'male';
  const fmtDT = iso => iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' }) : '—';
  const joinedAt    = fmtDT(student.created_at);
  const lastLogin   = fmtDT(student.last_sign_in_at);
  const lastLogout  = fmtDT(student.user_metadata?.last_logout_at ?? null);

  /* parallel data fetch */
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: assessments },
    { data: sessionsAll },
    { data: fcProgress },
    { data: hwRaw },
    { data: notedRaw },
    { data: logsRaw },
    { data: pointsRow },
    { data: logRows },
    { data: avatarRows },
  ] = await Promise.all([
    admin.from('assessments')
      .select('id,level,score,completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(20)
      .then(r => r.error ? { data: [] } : r),

    admin.from('sessions')
      .select('id,teacher_name,session_date,start_time,duration_minutes,subject,meet_link,status,attended,notes')
      .ilike('student_email', email)
      .order('session_date', { ascending: false })
      .limit(50)
      .then(r => r.error ? { data: [] } : r),

    admin.from('flashcard_progress')
      .select('level')
      .eq('user_id', userId)
      .then(r => r.error ? { data: [] } : r),

    admin.from('homework')
      .select('id,teacher_name,title,description,due_date,status,created_at')
      .ilike('student_email', email)
      .order('due_date', { ascending: true })
      .limit(30)
      .then(r => r.error ? { data: [] } : r),

    admin.from('sessions')
      .select('id,teacher_name,session_date,subject,notes')
      .ilike('student_email', email)
      .not('notes', 'is', null).neq('notes', '')
      .order('session_date', { ascending: false })
      .limit(10)
      .then(r => r.error ? { data: [] } : r),

    admin.from('daily_logs')
      .select('log_date')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .limit(90)
      .then(r => r.error?.code === '42P01' ? { data: [] } : r),

    admin.from('user_points')
      .select('total')
      .eq('user_id', userId)
      .maybeSingle()
      .then(r => r.error ? { data: null } : r),

    admin.from('points_log')
      .select('delta')
      .eq('user_id', userId)
      .gt('delta', 0)
      .then(r => r.error ? { data: [] } : r),

    admin.from('avatar_items')
      .select('item_id,equipped')
      .eq('user_id', userId)
      .then(r => r.error ? { data: [] } : r),
  ]);

  /* ── derived values ── */
  const pastSessions    = (sessionsAll ?? []).filter(s => s.attended !== null);
  const attendedCount   = pastSessions.filter(s => s.attended === true).length;
  const attendancePct   = pastSessions.length > 0 ? Math.round(attendedCount / pastSessions.length * 100) : null;

  const upcomingSessions = (sessionsAll ?? [])
    .filter(s => {
      const startMs = new Date(`${s.session_date}T${s.start_time}`).getTime();
      const endMs   = startMs + (s.duration_minutes ?? 60) * 60000;
      return Date.now() < endMs && (s.status === 'scheduled' || s.status === 'active');
    })
    .sort((a, b) => a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time))
    .slice(0, 5);

  const masteredCount = (fcProgress ?? []).filter(p => p.level >= 5).length;
  const studiedCount  = (fcProgress ?? []).length;

  const logDates   = (logsRaw ?? []).map(r => r.log_date);
  const streakCount= calcStreak(logDates);
  const loggedToday= logDates[0] === today;

  const balance    = pointsRow?.total ?? 0;
  const earned     = (logRows ?? []).reduce((s, r) => s + (r.delta || 0), 0);
  const lvlIdx     = Math.min(4, Math.floor(earned / 1000));
  const equippedId = (avatarRows ?? []).find(r => r.equipped)?.item_id ?? null;
  const ownedCount = (avatarRows ?? []).length;

  const homework      = hwRaw ?? [];
  const pendingHw     = homework.filter(h => h.status !== 'done').length;
  const sessionNotes  = notedRaw ?? [];
  const initials      = displayName.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  /* ── render ── */
  return (
    <>
      <style>{`
        .sv-wrap { max-width: 860px; margin: 0 auto; padding: 0 18px 80px; direction: rtl;
                   font-family: 'Cairo','Tajawal',sans-serif; }
        .sv-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 18px;
                   padding: 20px 22px; margin-bottom: 22px;
                   box-shadow: 0 2px 10px rgba(24,95,165,.06); }
        .sv-sec-h { font-size: .95rem; font-weight: 800; color: #1e293b; margin-bottom: 14px;
                    display: flex; align-items: center; gap: 8px; }
        .sv-sec-h::after { content:''; flex:1; height:1.5px; background:#f1f5f9; }
        .sv-stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 22px; }
        .sv-stat { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px;
                   padding: 14px 12px; text-align: center; }
        .sv-stat-i { font-size: 1.35rem; line-height: 1; margin-bottom: 5px; }
        .sv-stat-v { font-size: 1.6rem; font-weight: 900; line-height: 1; }
        .sv-stat-l { font-size: .72rem; color: #64748b; font-weight: 600; margin-top: 4px; }
        .sv-row    { display: flex; gap: 12px; flex-wrap: wrap; }
        .sv-tag    { padding: 3px 10px; border-radius: 20px; font-size: .72rem; font-weight: 700; }
        .sv-hw     { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0;
                     border-bottom: 1px solid #f1f5f9; }
        .sv-hw:last-child { border-bottom: none; }
        .sv-session { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0;
                      border-bottom: 1px solid #f1f5f9; }
        .sv-session:last-child { border-bottom: none; }
        @media(max-width:600px){
          .sv-stat-grid { grid-template-columns: repeat(2,1fr); }
        }
      `}</style>

      {/* ── Admin Banner ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'linear-gradient(135deg,#1e3a5f,#185FA5)',
        color: '#fff', padding: '12px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
        boxShadow: '0 4px 16px rgba(24,95,165,.35)',
        fontFamily: "'Cairo','Tajawal',sans-serif",
        direction: 'rtl',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.2rem' }}>👁️</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: '.97rem' }}>عرض المدير — لوحة الطالب</div>
            <div style={{ fontSize: '.78rem', opacity: .8 }}>{displayName} • {email}</div>
          </div>
        </div>
        <Link href="/bogga?tab=users" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,.18)', color: '#fff',
          border: '1.5px solid rgba(255,255,255,.35)',
          borderRadius: 12, padding: '7px 16px',
          textDecoration: 'none', fontWeight: 700, fontSize: '.85rem',
          transition: 'background .18s', whiteSpace: 'nowrap',
        }}>
          ← العودة للإدارة
        </Link>
      </div>

      <div className="sv-wrap" style={{ paddingTop: 28 }}>

        {/* ── Profile card ── */}
        <div className="sv-card" style={{
          display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap',
          background: 'linear-gradient(135deg,#f0f6ff,#fff)',
        }}>
          <div style={{ position:'relative', width:72, height:72, borderRadius:'50%', flexShrink:0, overflow:'hidden', border:'3px solid #bfdbfe', background:'#dbeafe' }}>
            <img
              src={avatarURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(userId)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
              alt={displayName}
              style={avatarURL ? { width:72, height:72, objectFit:'cover', display:'block' } : {
                position:'absolute', width:108, height:108, top:-5, left:-18,
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#1e293b', marginBottom: 4 }}>
              {displayName}
              <span style={{ marginRight: 10, fontSize: '.75rem', fontWeight: 700,
                background: '#dbeafe', color: '#1e3a8a', padding: '2px 9px', borderRadius: 20 }}>
                طالب
              </span>
              {gender === 'female' && (
                <span style={{ fontSize: '.75rem', fontWeight: 700,
                  background: '#fce7f3', color: '#9d174d', padding: '2px 9px', borderRadius: 20 }}>
                  طالبة
                </span>
              )}
            </div>
            <div style={{ color: '#475569', fontSize: '.88rem', direction: 'ltr', textAlign: 'right', marginBottom: 6 }}>
              {email}
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '.78rem', color: '#64748b' }}>
              <span>📅 انضم: {joinedAt}</span>
              <span>🔑 آخر دخول: {lastLogin}</span>
              {lastLogout !== '—' && <span>🚪 آخر خروج: {lastLogout}</span>}
              {loggedToday && <span style={{ color: '#16a34a', fontWeight: 700 }}>✅ نشط اليوم</span>}
            </div>
          </div>
          {/* Points summary */}
          <div style={{
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff', borderRadius: 16, padding: '14px 20px',
            textAlign: 'center', minWidth: 130,
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 }}>{balance.toLocaleString()}</div>
            <div style={{ fontSize: '.72rem', opacity: .85, marginTop: 2 }}>⭐ رصيد النقاط</div>
            <div style={{ fontSize: '.7rem', opacity: .7, marginTop: 4 }}>
              إجمالي مكتسب: {earned.toLocaleString()}
            </div>
            <div style={{ fontSize: '.75rem', fontWeight: 800, marginTop: 6,
              background: 'rgba(255,255,255,.2)', borderRadius: 99, padding: '2px 8px' }}>
              {LEVEL_NAMES[lvlIdx] ?? 'مبتدئ'}
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="sv-stat-grid">
          <div className="sv-stat">
            <div className="sv-stat-i">🏫</div>
            <div className="sv-stat-v" style={{
              color: attendancePct == null ? '#94a3b8'
                : attendancePct >= 80 ? '#059669'
                : attendancePct >= 60 ? '#d97706' : '#dc2626'
            }}>
              {attendancePct != null ? `${attendancePct}%` : '—'}
            </div>
            <div className="sv-stat-l">الحضور ({attendedCount}/{pastSessions.length})</div>
          </div>
          <div className="sv-stat">
            <div className="sv-stat-i">🔥</div>
            <div className="sv-stat-v" style={{ color: streakCount > 0 ? '#d97706' : '#94a3b8' }}>
              {streakCount}
            </div>
            <div className="sv-stat-l">أيام متتالية</div>
          </div>
          <div className="sv-stat">
            <div className="sv-stat-i">📝</div>
            <div className="sv-stat-v" style={{ color: pendingHw > 0 ? '#d97706' : '#059669' }}>
              {pendingHw}
            </div>
            <div className="sv-stat-l">واجبات معلقة / {homework.length}</div>
          </div>
          <div className="sv-stat">
            <div className="sv-stat-i">🧠</div>
            <div className="sv-stat-v" style={{ color: '#7c3aed' }}>
              {masteredCount}
            </div>
            <div className="sv-stat-l">كلمة محفوظة / {studiedCount}</div>
          </div>
        </div>

        {/* ── Assessments + Avatar in one row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>

          {/* Assessments */}
          <div className="sv-card" style={{ marginBottom: 0 }}>
            <div className="sv-sec-h">📊 سجل التقييمات ({(assessments ?? []).length})</div>
            {(assessments ?? []).length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '.85rem', textAlign: 'center', padding: '16px 0' }}>
                لا توجد تقييمات بعد
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {(assessments ?? []).slice(0, 8).map(a => (
                  <div key={a.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.82rem',
                  }}>
                    <span style={{ color: '#64748b' }}>
                      {new Date(a.completed_at).toLocaleDateString('en-GB')} • مستوى {a.level}
                    </span>
                    <span style={{
                      fontWeight: 800,
                      color: a.score >= 80 ? '#059669' : a.score >= 60 ? '#d97706' : '#dc2626',
                      background: a.score >= 80 ? '#dcfce7' : a.score >= 60 ? '#fef9c3' : '#fee2e2',
                      padding: '2px 10px', borderRadius: 20,
                    }}>{Math.round(a.score)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Avatar & Shop items */}
          <div className="sv-card" style={{ marginBottom: 0 }}>
            <div className="sv-sec-h">🛍️ متجر الأفاتار</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#185FA5,#1e88e5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', fontWeight: 900, color: '#fff', margin: '0 auto 6px',
                }}>{initials}</div>
                <div style={{ fontSize: '.7rem', color: '#64748b' }}>
                  {equippedId ? ITEM_NAMES[equippedId] : 'بدون إكسسوار'}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.82rem', marginBottom: 6, color: '#475569' }}>
                  🎁 القطع المملوكة: <strong>{ownedCount}</strong> / 6
                </div>
                <div style={{ fontSize: '.82rem', color: '#475569', marginBottom: 8 }}>
                  ⭐ المستوى: <strong>{LEVEL_NAMES[lvlIdx]}</strong> ({earned.toLocaleString()} / {(lvlIdx+1)*1000} نقطة)
                </div>
                {/* mini progress bar */}
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                    width: `${Math.min(100, ((earned % 1000) / 1000) * 100)}%`,
                  }}/>
                </div>
                <div style={{ fontSize: '.68rem', color: '#94a3b8', marginTop: 4 }}>
                  {Math.min(1000, 1000 - (earned % 1000))} نقطة للمستوى التالي
                </div>
              </div>
            </div>
            {(avatarRows ?? []).length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(avatarRows ?? []).map(r => (
                  <span key={r.item_id} style={{
                    fontSize: '.7rem', fontWeight: 700,
                    background: r.equipped ? '#ede9fe' : '#f8fafc',
                    color: r.equipped ? '#6d28d9' : '#475569',
                    border: r.equipped ? '1.5px solid #c4b5fd' : '1.5px solid #e2e8f0',
                    padding: '3px 9px', borderRadius: 20,
                  }}>
                    {ITEM_NAMES[r.item_id] ?? r.item_id}
                    {r.equipped ? ' ✓' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Upcoming sessions ── */}
        {upcomingSessions.length > 0 && (
          <div className="sv-card">
            <div className="sv-sec-h">📅 الحصص القادمة ({upcomingSessions.length})</div>
            {upcomingSessions.map(s => (
              <div key={s.id} className="sv-session">
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: s.status === 'active' ? '#dcfce7' : '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem',
                }}>
                  {s.status === 'active' ? '🟢' : '📅'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '.88rem', color: '#1e293b', marginBottom: 2 }}>
                    {s.teacher_name} — {s.subject ?? 'عربي'}
                  </div>
                  <div style={{ fontSize: '.78rem', color: '#64748b' }}>
                    {s.session_date} · {s.start_time?.slice(0,5)}
                    {s.status === 'active' && (
                      <span style={{ marginRight: 8, color: '#16a34a', fontWeight: 700 }}>● جارية الآن</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── All sessions summary ── */}
        <div className="sv-card">
          <div className="sv-sec-h">🗂️ جميع الحصص ({(sessionsAll ?? []).length})</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              { label:'حضر', val: attendedCount, bg:'#dcfce7', clr:'#15803d' },
              { label:'غاب',  val: pastSessions.filter(s=>s.attended===false).length, bg:'#fee2e2', clr:'#b91c1c' },
              { label:'قادمة', val: upcomingSessions.length, bg:'#eff6ff', clr:'#1d4ed8' },
            ].map(x => (
              <div key={x.label} style={{
                background: x.bg, color: x.clr,
                borderRadius: 12, padding: '8px 18px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 900 }}>{x.val}</div>
                <div style={{ fontSize: '.72rem', fontWeight: 700 }}>{x.label}</div>
              </div>
            ))}
            {attendancePct != null && (
              <div style={{
                background: attendancePct>=80 ? '#dcfce7' : attendancePct>=60 ? '#fef9c3' : '#fee2e2',
                color: attendancePct>=80 ? '#15803d' : attendancePct>=60 ? '#92400e' : '#b91c1c',
                borderRadius: 12, padding: '8px 18px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 900 }}>{attendancePct}%</div>
                <div style={{ fontSize: '.72rem', fontWeight: 700 }}>نسبة الحضور</div>
              </div>
            )}
          </div>

          {/* Last 10 sessions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(sessionsAll ?? []).slice(0, 10).map(s => {
              const isPast = s.attended !== null;
              return (
                <div key={s.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid #f1f5f9', gap: 8, flexWrap: 'wrap',
                }}>
                  <div style={{ fontSize: '.82rem' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{s.session_date}</span>
                    <span style={{ color: '#64748b', marginRight: 6 }}>· {s.teacher_name} · {s.start_time?.slice(0,5)}</span>
                    {s.subject && <span style={{ color: '#94a3b8' }}>· {s.subject}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {s.notes && (
                      <span style={{ fontSize: '.68rem', background: '#fef9c3', color: '#92400e',
                        padding: '2px 6px', borderRadius: 8, fontWeight: 600 }}>📝 ملاحظة</span>
                    )}
                    {isPast ? (
                      <span style={{
                        fontSize: '.72rem', fontWeight: 800,
                        background: s.attended ? '#dcfce7' : '#fee2e2',
                        color: s.attended ? '#15803d' : '#b91c1c',
                        padding: '3px 10px', borderRadius: 20,
                      }}>{s.attended ? '✓ حضر' : '✗ غاب'}</span>
                    ) : (
                      <span style={{ fontSize: '.72rem', fontWeight: 700,
                        background: s.status==='active' ? '#dcfce7' : '#eff6ff',
                        color: s.status==='active' ? '#15803d' : '#1d4ed8',
                        padding: '3px 10px', borderRadius: 20 }}>
                        {s.status==='active' ? '🟢 جارية' : '⏳ قادمة'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Homework ── */}
        {homework.length > 0 && (
          <div className="sv-card">
            <div className="sv-sec-h">📋 الواجبات ({homework.length})</div>
            {homework.map(h => {
              const isOverdue = h.status !== 'done' && h.due_date && h.due_date < today;
              return (
                <div key={h.id} className="sv-hw">
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: h.status==='done' ? '#dcfce7' : isOverdue ? '#fee2e2' : '#eff6ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem',
                  }}>
                    {h.status==='done' ? '✅' : isOverdue ? '⚠️' : '📌'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '.88rem', color: '#1e293b', marginBottom: 2 }}>
                      {h.title}
                    </div>
                    <div style={{ fontSize: '.75rem', color: '#64748b' }}>
                      {h.teacher_name}
                      {h.due_date && <span style={{ marginRight: 8 }}>· تسليم: {h.due_date}</span>}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '.72rem', fontWeight: 800, flexShrink: 0,
                    background: h.status==='done' ? '#dcfce7' : isOverdue ? '#fee2e2' : '#f1f5f9',
                    color: h.status==='done' ? '#15803d' : isOverdue ? '#b91c1c' : '#475569',
                    padding: '3px 10px', borderRadius: 20,
                  }}>
                    {h.status==='done' ? 'أنجز' : isOverdue ? 'متأخر' : 'معلق'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Session notes ── */}
        {sessionNotes.length > 0 && (
          <div className="sv-card">
            <div className="sv-sec-h">📝 ملاحظات المعلمين ({sessionNotes.length})</div>
            {sessionNotes.map(n => (
              <div key={n.id} style={{
                background: '#fffbeb', border: '1.5px solid #fcd34d',
                borderRadius: 12, padding: '12px 16px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', gap: 10, fontSize: '.78rem',
                  color: '#92400e', fontWeight: 700, marginBottom: 8 }}>
                  <span>{n.session_date}</span>
                  <span>· {n.teacher_name}</span>
                  {n.subject && <span>· {n.subject}</span>}
                </div>
                <div style={{ fontSize: '.88rem', color: '#451a03', lineHeight: 1.8,
                  borderRight: '3px solid #f59e0b', paddingRight: 12 }}>
                  {n.notes}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Streak ── */}
        <div className="sv-card" style={{
          background: streakCount > 0 ? 'linear-gradient(135deg,#fff7ed,#fef3c7)' : '#fff',
          border: streakCount > 0 ? '2px solid #fcd34d' : '1.5px solid #e2e8f0',
        }}>
          <div className="sv-sec-h">🔥 النشاط اليومي</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 900,
                color: streakCount > 0 ? '#b45309' : '#94a3b8' }}>{streakCount}</div>
              <div style={{ fontSize: '.78rem', color: '#92400e', fontWeight: 700 }}>يوم متتالي</div>
            </div>
            <div style={{ flex: 1, fontSize: '.82rem', color: '#64748b', lineHeight: 2 }}>
              <div>📅 إجمالي أيام النشاط: <strong style={{ color: '#1e293b' }}>{logDates.length}</strong></div>
              <div>{loggedToday
                ? '✅ سجّل نشاطاً اليوم'
                : '⏸️ لم يسجّل نشاطاً اليوم'}</div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
