'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import Navbar from '../../components/Navbar';

const TIME_SLOTS = Array.from({ length: 29 }, (_, i) => {
  const mins = 7 * 60 + i * 30;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS_AR[parseInt(m) - 1]} ${y}`;
}

function sessionMessage(s, teacherName) {
  return `📚 *دعوة حصة — أكاديمية عارم*\n\nالموضوع: ${s.subject || 'حصة عامة'}\nالمعلم: ${teacherName}\nالتاريخ: ${fmtDate(s.session_date)}\nالوقت: ${s.start_time?.slice(0,5)}\nالمدة: ${s.duration_minutes} دقيقة\n\n🎥 رابط الانضمام:\nhttps://meet.jit.si/${s.room_name}`;
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
  const [inviteFor,    setInviteFor]    = useState(null);   // session being invited to
  const [inviteForm,   setInviteForm]   = useState(EMPTY_INVITE);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteMsg,    setInviteMsg]    = useState(null);

  const set       = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setInv    = k => e => setInviteForm(p => ({ ...p, [k]: e.target.value }));

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
    ]).then(([sd, st]) => {
      setSessions(sd.sessions ?? []);
      setStudents(st.students ?? []);
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

  // ── Invite extra student ──
  function openInvite(s) { setInviteFor(s); setInviteForm(EMPTY_INVITE); setInviteMsg(null); }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteForm.studentEmail) { setInviteMsg({ type: 'error', text: 'البريد مطلوب' }); return; }
    setInviteSaving(true); setInviteMsg(null);
    const s = inviteFor;
    const res = await fetch('/api/teacher/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: inviteForm.studentName || 'الطالب',
        studentEmail: inviteForm.studentEmail,
        teacherName: user.user_metadata?.full_name ?? user.email,
        sessionDate: s.session_date, startTime: s.start_time,
        durationMinutes: s.duration_minutes, subject: s.subject,
        roomName: s.room_name,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setInviteMsg({ type: 'error', text: data.error }); setInviteSaving(false); return; }
    setInviteMsg({ type: 'success', text: '✅ أُرسل الإيميل بنجاح' });
    setInviteSaving(false);
  }

  // ── Copy / WhatsApp ──
  function copyLink(s) {
    navigator.clipboard.writeText(`https://meet.jit.si/${s.room_name}`);
    setCopied(`link-${s.id}`);
    setTimeout(() => setCopied(null), 2000);
  }

  function copyMessage(s) {
    navigator.clipboard.writeText(sessionMessage(s, user.user_metadata?.full_name ?? user.email));
    setCopied(`msg-${s.id}`);
    setTimeout(() => setCopied(null), 2000);
  }

  function shareWhatsApp(s) {
    const text = encodeURIComponent(sessionMessage(s, user.user_metadata?.full_name ?? user.email));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }

  if (!user) return null;
  const displayName = user.user_metadata?.full_name ?? user.email;

  return (
    <>
      <style>{`
        .tw { max-width: 900px; margin: 0 auto; padding: 32px 20px; direction: rtl; }
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
        .tab-bar { display:flex; gap:4px; background:#f0f4f8; border-radius:10px; padding:4px; margin-bottom:24px; }
        .tab-btn { flex:1; padding:8px 0; border:none; background:transparent; border-radius:7px;
                   font-family:inherit; font-size:.88rem; font-weight:700; cursor:pointer; color:var(--muted); transition:.15s; }
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
        .sc-actions { display:flex; gap:5px; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end; align-items:center; }
        .action-row { display:flex; gap:5px; flex-wrap:wrap; justify-content:flex-end; }
        .invite-panel { margin-top:10px; background:#f0f7ff; border-radius:10px; padding:12px 14px;
                        border:1px solid #bcd4f0; width:100%; }
        .invite-row { display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap; margin-top:8px; }
        .invite-row input { flex:1; min-width:140px; }
      `}</style>

      <Navbar user={user} />
      <div className="tw">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--primary)', marginBottom:4 }}>👨‍🏫 لوحة المعلم</h1>
            <p style={{ color:'var(--muted)', fontSize:'.88rem' }}>مرحباً {displayName}</p>
          </div>
          <button onClick={openCreate} className="btn btn-primary" style={{ marginRight:'auto' }}>
            + جدولة حصة جديدة
          </button>
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

        {/* Tabs */}
        <div className="tab-bar">
          <button className={`tab-btn${activeTab === 'sessions' ? ' active' : ''}`} onClick={() => setActiveTab('sessions')}>
            📅 الحصص ({upcoming.length})
          </button>
          <button className={`tab-btn${activeTab === 'students' ? ' active' : ''}`} onClick={() => setActiveTab('students')}>
            👥 طلابي ({students.length})
          </button>
          <button className={`tab-btn${activeTab === 'past' ? ' active' : ''}`} onClick={() => setActiveTab('past')}>
            📋 السابقة ({past.length})
          </button>
        </div>

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

                        {/* Invite panel */}
                        {inviteFor?.id === s.id && (
                          <div className="invite-panel">
                            <div style={{ fontSize:'.87rem', fontWeight:700, color:'var(--primary)', marginBottom:6 }}>
                              📨 دعوة طالب إضافي لنفس الحصة
                            </div>
                            <form onSubmit={handleInvite}>
                              <div className="invite-row">
                                <input className="form-input" type="text" placeholder="اسم الطالب (اختياري)"
                                  value={inviteForm.studentName} onChange={setInv('studentName')}
                                  style={{ fontSize:'.85rem', padding:'7px 10px' }} />
                                <input className="form-input" type="email" placeholder="البريد الإلكتروني *"
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

                      {/* Action buttons */}
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
                          <button onClick={() => shareWhatsApp(s)} title="مشاركة عبر واتساب" className="icon-btn">
                            💬
                          </button>
                          <button onClick={() => inviteFor?.id === s.id ? setInviteFor(null) : openInvite(s)}
                            title="دعوة طالب إضافي" className="icon-btn"
                            style={{ color: inviteFor?.id === s.id ? 'var(--primary)' : 'var(--muted)' }}>
                            📨
                          </button>
                          <button onClick={() => openEdit(s)} title="تعديل" className="icon-btn">✏️</button>
                        </div>
                        <div className="action-row" style={{ marginTop:4 }}>
                          <button onClick={() => window.open(`https://meet.jit.si/${s.room_name}`, '_blank', 'noopener')}
                            className="btn btn-primary btn-sm">
                            ابدأ الحصة 🎥
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
                        <th>الطالب</th>
                        <th>البريد الإلكتروني</th>
                        <th style={{ textAlign:'center' }}>الحصص</th>
                        <th style={{ textAlign:'center' }}>آخر مستوى</th>
                        <th style={{ textAlign:'center' }}>آخر نتيجة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((st, i) => {
                        const latest = st.assessments?.[0];
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight:700 }}>{st.name}</td>
                            <td style={{ direction:'ltr', textAlign:'right', color:'var(--muted)', fontSize:'.82rem' }}>
                              {st.email
                                ? <a href={`mailto:${st.email}`} style={{ color:'var(--accent)' }}>{st.email}</a>
                                : '—'}
                            </td>
                            <td style={{ textAlign:'center' }}>
                              <span className="badge badge-blue">{st.sessions}</span>
                            </td>
                            <td style={{ textAlign:'center' }}>
                              {latest
                                ? <span className="badge badge-blue">المستوى {latest.level}</span>
                                : <span style={{ color:'var(--muted)' }}>—</span>}
                            </td>
                            <td style={{ textAlign:'center' }}>
                              {latest != null
                                ? <span className={`badge ${(latest.score ?? 0) >= 70 ? 'badge-green' : 'badge-orange'}`}>
                                    {latest.score ?? 0}%
                                  </span>
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
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {past.slice(0, 20).map(s => (
                    <div key={s.id} className="sc" style={{ opacity:.7 }}>
                      <div style={{ fontSize:'1.6rem' }}>{s.status === 'cancelled' ? '❌' : '✅'}</div>
                      <div className="si">
                        <div className="ss">{s.subject || 'حصة عامة'}</div>
                        <div className="sm">
                          <span>👤 {s.student_name}</span>
                          <span>📅 {fmtDate(s.session_date)}</span>
                          <span>⏰ {s.start_time?.slice(0, 5)}</span>
                          <span style={{ color: s.status === 'cancelled' ? '#e53e3e' : '#1a7c40', fontWeight:700 }}>
                            {s.status === 'cancelled' ? 'ملغية' : 'منتهية'}
                          </span>
                        </div>
                        {s.student_email && <div className="se">✉️ {s.student_email}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* ── Session Create/Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" dir="rtl">
            <h2 style={{ fontSize:'1.2rem', fontWeight:800, marginBottom:20, color:'var(--primary)' }}>
              {editSession ? '✏️ تعديل الحصة' : '📅 جدولة حصة جديدة'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">اسم الطالب *</label>
                <input className="form-input" type="text" placeholder="اسم الطالب"
                  value={form.studentName} onChange={set('studentName')} required />
              </div>
              <div className="form-group">
                <label className="form-label">بريد الطالب (اختياري — لإرسال رابط الحصة)</label>
                <input className="form-input" type="email" placeholder="student@example.com"
                  value={form.studentEmail} onChange={set('studentEmail')} dir="ltr" />
              </div>
              <div className="form-group">
                <label className="form-label">موضوع الحصة (اختياري)</label>
                <input className="form-input" type="text" placeholder="مثال: قواعد النحو، القراءة..."
                  value={form.subject} onChange={set('subject')} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">التاريخ *</label>
                  <input className="form-input" type="date" min={today}
                    value={form.sessionDate} onChange={set('sessionDate')} required />
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
              {msg?.type === 'error' && (
                <div className="alert alert-error" style={{ marginBottom:14 }}>{msg.text}</div>
              )}
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}
                  style={{ flex:1, justifyContent:'center' }}>
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
