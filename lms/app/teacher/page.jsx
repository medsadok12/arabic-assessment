'use client';
import { useEffect, useRef, useState } from 'react';
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

const EMPTY_FORM = { studentName: '', studentEmail: '', sessionDate: '', startTime: '', durationMinutes: '60', subject: '' };

export default function TeacherPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [user,     setUser]     = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]     = useState(EMPTY_FORM);
  const [saving,    setSaving]   = useState(false);
  const [msg,       setMsg]      = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/auth/login'); return; }
      if (u.user_metadata?.role !== 'teacher') { router.push('/dashboard'); return; }
      setUser(u);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch('/api/teacher/sessions')
      .then(r => r.json())
      .then(d => { setSessions(d.sessions ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);

  const upcoming = sessions.filter(s => s.status === 'scheduled' && s.session_date >= today);
  const past     = sessions.filter(s => s.status !== 'scheduled' || s.session_date < today);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.studentName || !form.sessionDate || !form.startTime) {
      setMsg({ type: 'error', text: 'يرجى ملء الحقول المطلوبة' }); return;
    }
    setSaving(true); setMsg(null);
    const res  = await fetch('/api/teacher/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, durationMinutes: parseInt(form.durationMinutes) || 60 }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg({ type: 'error', text: data.error }); setSaving(false); return; }
    setSessions(prev => [...prev, data.session].sort((a, b) => a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time)));
    setForm(EMPTY_FORM); setShowModal(false);
    setMsg({ type: 'success', text: '✅ تمّت جدولة الحصة بنجاح' + (form.studentEmail ? ' وأُرسل إيميل للطالب' : '') });
    setSaving(false);
  }

  async function handleCancel(id) {
    if (!confirm('هل تريد إلغاء هذه الحصة؟')) return;
    setCancelling(id);
    const res = await fetch('/api/teacher/sessions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
    setCancelling(null);
  }

  function joinSession(roomName) {
    window.open(`https://meet.jit.si/${roomName}`, '_blank', 'noopener');
  }

  if (!user) return null;

  const displayName = user.user_metadata?.full_name ?? user.email;

  return (
    <>
      <style>{`
        .teacher-wrap { max-width: 860px; margin: 0 auto; padding: 32px 20px; direction: rtl; }
        .session-card { background: #fff; border-radius: 14px; border: 1.5px solid var(--border);
          padding: 18px 20px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .session-card:hover { box-shadow: 0 4px 18px rgba(24,95,165,.10); }
        .session-info { flex: 1; min-width: 200px; }
        .session-subject { font-weight: 800; font-size: 1rem; color: var(--text); margin-bottom: 4px; }
        .session-meta { font-size: .84rem; color: var(--muted); display: flex; flex-wrap: wrap; gap: 12px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-box { background: #fff; border-radius: 18px; padding: 32px 28px; width: 100%; max-width: 480px;
          max-height: 90vh; overflow-y: auto; }
      `}</style>

      <Navbar user={user} />
      <div className="teacher-wrap">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
              👨‍🏫 لوحة المعلم
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>مرحباً {displayName}</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setMsg(null); }}
            className="btn btn-primary"
            style={{ marginRight: 'auto' }}>
            + جدولة حصة جديدة
          </button>
        </div>

        {msg && (
          <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 20 }}>
            {msg.text}
          </div>
        )}

        {/* Upcoming Sessions */}
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 14, color: 'var(--text)' }}>
          📅 الحصص القادمة ({upcoming.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>جارٍ التحميل...</div>
        ) : upcoming.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px', marginBottom: 28 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📭</div>
            <p style={{ color: 'var(--muted)' }}>لا توجد حصص قادمة — جدول حصة جديدة!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            {upcoming.map(s => (
              <div key={s.id} className="session-card">
                <div style={{ fontSize: '2rem' }}>🎥</div>
                <div className="session-info">
                  <div className="session-subject">{s.subject || 'حصة عامة'}</div>
                  <div className="session-meta">
                    <span>👤 {s.student_name}</span>
                    <span>📅 {fmtDate(s.session_date)}</span>
                    <span>⏰ {s.start_time?.slice(0, 5)}</span>
                    <span>⏱️ {s.duration_minutes} دقيقة</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => joinSession(s.room_name)}
                    className="btn btn-primary btn-sm">
                    ابدأ الحصة 🎥
                  </button>
                  <button
                    onClick={() => handleCancel(s.id)}
                    disabled={cancelling === s.id}
                    className="btn btn-outline btn-sm"
                    style={{ color: '#e53e3e', borderColor: '#e53e3e' }}>
                    {cancelling === s.id ? '...' : 'إلغاء'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Past Sessions */}
        {past.length > 0 && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--muted)' }}>
              السابقة ({past.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {past.slice(0, 10).map(s => (
                <div key={s.id} className="session-card" style={{ opacity: .65 }}>
                  <div style={{ fontSize: '1.6rem' }}>{s.status === 'cancelled' ? '❌' : '✅'}</div>
                  <div className="session-info">
                    <div className="session-subject">{s.subject || 'حصة عامة'}</div>
                    <div className="session-meta">
                      <span>👤 {s.student_name}</span>
                      <span>📅 {fmtDate(s.session_date)}</span>
                      <span>⏰ {s.start_time?.slice(0, 5)}</span>
                      <span style={{ color: s.status === 'cancelled' ? '#e53e3e' : '#1a7c40', fontWeight: 700 }}>
                        {s.status === 'cancelled' ? 'ملغية' : 'منتهية'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" dir="rtl">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20, color: 'var(--primary)' }}>
              📅 جدولة حصة جديدة
            </h2>
            <form onSubmit={handleCreate}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                <div className="alert alert-error" style={{ marginBottom: 14 }}>{msg.text}</div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                  {saving ? 'جارٍ الجدولة...' : '✅ جدولة الحصة'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
