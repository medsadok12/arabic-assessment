'use client';
import { useState, useEffect, useMemo } from 'react';

const STATUS_MAP = {
  planned:   { label: 'مخطط له',     color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: '📋' },
  taught:    { label: 'تم التدريس',  color: '#10b981', bg: '#f0fdf4', border: '#a7f3d0', icon: '✅' },
  postponed: { label: 'مؤجّل',       color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '⏸️' },
};

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`;
}

const sel = {
  padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10,
  fontSize: '.88rem', background: '#fff', fontFamily: 'inherit', color: '#1e293b', cursor: 'pointer',
};

export default function LessonLogbookView({ lang = 'ar' }) {
  const ar = lang === 'ar';

  const [teachers,        setTeachers]        = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [logs,            setLogs]            = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [filterStatus,    setFilterStatus]    = useState('');
  const [filterGroup,     setFilterGroup]     = useState('');
  const [expandedId,      setExpandedId]      = useState(null);
  const [feedbackFor,     setFeedbackFor]     = useState(null);
  const [feedbackText,    setFeedbackText]    = useState('');
  const [savingFb,        setSavingFb]        = useState(false);
  const [msg,             setMsg]             = useState(null);

  // Load teachers list from users API
  useEffect(() => {
    fetch('/api/bogga/users')
      .then(r => r.json())
      .then(data => setTeachers((data.users ?? []).filter(u => u.role === 'teacher')))
      .catch(() => {});
  }, []);

  async function loadLogs(tid) {
    if (!tid) return;
    setLoading(true);
    setLogs([]); setFilterGroup(''); setFilterStatus('');
    try {
      const res  = await fetch(`/api/lesson-logs/view?teacher_id=${tid}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch { setMsg({ type: 'error', text: ar ? 'تعذّر تحميل الكراس' : 'Failed to load logbook' }); }
    finally  { setLoading(false); }
  }

  function handleTeacherChange(tid) {
    setSelectedTeacher(tid);
    loadLogs(tid);
    setExpandedId(null);
    setFeedbackFor(null);
  }

  async function submitFeedback() {
    if (!feedbackText.trim()) return;
    setSavingFb(true);
    setMsg(null);
    try {
      const res  = await fetch(`/api/lesson-logs/${feedbackFor}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: feedbackText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogs(p => p.map(l =>
        l.id === feedbackFor
          ? { ...l, lesson_feedback: [...(l.lesson_feedback ?? []), data.feedback] }
          : l
      ));
      setFeedbackFor(null); setFeedbackText('');
      setMsg({ type: 'success', text: ar ? '✅ تم إرسال التوجيه للمعلم' : '✅ Feedback sent to teacher' });
      setTimeout(() => setMsg(null), 4000);
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally     { setSavingFb(false); }
  }

  const groups   = useMemo(() => [...new Set(logs.map(l => l.group_name))].sort(), [logs]);
  const filtered = logs.filter(l =>
    (!filterStatus || l.status     === filterStatus) &&
    (!filterGroup  || l.group_name === filterGroup)
  );

  const statsBar = selectedTeacher ? [
    { label: ar ? 'إجمالي' : 'Total',      val: logs.length,                               color: '#185FA5' },
    { label: ar ? 'مُدرَّس' : 'Taught',    val: logs.filter(l=>l.status==='taught').length,    color: '#10b981' },
    { label: ar ? 'مخطط' : 'Planned',      val: logs.filter(l=>l.status==='planned').length,   color: '#3b82f6' },
    { label: ar ? 'مؤجّل' : 'Postponed',  val: logs.filter(l=>l.status==='postponed').length, color: '#f59e0b' },
  ] : [];

  return (
    <div dir="rtl" style={{ padding: '4px 0' }}>

      {/* ── Toast ── */}
      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: '.88rem', fontWeight: 600,
          background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: msg.type === 'error' ? '#dc2626' : '#16a34a',
          border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* ── Teacher selector ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <div>
          <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 700, color: '#374151', marginBottom: 5 }}>
            {ar ? 'اختر المعلم' : 'Select Teacher'}
          </label>
          <select
            value={selectedTeacher}
            onChange={e => handleTeacherChange(e.target.value)}
            style={{ ...sel, minWidth: 220 }}
          >
            <option value="">{ar ? '— اختر معلماً —' : '— Select a teacher —'}</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
            ))}
          </select>
        </div>

        {selectedTeacher && !loading && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                {ar ? 'المجموعة' : 'Group'}
              </label>
              <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ ...sel, minWidth: 160 }}>
                <option value="">{ar ? 'كل المجموعات' : 'All Groups'}</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                {ar ? 'الحالة' : 'Status'}
              </label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...sel, minWidth: 150 }}>
                <option value="">{ar ? 'كل الحالات' : 'All Statuses'}</option>
                <option value="planned">📋 {ar ? 'مخطط له' : 'Planned'}</option>
                <option value="taught">✅ {ar ? 'تم التدريس' : 'Taught'}</option>
                <option value="postponed">⏸️ {ar ? 'مؤجّل' : 'Postponed'}</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* ── Stats bar ── */}
      {statsBar.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {statsBar.map(s => (
            <div key={s.label} style={{
              background: '#fff', border: `1.5px solid ${s.color}30`,
              borderRadius: 12, padding: '10px 18px', display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.val}</span>
              <span style={{ fontSize: '.78rem', color: '#64748b', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Placeholder ── */}
      {!selectedTeacher && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📓</div>
          <p style={{ fontSize: '.95rem', fontWeight: 500 }}>
            {ar ? 'اختر معلماً لعرض كراسه الرقمي' : 'Select a teacher to view their digital logbook'}
          </p>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '.9rem' }}>
          ⏳ {ar ? 'جارٍ التحميل…' : 'Loading…'}
        </div>
      )}

      {/* ── Empty state ── */}
      {selectedTeacher && !loading && logs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📭</div>
          <p style={{ fontSize: '.9rem' }}>
            {ar ? 'هذا المعلم لم يسجّل أي دروس بعد' : 'This teacher has no lesson logs yet'}
          </p>
        </div>
      )}

      {/* ── Feedback modal ── */}
      {feedbackFor && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '28px', width: '100%', maxWidth: 500,
            boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
              💬 {ar ? 'إضافة توجيه تربوي' : 'Add Educational Guidance'}
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '.85rem', color: '#64748b' }}>
              {ar
                ? 'سيصل هذا التوجيه للمعلم في كراسه فور الحفظ'
                : 'The teacher will see this in their logbook immediately'}
            </p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder={ar ? 'اكتب توجيهك أو ملاحظتك التربوية هنا…' : 'Write your pedagogical guidance here…'}
              rows={5}
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0',
                borderRadius: 12, fontSize: '.92rem', fontFamily: 'inherit',
                resize: 'vertical', boxSizing: 'border-box', color: '#1e293b',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setFeedbackFor(null); setFeedbackText(''); }}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}
              >
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={submitFeedback}
                disabled={savingFb || !feedbackText.trim()}
                style={{
                  background: '#185FA5', color: '#fff', border: 'none', borderRadius: 10,
                  padding: '10px 22px', fontWeight: 700, cursor: 'pointer',
                  opacity: savingFb || !feedbackText.trim() ? .6 : 1,
                }}
              >
                {savingFb ? '…' : (ar ? '📤 إرسال التوجيه' : '📤 Send Feedback')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logs list ── */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(log => {
            const st         = STATUS_MAP[log.status] ?? STATUS_MAP.planned;
            const isExpanded = expandedId === log.id;
            const fbCount    = log.lesson_feedback?.length ?? 0;

            return (
              <div key={log.id} style={{
                background: '#fff', borderRadius: 16,
                border: '1.5px solid var(--border)',
                borderRight: `4px solid ${st.color}`,
                boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                overflow: 'hidden',
              }}>
                {/* header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  style={{
                    padding: '14px 18px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: isExpanded ? '#f8fafc' : '#fff', flexWrap: 'wrap', gap: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 6 }}>
                      <CBadge bg={st.bg} color={st.color} border={st.border}>
                        {st.icon} {st.label}
                      </CBadge>
                      <CBadge bg="#f1f5f9" color="#475569" border="#e2e8f0">
                        {log.group_name}
                      </CBadge>
                      {fbCount > 0 && (
                        <CBadge bg="#fef3c7" color="#92400e" border="#fde68a">
                          💬 {fbCount} {ar ? 'توجيه' : 'feedback'}
                        </CBadge>
                      )}
                    </div>
                    <h4 style={{ margin: '0 0 2px', fontSize: '.97rem', fontWeight: 700, color: '#1e293b' }}>
                      {log.lesson_title}
                    </h4>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '.8rem' }}>
                      {fmtDate(log.lesson_date)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setFeedbackFor(log.id); setFeedbackText(''); }}
                      style={{
                        background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
                        borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                        fontSize: '.8rem', fontWeight: 700,
                      }}
                    >
                      💬 {ar ? 'توجيه' : 'Feedback'}
                    </button>
                    <span style={{ color: '#94a3b8', fontSize: '.85rem' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* expanded body */}
                {isExpanded && (
                  <div style={{ padding: '4px 18px 18px', borderTop: '1px solid var(--border)' }}>
                    {log.lesson_content && (
                      <VSection icon="📖" title={ar ? 'ما تم تدريسه' : 'What was taught'} content={log.lesson_content} color="#185FA5" />
                    )}
                    {log.homework && (
                      <VSection icon="📝" title={ar ? 'الواجبات والأنشطة' : 'Homework & Activities'} content={log.homework} color="#7c3aed" />
                    )}
                    {log.future_plan && (
                      <VSection icon="🔮" title={ar ? 'الخطة القادمة' : 'Next Lesson Plan'} content={log.future_plan} color="#059669" />
                    )}

                    {/* Feedback thread */}
                    {fbCount > 0 && (
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed #e2e8f0' }}>
                        <p style={{ margin: '0 0 10px', fontSize: '.83rem', fontWeight: 700, color: '#92400e' }}>
                          💬 {ar ? `توجيهات مسجّلة (${fbCount})` : `Recorded feedback (${fbCount})`}
                        </p>
                        {log.lesson_feedback
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map(fb => (
                            <div key={fb.id} style={{
                              background: '#fffbeb', border: '1px solid #fde68a',
                              borderRadius: 10, padding: '10px 14px', marginBottom: 8,
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                                <span style={{ fontWeight: 700, color: '#92400e', fontSize: '.83rem' }}>
                                  {fb.author_name}
                                  <span style={{ background: '#fef3c7', borderRadius: 10, padding: '1px 8px', marginRight: 6, fontSize: '.75rem' }}>
                                    {fb.author_role === 'supervisor' ? (ar ? 'مرشد' : 'Supervisor') : (ar ? 'مدير' : 'Admin')}
                                  </span>
                                </span>
                                <span style={{ color: '#a16207', fontSize: '.77rem' }}>
                                  {fmtDate(fb.created_at?.split('T')[0])}
                                </span>
                              </div>
                              <p style={{ margin: 0, color: '#78350f', fontSize: '.88rem', lineHeight: 1.7 }}>
                                {fb.content}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CBadge({ children, bg, color, border }) {
  return (
    <span style={{
      background: bg, color, border: `1px solid ${border}`,
      borderRadius: 20, padding: '2px 10px', fontSize: '.77rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function VSection({ icon, title, content, color }) {
  return (
    <div style={{ marginTop: 14 }}>
      <p style={{ margin: '0 0 5px', fontSize: '.82rem', fontWeight: 700, color }}>
        {icon} {title}
      </p>
      <p style={{ margin: 0, color: '#374151', fontSize: '.9rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
        {content}
      </p>
    </div>
  );
}
