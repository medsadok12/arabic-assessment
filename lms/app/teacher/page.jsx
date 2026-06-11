'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import TeacherSpace from '../../components/TeacherSpace';
import LifeSceneSimulator from '../../components/LifeSceneSimulator';
import NotificationBell from '../../components/NotificationBell';
import StudentProfilePanel from '../../components/StudentProfilePanel';

const TIME_SLOTS = Array.from({ length: 29 }, (_, i) => {
  const mins = 7 * 60 + i * 30;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAYS_AR   = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS_AR[parseInt(m) - 1]} ${y}`;
}
function fmtDateShort(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS_AR[parseInt(m) - 1]}`;
}
function dayName(iso) {
  return DAYS_AR[new Date(iso).getDay()];
}

function joinLink(s) {
  return s.meet_link || `https://meet.jit.si/${s.room_name}`;
}

function sessionMessage(s, teacherName) {
  return `📚 *دعوة حصة — أكاديمية عارم*\n\nالموضوع: ${s.subject || 'حصة عامة'}\nالمعلم: ${teacherName}\nالتاريخ: ${fmtDate(s.session_date)}\nالوقت: ${s.start_time?.slice(0,5)}\nالمدة: ${s.duration_minutes} دقيقة\n\n🎥 رابط الانضمام:\n${joinLink(s)}`;
}

const EMPTY_FORM   = { studentName: '', studentEmail: '', sessionDate: '', startTime: '', durationMinutes: '60', subject: '' };
const EMPTY_INVITE = { studentName: '', studentEmail: '' };

export default function TeacherPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [user,         setUser]         = useState(null);
  const [sessions,     setSessions]     = useState([]);
  const [students,     setStudents]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [editSession,  setEditSession]  = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState(null);
  const [cancelling,   setCancelling]   = useState(null);
  const [copied,       setCopied]       = useState(null);
  const [activeTab,    setActiveTab]    = useState('sessions');
  const [inviteFor,    setInviteFor]    = useState(null);
  const [inviteForm,   setInviteForm]   = useState(EMPTY_INVITE);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteMsg,    setInviteMsg]    = useState(null);
  // Notes state
  const [notesFor,     setNotesFor]     = useState(null);
  const [notesText,    setNotesText]    = useState('');
  const [notesSaving,  setNotesSaving]  = useState(false);
  // Complete session state
  const [completeFor,    setCompleteFor]    = useState(null);
  const [recordingUrl,   setRecordingUrl]   = useState('');
  const [completeSaving, setCompleteSaving] = useState(false);
  // Calendar week offset
  const [weekOffset,   setWeekOffset]   = useState(0);
  // Student profile panel
  const [profileStudent, setProfileStudent] = useState(null);
  // Homework state
  const [homework,     setHomework]     = useState([]);
  const [hwForm,       setHwForm]       = useState({ title:'', description:'', student_email:'', student_name:'', due_date:'' });
  const [hwSaving,     setHwSaving]     = useState(false);
  const [hwMsg,        setHwMsg]        = useState(null);

  const set    = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setInv = k => e => setInviteForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/auth/login'); return; }
      if (u.user_metadata?.role !== 'teacher') { router.push('/dashboard'); return; }
      setUser(u);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch('/api/teacher/sessions').then(r => r.json()),
      fetch('/api/teacher/students').then(r => r.json()),
      fetch('/api/teacher/homework').then(r => r.json()),
    ]).then(([sd, st, hw]) => {
      setSessions(sd.sessions ?? []);
      setStudents(st.students ?? []);
      setHomework(hw.homework ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const today      = new Date().toISOString().slice(0, 10);
  const upcoming   = sessions.filter(s => s.status === 'scheduled' && s.session_date >= today);
  const past       = sessions.filter(s => s.status !== 'scheduled' || s.session_date < today);

  const weekStart  = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); })();
  const monthStart = new Date().toISOString().slice(0, 7) + '-01';
  const thisWeek   = upcoming.filter(s => s.session_date >= weekStart).length;
  const thisMonth  = upcoming.filter(s => s.session_date >= monthStart).length;
  const totalStudents = new Set(sessions.map(s => s.student_email || s.student_name)).size;

  // ── Calendar helpers ──
  const calWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + i + weekOffset * 7);
    return d.toISOString().slice(0, 10);
  });

  // ── Session modal ──
  function openCreate() { setForm(EMPTY_FORM); setEditSession(null); setShowModal(true); setMsg(null); }
  function openEdit(s) {
    setForm({
      studentName: s.student_name, studentEmail: s.student_email ?? '',
      sessionDate: s.session_date, startTime: s.start_time?.slice(0, 5),
      durationMinutes: String(s.duration_minutes), subject: s.subject ?? '',
    });
    setEditSession(s); setShowModal(true); setMsg(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.studentName || !form.sessionDate || !form.startTime) {
      setMsg({ type: 'error', text: 'يرجى ملء الحقول المطلوبة' }); return;
    }
    setSaving(true); setMsg(null);
    const method = editSession ? 'PATCH' : 'POST';
    const body   = editSession
      ? { id: editSession.id, ...form, durationMinutes: parseInt(form.durationMinutes) || 60 }
      : { ...form, durationMinutes: parseInt(form.durationMinutes) || 60 };

    const res  = await fetch('/api/teacher/sessions', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setMsg({ type: 'error', text: data.error }); setSaving(false); return; }

    if (editSession) {
      setSessions(prev => prev.map(s => s.id === editSession.id ? data.session : s));
      setMsg({ type: 'success', text: '✅ تمّ تعديل الحصة بنجاح' });
    } else {
      setSessions(prev => [...prev, data.session].sort((a, b) =>
        a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time)));
      setMsg({ type: 'success', text: '✅ تمّت جدولة الحصة' + (form.studentEmail ? ' وأُرسل إيميل للطالب' : '') });
    }
    setShowModal(false); setSaving(false);
  }

  async function handleCancel(id) {
    if (!confirm('هل تريد إلغاء هذه الحصة؟')) return;
    setCancelling(id);
    const res = await fetch('/api/teacher/sessions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (res.ok) setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
    setCancelling(null);
  }

  // ── Notes ──
  function openNotes(s) { setNotesFor(s.id); setNotesText(s.notes || ''); }

  async function saveNotes() {
    setNotesSaving(true);
    const res = await fetch('/api/teacher/sessions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notesFor, notes: notesText }),
    });
    if (res.ok) {
      setSessions(prev => prev.map(s => s.id === notesFor ? { ...s, notes: notesText } : s));
      setNotesFor(null);
    }
    setNotesSaving(false);
  }

  // ── Complete session ──
  function openComplete(s) { setCompleteFor(s); setRecordingUrl(''); }

  async function handleComplete() {
    setCompleteSaving(true);
    const res = await fetch('/api/teacher/sessions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: completeFor.id, status: 'completed', recording_url: recordingUrl || null }),
    });
    if (res.ok) {
      setSessions(prev => prev.map(s => s.id === completeFor.id
        ? { ...s, status: 'completed', recording_url: recordingUrl || null } : s));
      setCompleteFor(null);
    }
    setCompleteSaving(false);
  }

  // ── Invite ──
  function openInvite(s) { setInviteFor(s); setInviteForm(EMPTY_INVITE); setInviteMsg(null); }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteForm.studentEmail) { setInviteMsg({ type: 'error', text: 'البريد مطلوب' }); return; }
    setInviteSaving(true); setInviteMsg(null);
    const s = inviteFor;
    const res = await fetch('/api/teacher/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: inviteForm.studentName || 'الطالب', studentEmail: inviteForm.studentEmail,
        teacherName: user.user_metadata?.full_name ?? user.email,
        sessionDate: s.session_date, startTime: s.start_time,
        durationMinutes: s.duration_minutes, subject: s.subject, roomName: s.room_name, meetLink: s.meet_link,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setInviteMsg({ type: 'error', text: data.error }); setInviteSaving(false); return; }
    setInviteMsg({ type: 'success', text: '✅ أُرسل الإيميل بنجاح' });
    setInviteSaving(false);
  }

  // ── Copy / WhatsApp ──
  function copyLink(s) {
    navigator.clipboard.writeText(joinLink(s));
    setCopied(`link-${s.id}`); setTimeout(() => setCopied(null), 2000);
  }
  function copyMessage(s) {
    navigator.clipboard.writeText(sessionMessage(s, user.user_metadata?.full_name ?? user.email));
    setCopied(`msg-${s.id}`); setTimeout(() => setCopied(null), 2000);
  }
  function shareWhatsApp(s) {
    window.open(`https://wa.me/?text=${encodeURIComponent(sessionMessage(s, user.user_metadata?.full_name ?? user.email))}`, '_blank', 'noopener');
  }

  if (!user) return null;
  const displayName = user.user_metadata?.full_name ?? user.email;

  return (
    <>
      <style>{`
        .tw { max-width: 1100px; margin: 0 auto; padding: 32px 20px; direction: rtl; }
        .sc { background:#fff; border-radius:14px; border:1.5px solid var(--border);
              padding:16px 20px; display:flex; align-items:flex-start; gap:14px; flex-wrap:wrap; }
        .sc:hover { box-shadow:0 4px 18px rgba(24,95,165,.10); }
        .si { flex:1; min-width:180px; }
        .ss { font-weight:800; font-size:.97rem; color:var(--text); margin-bottom:3px; }
        .sm { font-size:.83rem; color:var(--muted); display:flex; flex-wrap:wrap; gap:10px; }
        .se { font-size:.79rem; color:var(--accent); margin-top:3px; }
        .stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:12px; margin-bottom:28px; }
        .stat-b { background:#fff; border:1.5px solid var(--border); border-radius:12px; padding:14px 16px; text-align:center; }
        .stat-v { font-size:1.45rem; font-weight:900; color:var(--primary); }
        .stat-l { font-size:.76rem; color:var(--muted); margin-top:2px; }
        /* Sidebar layout */
        .tw-body { display:flex; gap:20px; align-items:flex-start; }
        .tw-sidebar {
          width: 180px; flex-shrink:0;
          background:#fff; border-radius:16px;
          border:1.5px solid var(--border);
          padding:10px 8px;
          position:sticky; top:80px;
          box-shadow:0 2px 12px rgba(24,95,165,.06);
        }
        .tw-content { flex:1; min-width:0; }
        .side-btn {
          display:flex; align-items:center; gap:9px;
          width:100%; padding:10px 12px;
          border:none; background:transparent; border-radius:10px;
          font-family:inherit; font-size:.88rem; font-weight:600;
          cursor:pointer; color:#475569; text-align:right;
          transition:.15s; white-space:nowrap;
        }
        .side-btn:hover { background:#f0f4f8; color:var(--primary); }
        .side-btn.active { background:var(--primary); color:#fff; font-weight:800; }
        .side-btn .badge {
          margin-right:auto; background:rgba(255,255,255,.25);
          border-radius:20px; padding:1px 7px;
          font-size:.75rem; font-weight:700;
        }
        .side-btn:not(.active) .badge { background:#eef5ff; color:var(--primary); }
        .side-sep { height:1px; background:var(--border); margin:6px 4px; }
        .side-link {
          display:flex; align-items:center; gap:9px;
          width:100%; padding:10px 12px;
          border:none; background:#fffbeb; border-radius:10px;
          font-family:inherit; font-size:.88rem; font-weight:700;
          cursor:pointer; color:#92400e; text-align:right;
          text-decoration:none; margin-top:4px;
          border:1.5px solid #fde68a;
          transition:.15s;
        }
        .side-link:hover { background:#fef3c7; }
        @media(max-width:680px) {
          .tw-body { flex-direction:column; }
          .tw-sidebar { width:100%; position:static; display:flex; flex-wrap:wrap; gap:4px; padding:8px; }
          .side-btn { flex:1; min-width:80px; justify-content:center; }
          .side-sep { display:none; }
          .side-link { flex:1; min-width:120px; justify-content:center; }
        }
        .tab-btn.active { background:#fff; color:var(--primary); box-shadow:0 1px 6px rgba(0,0,0,.1); }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000;
                         display:flex; align-items:center; justify-content:center; padding:20px; }
        .modal-box { background:#fff; border-radius:18px; padding:32px 28px; width:100%; max-width:480px;
                     max-height:90vh; overflow-y:auto; }
        .stu-table { width:100%; border-collapse:collapse; font-size:.88rem; }
        .stu-table th { background:var(--primary); color:#fff; padding:9px 14px; text-align:right; font-weight:700; }
        .stu-table td { padding:9px 14px; border-bottom:1px solid var(--border); vertical-align:middle; }
        .stu-table tr:last-child td { border-bottom:none; }
        .stu-table tr:nth-child(even) td { background:#f9fbff; }
        .icon-btn { background:transparent; border:none; cursor:pointer; font-size:1.05rem; padding:5px 7px;
                    border-radius:6px; transition:.15s; line-height:1; }
        .icon-btn:hover { background:#f0f4f8; }
        .sc-actions { display:flex; gap:5px; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end; align-items:flex-start; }
        .action-row { display:flex; gap:5px; flex-wrap:wrap; justify-content:flex-end; }
        .invite-panel { margin-top:10px; background:#f0f7ff; border-radius:10px; padding:12px 14px;
                        border:1px solid #bcd4f0; width:100%; }
        .invite-row { display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap; margin-top:8px; }
        .invite-row input { flex:1; min-width:130px; }
        .notes-box { margin-top:10px; background:#fffbeb; border-radius:10px; padding:12px 14px;
                     border:1px solid #fcd34d; width:100%; }
        /* Calendar */
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; }
        .cal-day { border-radius:10px; border:1.5px solid var(--border); overflow:hidden; min-height:80px; }
        .cal-day-hdr { padding:6px 8px; font-size:.76rem; font-weight:800; text-align:center; }
        .cal-day-hdr.today { background:var(--primary); color:#fff; }
        .cal-day-hdr.has-sessions { background:#eef5ff; color:var(--primary); }
        .cal-day-hdr.empty { background:#f8fafc; color:var(--muted); }
        .cal-session { padding:4px 6px; font-size:.72rem; background:var(--accent); color:#fff;
                       border-radius:4px; margin:4px; font-weight:700; }
        .cal-session.cancelled { background:#e53e3e; }
        @media(max-width:600px) { .cal-grid { grid-template-columns:repeat(3,1fr); } }
      `}</style>

      <Navbar user={user} />
      <div className="tw">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--primary)', marginBottom:4 }}>👨‍🏫 لوحة المعلم</h1>
            <p style={{ color:'var(--muted)', fontSize:'.88rem' }}>مرحباً {displayName}</p>
          </div>
          <div style={{ marginRight:'auto', display:'flex', alignItems:'center', gap:10 }}>
            <NotificationBell userId={user?.id} role={user?.user_metadata?.role} lang="ar" />
            <button onClick={openCreate} className="btn btn-primary">
              + جدولة حصة جديدة
            </button>
          </div>
        </div>

        {msg && !showModal && (
          <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom:20 }}>
            {msg.text}
          </div>
        )}

        {/* Stats */}
        <div className="stat-grid">
          {[
            { icon:'📅', val: upcoming.length,   lbl:'حصص قادمة'     },
            { icon:'📆', val: thisWeek,           lbl:'هذا الأسبوع'   },
            { icon:'🗓️', val: thisMonth,          lbl:'هذا الشهر'     },
            { icon:'👥', val: totalStudents,      lbl:'إجمالي الطلاب' },
            { icon:'✅', val: past.filter(s => s.status !== 'cancelled').length, lbl:'حصص منجزة' },
          ].map(s => (
            <div key={s.lbl} className="stat-b">
              <div style={{ fontSize:'1.3rem' }}>{s.icon}</div>
              <div className="stat-v">{s.val}</div>
              <div className="stat-l">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Body: sidebar + content */}
        <div className="tw-body">

          {/* ── Sidebar ── */}
          <nav className="tw-sidebar">
            {[
              { key:'sessions', icon:'📅', label:'الحصص',   count: upcoming.length },
              { key:'calendar', icon:'🗓️', label:'التقويم', count: null },
              { key:'students', icon:'👥', label:'طلابي',   count: students.length },
              { key:'past',     icon:'📋', label:'السابقة', count: past.length },
              { key:'homework', icon:'📝', label:'الواجبات', count: homework.filter(h => h.status === 'pending').length || null },
            ].map(t => (
              <button
                key={t.key}
                className={`side-btn${activeTab === t.key ? ' active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {t.count !== null && <span className="badge">{t.count}</span>}
              </button>
            ))}
            <button
              className={`side-btn${activeTab === 'space' ? ' active' : ''}`}
              onClick={() => setActiveTab('space')}
            >
              <span>🏫</span>
              <span>فضاء المعلم</span>
            </button>
            <button
              className={`side-btn${activeTab === 'simulator' ? ' active' : ''}`}
              onClick={() => setActiveTab('simulator')}
            >
              <span>🎭</span>
              <span>مسرح التعبير</span>
            </button>
            <div className="side-sep" />
            <a href="/teacher/logbook" className="side-link">
              <span>📓</span>
              <span>كراس الدروس</span>
            </a>
          </nav>

          {/* ── Content ── */}
          <div className="tw-content">
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--muted)' }}>جارٍ التحميل...</div>
        ) : (
          <>
            {/* ── UPCOMING SESSIONS ── */}
            {activeTab === 'sessions' && (
              upcoming.length === 0 ? (
                <div className="card" style={{ textAlign:'center', padding:'40px 24px' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📭</div>
                  <p style={{ color:'var(--muted)' }}>لا توجد حصص قادمة — جدول حصة جديدة!</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {upcoming.map(s => (
                    <div key={s.id} className="sc">
                      <div style={{ fontSize:'1.8rem', paddingTop:2 }}>🎥</div>
                      <div className="si">
                        <div className="ss">{s.subject || 'حصة عامة'}</div>
                        <div className="sm">
                          <span>👤 {s.student_name}</span>
                          <span>📅 {fmtDate(s.session_date)}</span>
                          <span>⏰ {s.start_time?.slice(0, 5)}</span>
                          <span>⏱️ {s.duration_minutes} دقيقة</span>
                        </div>
                        {s.student_email && <div className="se">✉️ {s.student_email}</div>}

                        {inviteFor?.id === s.id && (
                          <div className="invite-panel">
                            <div style={{ fontSize:'.87rem', fontWeight:700, color:'var(--primary)', marginBottom:6 }}>
                              📨 دعوة طالب إضافي
                            </div>
                            <form onSubmit={handleInvite}>
                              <div className="invite-row">
                                <input className="form-input" type="text" placeholder="الاسم (اختياري)"
                                  value={inviteForm.studentName} onChange={setInv('studentName')}
                                  style={{ fontSize:'.85rem', padding:'7px 10px' }} />
                                <input className="form-input" type="email" placeholder="البريد *"
                                  value={inviteForm.studentEmail} onChange={setInv('studentEmail')}
                                  dir="ltr" style={{ fontSize:'.85rem', padding:'7px 10px' }} required />
                                <button type="submit" className="btn btn-primary btn-sm" disabled={inviteSaving}>
                                  {inviteSaving ? '...' : 'إرسال'}
                                </button>
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => setInviteFor(null)}>×</button>
                              </div>
                              {inviteMsg && (
                                <div style={{ marginTop:6, fontSize:'.83rem', color: inviteMsg.type === 'error' ? '#e53e3e' : '#1a7c40', fontWeight:600 }}>
                                  {inviteMsg.text}
                                </div>
                              )}
                            </form>
                          </div>
                        )}
                      </div>

                      <div className="sc-actions">
                        <div className="action-row">
                          <button onClick={() => copyLink(s)} title="نسخ رابط الغرفة" className="icon-btn"
                            style={{ color: copied === `link-${s.id}` ? '#1a7c40' : 'var(--muted)' }}>
                            {copied === `link-${s.id}` ? '✅' : '🔗'}
                          </button>
                          <button onClick={() => copyMessage(s)} title="نسخ رسالة جاهزة" className="icon-btn"
                            style={{ color: copied === `msg-${s.id}` ? '#1a7c40' : 'var(--muted)' }}>
                            {copied === `msg-${s.id}` ? '✅' : '📋'}
                          </button>
                          <button onClick={() => shareWhatsApp(s)} title="مشاركة عبر واتساب" className="icon-btn">💬</button>
                          <button onClick={() => inviteFor?.id === s.id ? setInviteFor(null) : openInvite(s)}
                            title="دعوة طالب إضافي" className="icon-btn"
                            style={{ color: inviteFor?.id === s.id ? 'var(--primary)' : 'var(--muted)' }}>📨</button>
                          <button onClick={() => openEdit(s)} title="تعديل" className="icon-btn">✏️</button>
                        </div>
                        <div className="action-row" style={{ marginTop:4 }}>
                          <button onClick={() => window.open(joinLink(s), '_blank', 'noopener')}
                            className="btn btn-primary btn-sm">ابدأ الحصة 🎥</button>
                          <button onClick={() => openComplete(s)}
                            className="btn btn-outline btn-sm" style={{ color:'#1a7c40', borderColor:'#1a7c40' }}>
                            ✅ أنهيت الحصة
                          </button>
                          <button onClick={() => handleCancel(s.id)} disabled={cancelling === s.id}
                            className="btn btn-outline btn-sm" style={{ color:'#e53e3e', borderColor:'#e53e3e' }}>
                            {cancelling === s.id ? '...' : 'إلغاء'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── CALENDAR ── */}
            {activeTab === 'calendar' && (
              <div>
                {/* Week navigation */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setWeekOffset(w => w - 1)}>← الأسبوع السابق</button>
                  <span style={{ fontWeight:800, fontSize:'.93rem', color:'var(--primary)' }}>
                    {weekOffset === 0 ? 'الأسبوع الحالي' : weekOffset > 0 ? `+${weekOffset} أسابيع` : `${weekOffset} أسابيع`}
                  </span>
                  <button className="btn btn-outline btn-sm" onClick={() => setWeekOffset(w => w + 1)}>الأسبوع القادم ←</button>
                </div>
                <div className="cal-grid">
                  {calWeekDays.map(dateStr => {
                    const daySessions = sessions.filter(s => s.session_date === dateStr && s.status !== 'cancelled');
                    const isToday = dateStr === today;
                    const isPast  = dateStr < today;
                    return (
                      <div key={dateStr} className="cal-day" style={{ opacity: isPast ? .6 : 1 }}>
                        <div className={`cal-day-hdr ${isToday ? 'today' : daySessions.length ? 'has-sessions' : 'empty'}`}>
                          <div>{dayName(dateStr)}</div>
                          <div style={{ fontSize:'.82rem', fontWeight: isToday ? 800 : 600 }}>{fmtDateShort(dateStr)}</div>
                        </div>
                        <div style={{ padding:4 }}>
                          {daySessions.length === 0 ? (
                            <div style={{ fontSize:'.7rem', color:'var(--muted)', textAlign:'center', padding:'8px 4px' }}>—</div>
                          ) : (
                            daySessions.map(s => (
                              <div key={s.id} className="cal-session" title={`${s.student_name} — ${s.start_time?.slice(0,5)}`}>
                                {s.start_time?.slice(0,5)} {s.subject ? `· ${s.subject}` : ''}<br/>
                                <span style={{ opacity:.85, fontWeight:400 }}>👤 {s.student_name}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STUDENTS & RESULTS ── */}
            {activeTab === 'students' && (
              students.length === 0 ? (
                <div className="card" style={{ textAlign:'center', padding:'40px 24px' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:10 }}>👥</div>
                  <p style={{ color:'var(--muted)' }}>لم تجدول أي حصص بعد</p>
                </div>
              ) : (
                <div className="card" style={{ padding:0, overflow:'hidden' }}>
                  <table className="stu-table">
                    <thead>
                      <tr>
                        <th>الطالب</th><th>البريد</th>
                        <th style={{ textAlign:'center' }}>الحصص</th>
                        <th style={{ textAlign:'center' }}>آخر مستوى</th>
                        <th style={{ textAlign:'center' }}>آخر نتيجة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((st, i) => {
                        const latest = st.assessments?.[0];
                        return (
                          <tr key={i} style={{ cursor:'pointer' }} onClick={() => setProfileStudent(st)}>
                            <td style={{ fontWeight:700, color:'var(--primary)', textDecoration:'underline dotted' }}>{st.name}</td>
                            <td style={{ direction:'ltr', textAlign:'right', color:'var(--muted)', fontSize:'.82rem' }}>
                              {st.email ? <a href={`mailto:${st.email}`} style={{ color:'var(--accent)' }}>{st.email}</a> : '—'}
                            </td>
                            <td style={{ textAlign:'center' }}><span className="badge badge-blue">{st.sessions}</span></td>
                            <td style={{ textAlign:'center' }}>
                              {latest ? <span className="badge badge-blue">المستوى {latest.level}</span> : <span style={{ color:'var(--muted)' }}>—</span>}
                            </td>
                            <td style={{ textAlign:'center' }}>
                              {latest != null
                                ? <span className={`badge ${(latest.score ?? 0) >= 70 ? 'badge-green' : 'badge-orange'}`}>{latest.score ?? 0}%</span>
                                : <span style={{ color:'var(--muted)' }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ── PAST SESSIONS ── */}
            {activeTab === 'past' && (
              past.length === 0 ? (
                <div className="card" style={{ textAlign:'center', padding:'40px 24px' }}>
                  <p style={{ color:'var(--muted)' }}>لا توجد حصص سابقة</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {(() => {
                    const marked  = past.filter(s => s.status !== 'cancelled' && s.attended !== null && s.attended !== undefined);
                    const present = marked.filter(s => s.attended === true).length;
                    return marked.length > 0 && (
                      <div style={{ background:'#f0fdf4', border:'1.5px solid #6ee7b7', borderRadius:12, padding:'10px 16px', display:'flex', gap:18, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                        <span style={{ fontWeight:800, fontSize:'.88rem', color:'#065f46' }}>📊 الحضور</span>
                        <span style={{ fontSize:'.85rem', color:'#047857' }}>✅ حضر: <strong>{present}</strong></span>
                        <span style={{ fontSize:'.85rem', color:'#b91c1c' }}>❌ غاب: <strong>{marked.length - present}</strong></span>
                        <span style={{ fontSize:'.85rem', color:'#64748b' }}>النسبة: <strong>{Math.round((present / marked.length) * 100)}%</strong></span>
                      </div>
                    );
                  })()}
                  {past.slice(0, 20).map(s => (
                    <div key={s.id} className="sc" style={{ opacity: s.status === 'cancelled' ? .6 : 1, borderColor: s.attended === true ? '#6ee7b7' : s.attended === false ? '#fca5a5' : undefined }}>
                      <div style={{ fontSize:'1.6rem', paddingTop:2 }}>{s.status === 'cancelled' ? '❌' : s.attended === true ? '✅' : s.attended === false ? '🔴' : '📋'}</div>
                      <div className="si">
                        <div className="ss">{s.subject || 'حصة عامة'}</div>
                        <div className="sm">
                          <span>👤 {s.student_name}</span>
                          <span>📅 {fmtDate(s.session_date)}</span>
                          <span>⏰ {s.start_time?.slice(0, 5)}</span>
                          <span style={{ color: s.status === 'cancelled' ? '#e53e3e' : '#1a7c40', fontWeight:700 }}>
                            {s.status === 'cancelled' ? 'ملغاة' : 'منتهية'}
                          </span>
                        </div>
                        {s.student_email && <div className="se">✉️ {s.student_email}</div>}

                        {/* Existing notes display */}
                        {s.notes && notesFor !== s.id && (
                          <div style={{ marginTop:8, padding:'8px 12px', background:'#fffbeb', borderRadius:8,
                            fontSize:'.85rem', color:'#92400e', borderRight:'3px solid #f59e0b' }}>
                            📝 {s.notes}
                          </div>
                        )}

                        {/* Notes editor */}
                        {notesFor === s.id && (
                          <div className="notes-box">
                            <div style={{ fontSize:'.85rem', fontWeight:700, color:'#92400e', marginBottom:6 }}>📝 ملاحظات الحصة</div>
                            <textarea
                              className="form-input"
                              value={notesText}
                              onChange={e => setNotesText(e.target.value)}
                              placeholder="ما تم تغطيته، أداء الطالب، التوصيات..."
                              rows={3}
                              style={{ fontSize:'.88rem', resize:'vertical', marginBottom:8 }}
                            />
                            <div style={{ display:'flex', gap:8 }}>
                              <button onClick={saveNotes} className="btn btn-primary btn-sm" disabled={notesSaving}>
                                {notesSaving ? '...' : '💾 حفظ'}
                              </button>
                              <button onClick={() => setNotesFor(null)} className="btn btn-outline btn-sm">إلغاء</button>
                            </div>
                          </div>
                        )}
                      </div>

                      {s.status !== 'cancelled' && (
                        <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0, alignItems:'flex-end' }}>
                          {/* Attendance buttons */}
                          <div style={{ display:'flex', gap:5 }}>
                            <button
                              onClick={async () => {
                                const next = s.attended === true ? null : true;
                                await fetch('/api/teacher/sessions', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: s.id, attended: next }) });
                                setSessions(prev => prev.map(x => x.id === s.id ? { ...x, attended: next } : x));
                              }}
                              style={{ padding:'4px 10px', borderRadius:20, border:'none', background: s.attended === true ? '#16a34a' : '#e2e8f0', color: s.attended === true ? '#fff' : '#64748b', fontWeight:700, fontSize:'.75rem', cursor:'pointer', fontFamily:'inherit' }}
                            >✅ حضر</button>
                            <button
                              onClick={async () => {
                                const next = s.attended === false ? null : false;
                                await fetch('/api/teacher/sessions', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: s.id, attended: next }) });
                                setSessions(prev => prev.map(x => x.id === s.id ? { ...x, attended: next } : x));
                              }}
                              style={{ padding:'4px 10px', borderRadius:20, border:'none', background: s.attended === false ? '#dc2626' : '#e2e8f0', color: s.attended === false ? '#fff' : '#64748b', fontWeight:700, fontSize:'.75rem', cursor:'pointer', fontFamily:'inherit' }}
                            >❌ غاب</button>
                          </div>
                          {/* Notes button */}
                          <button
                            onClick={() => notesFor === s.id ? setNotesFor(null) : openNotes(s)}
                            title={s.notes ? 'تعديل الملاحظة' : 'إضافة ملاحظة'}
                            className="icon-btn"
                            style={{ color: notesFor === s.id ? 'var(--primary)' : s.notes ? '#f59e0b' : 'var(--muted)' }}>
                            📝
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'space' && (
              <TeacherSpace currentUser={user} />
            )}

            {activeTab === 'simulator' && (
              <LifeSceneSimulator role="teacher" currentUser={user} />
            )}

            {/* ── HOMEWORK ── */}
            {activeTab === 'homework' && (() => {
              const today = new Date().toISOString().slice(0,10);
              async function sendHw(e) {
                e.preventDefault();
                if (!hwForm.title.trim() || !hwForm.student_email.trim()) return;
                setHwSaving(true); setHwMsg(null);
                const res  = await fetch('/api/teacher/homework', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(hwForm) });
                const data = await res.json();
                setHwSaving(false);
                if (res.ok) { setHomework(prev => [data.homework, ...prev]); setHwForm({ title:'', description:'', student_email:'', student_name:'', due_date:'' }); setHwMsg({ ok:true, text:'✅ تم إرسال الواجب' }); }
                else setHwMsg({ ok:false, text: data.error });
                setTimeout(() => setHwMsg(null), 3000);
              }
              async function deleteHw(id) {
                if (!confirm('حذف هذا الواجب؟')) return;
                await fetch('/api/teacher/homework', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
                setHomework(prev => prev.filter(h => h.id !== id));
              }
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  {/* Send form */}
                  <form onSubmit={sendHw} style={{ background:'#f8fafc', borderRadius:14, padding:'18px 20px', border:'1.5px solid var(--border)', display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ fontWeight:800, fontSize:'.95rem', color:'var(--primary)', marginBottom:2 }}>📝 إرسال واجب جديد</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <div>
                        <label className="form-label">الطالب</label>
                        <select className="form-input" value={hwForm.student_email} onChange={e => { const st = students.find(s => s.email === e.target.value); setHwForm(p => ({ ...p, student_email: e.target.value, student_name: st?.name || '' })); }} required>
                          <option value="">اختر طالباً...</option>
                          {students.map(s => <option key={s.email} value={s.email}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">تاريخ التسليم (اختياري)</label>
                        <input className="form-input" type="date" value={hwForm.due_date} onChange={e => setHwForm(p => ({ ...p, due_date: e.target.value }))} min={today}/>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">عنوان الواجب</label>
                      <input className="form-input" placeholder="مثال: اقرأ الدرس الثالث وأجب على الأسئلة" value={hwForm.title} onChange={e => setHwForm(p => ({ ...p, title: e.target.value }))} required/>
                    </div>
                    <div>
                      <label className="form-label">التفاصيل (اختياري)</label>
                      <textarea className="form-input" rows={2} placeholder="تفاصيل إضافية أو تعليمات..." value={hwForm.description} onChange={e => setHwForm(p => ({ ...p, description: e.target.value }))} style={{ resize:'vertical' }}/>
                    </div>
                    {hwMsg && <div style={{ fontSize:'.85rem', fontWeight:700, color: hwMsg.ok ? '#16a34a' : '#dc2626' }}>{hwMsg.text}</div>}
                    <button type="submit" disabled={hwSaving} className="btn btn-primary" style={{ alignSelf:'flex-start' }}>
                      {hwSaving ? '⏳ جارٍ الإرسال...' : '📤 إرسال الواجب'}
                    </button>
                  </form>

                  {/* List */}
                  {homework.length === 0 ? (
                    <div className="card" style={{ textAlign:'center', padding:'40px 24px', color:'var(--muted)' }}>لا توجد واجبات مرسلة بعد</div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {homework.map(h => {
                        const overdue = h.due_date && h.due_date < today && h.status === 'pending';
                        return (
                          <div key={h.id} style={{ background:'#fff', borderRadius:12, border:`1.5px solid ${h.status === 'done' ? '#6ee7b7' : overdue ? '#fca5a5' : 'var(--border)'}`, padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:12 }}>
                            <div style={{ fontSize:'1.4rem', paddingTop:2 }}>{h.status === 'done' ? '✅' : overdue ? '⚠️' : '📝'}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontWeight:800, fontSize:'.93rem', marginBottom:3 }}>{h.title}</div>
                              <div style={{ fontSize:'.8rem', color:'var(--muted)', display:'flex', gap:10, flexWrap:'wrap' }}>
                                <span>👤 {h.student_name || h.student_email}</span>
                                {h.due_date && <span style={{ color: overdue ? '#dc2626' : '#64748b' }}>📅 {h.due_date}</span>}
                                <span style={{ fontWeight:700, color: h.status === 'done' ? '#16a34a' : overdue ? '#dc2626' : '#64748b' }}>
                                  {h.status === 'done' ? 'تم ✓' : overdue ? 'متأخر' : 'معلق'}
                                </span>
                              </div>
                              {h.description && <div style={{ marginTop:5, fontSize:'.82rem', color:'#475569' }}>{h.description}</div>}
                            </div>
                            <button onClick={() => deleteHw(h.id)} style={{ background:'none', border:'none', color:'#e53e3e', cursor:'pointer', fontSize:'.9rem', flexShrink:0, padding:4 }}>🗑️</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
          </div>{/* tw-content */}
        </div>{/* tw-body */}
      </div>

      {/* ── Session Create/Edit Modal ── */}
      {/* ── نافذة إنهاء الحصة ── */}
      {completeFor && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCompleteFor(null)}>
          <div className="modal-box" dir="rtl">
            <h2 style={{ fontSize:'1.15rem', fontWeight:800, marginBottom:6, color:'#1a7c40' }}>✅ إنهاء الحصة</h2>
            <p style={{ fontSize:'.88rem', color:'var(--muted)', marginBottom:20 }}>
              {completeFor.subject || 'حصة عامة'} — {completeFor.student_name}
            </p>
            <div className="form-group">
              <label className="form-label">رابط تسجيل الحصة (اختياري)</label>
              <input className="form-input" type="url" dir="ltr"
                placeholder="https://drive.google.com/..."
                value={recordingUrl} onChange={e => setRecordingUrl(e.target.value)} />
              <div style={{ fontSize:'.75rem', color:'var(--muted)', marginTop:4 }}>
                يظهر للطالب في سجل حصصه السابقة
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={handleComplete} disabled={completeSaving}
                className="btn btn-primary" style={{ flex:1, justifyContent:'center', background:'#1a7c40', borderColor:'#1a7c40' }}>
                {completeSaving ? 'جارٍ الحفظ...' : '✅ تأكيد الإنهاء'}
              </button>
              <button onClick={() => setCompleteFor(null)} className="btn btn-outline">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Student Profile Panel ── */}
      {profileStudent && (
        <StudentProfilePanel
          student={profileStudent}
          onClose={() => setProfileStudent(null)}
        />
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" dir="rtl">
            <h2 style={{ fontSize:'1.2rem', fontWeight:800, marginBottom:20, color:'var(--primary)' }}>
              {editSession ? '✏️ تعديل الحصة' : '📅 جدولة حصة جديدة'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">اسم الطالب *</label>
                <input className="form-input" type="text" value={form.studentName} onChange={set('studentName')} required />
              </div>
              <div className="form-group">
                <label className="form-label">بريد الطالب الإلكتروني *</label>
                <input className="form-input" type="email" value={form.studentEmail} onChange={set('studentEmail')}
                  dir="ltr" required placeholder="student@example.com" />
                <div style={{ fontSize:'.76rem', color:'var(--muted)', marginTop:4 }}>
                  📌 مطلوب لكي تظهر الحصة في داشبورد الطالب
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">موضوع الحصة (اختياري)</label>
                <input className="form-input" type="text" placeholder="قواعد النحو، القراءة..." value={form.subject} onChange={set('subject')} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">التاريخ *</label>
                  <input className="form-input" type="date" min={today} value={form.sessionDate} onChange={set('sessionDate')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">الوقت *</label>
                  <select className="form-input" value={form.startTime} onChange={set('startTime')} required>
                    <option value="">اختر...</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">مدة الحصة</label>
                <select className="form-input" value={form.durationMinutes} onChange={set('durationMinutes')}>
                  <option value="30">30 دقيقة</option>
                  <option value="45">45 دقيقة</option>
                  <option value="60">ساعة كاملة</option>
                  <option value="90">ساعة ونصف</option>
                </select>
              </div>
              {msg?.type === 'error' && <div className="alert alert-error" style={{ marginBottom:14 }}>{msg.text}</div>}
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex:1, justifyContent:'center' }}>
                  {saving ? 'جارٍ الحفظ...' : editSession ? '✅ حفظ التعديلات' : '✅ جدولة الحصة'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
