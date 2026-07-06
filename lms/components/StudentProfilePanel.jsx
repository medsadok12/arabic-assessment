'use client';
import { useEffect, useState } from 'react';

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS_AR[parseInt(m) - 1]} ${y}`;
}

function StatBadge({ icon, value, label, color = '#185FA5' }) {
  return (
    <div style={{ textAlign: 'center', flex: 1, minWidth: 80 }}>
      <div style={{ fontSize: '1.4rem' }}>{icon}</div>
      <div style={{ fontSize: '1.35rem', fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '.72rem', color: '#94a3b8', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function StudentProfilePanel({ student, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    setLoading(true);
    const params = student.email
      ? `email=${encodeURIComponent(student.email)}`
      : `name=${encodeURIComponent(student.name)}`;
    fetch(`/api/teacher/student-profile?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [student]);

  if (!student) return null;

  const sessions    = data?.sessions    ?? [];
  const homework    = data?.homework    ?? [];
  const assessments = data?.assessments ?? [];

  const attended    = sessions.filter(s => s.attended === true).length;
  const absent      = sessions.filter(s => s.attended === false).length;
  const marked      = attended + absent;
  const attendPct   = marked > 0 ? Math.round((attended / marked) * 100) : null;

  const hwDone      = homework.filter(h => h.status === 'done').length;
  const hwPct       = homework.length > 0 ? Math.round((hwDone / homework.length) * 100) : null;

  const sessWithNotes = sessions.filter(s => s.notes);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <style>{`
        .sp-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1200;
                      display:flex; justify-content:flex-end; }
        .sp-panel   { width:min(480px,100vw); height:100vh; overflow-y:auto;
                      background:#f8fafc; direction:rtl;
                      animation:slideIn .25s ease; }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }

        .sp-head  { background:var(--primary); color:#fff; padding:20px 22px; position:sticky; top:0; z-index:10; }
        .sp-body  { padding:20px 22px; display:flex; flex-direction:column; gap:24px; }

        .sp-stats { background:#fff; border-radius:14px; border:1.5px solid var(--border);
                    padding:18px 14px; display:flex; gap:8px; }

        .sp-sec-h { font-size:.85rem; font-weight:800; color:#475569; letter-spacing:.04em;
                    text-transform:uppercase; margin-bottom:10px;
                    display:flex; align-items:center; gap:8px; }
        .sp-sec-h::after { content:''; flex:1; height:1.5px; background:var(--border); }

        .sp-row   { background:#fff; border-radius:12px; border:1.5px solid var(--border);
                    padding:12px 14px; font-size:.88rem; }
        .sp-row + .sp-row { margin-top:8px; }

        .sp-note  { background:#fffbeb; border-right:3px solid #f59e0b;
                    padding-right:10px; margin-top:8px; font-size:.85rem;
                    color:#451a03; line-height:1.7; }

        .att-dot  { width:9px; height:9px; border-radius:50%; flex-shrink:0; margin-top:4px; }
      `}</style>

      <div className="sp-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="sp-panel">

          {/* Header */}
          <div className="sp-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none',
                color: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                fontSize: '1rem', fontFamily: 'inherit', fontWeight: 700 }}>
                ✕
              </button>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{student.name}</div>
                {student.email && (
                  <div style={{ fontSize: '.78rem', opacity: .8, marginTop: 2, direction: 'ltr', textAlign: 'right' }}>
                    {student.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
              جارٍ تحميل الملف...
            </div>
          ) : (
            <div className="sp-body">

              {/* Stats */}
              <div className="sp-stats">
                <StatBadge
                  icon="🏫"
                  value={attendPct != null ? `${attendPct}%` : '—'}
                  label={`الحضور (${attended}/${marked})`}
                  color={attendPct == null ? '#94a3b8' : attendPct >= 80 ? '#059669' : attendPct >= 60 ? '#d97706' : '#dc2626'}
                />
                <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
                <StatBadge
                  icon="📝"
                  value={hwPct != null ? `${hwPct}%` : '—'}
                  label={`الواجبات (${hwDone}/${homework.length})`}
                  color={hwPct == null ? '#94a3b8' : hwPct >= 80 ? '#059669' : '#d97706'}
                />
                <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
                <StatBadge
                  icon="📊"
                  value={assessments.length || '—'}
                  label="تقييمات"
                  color="#185FA5"
                />
              </div>

              {/* Sessions */}
              <div>
                <div className="sp-sec-h">🏫 الحصص ({sessions.length})</div>
                {sessions.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '.85rem' }}>لا توجد حصص</div>
                ) : (
                  sessions.map(s => (
                    <div key={s.id} className="sp-row" style={{
                      borderColor: s.attended === true ? '#6ee7b7' : s.attended === false ? '#fca5a5' : undefined,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div className="att-dot" style={{
                          background: s.attended === true ? '#16a34a' : s.attended === false ? '#dc2626' : '#cbd5e1',
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '.9rem' }}>
                            {s.subject || 'حصة عامة'}
                          </div>
                          <div style={{ fontSize: '.79rem', color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 10 }}>
                            <span>📅 {fmtDate(s.session_date)}</span>
                            <span>⏰ {s.start_time?.slice(0, 5)}</span>
                            <span style={{
                              fontWeight: 700,
                              color: s.status === 'cancelled' ? '#e53e3e' : s.attended === true ? '#059669' : s.attended === false ? '#dc2626' : '#94a3b8',
                            }}>
                              {s.status === 'cancelled' ? 'ملغاة' : s.attended === true ? 'حضر' : s.attended === false ? 'غاب' : '—'}
                            </span>
                          </div>
                          {s.notes && <div className="sp-note">📝 {s.notes}</div>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Homework */}
              <div>
                <div className="sp-sec-h">📝 الواجبات ({homework.length})</div>
                {homework.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '.85rem' }}>لا توجد واجبات</div>
                ) : (
                  homework.map(h => {
                    const overdue = h.due_date && h.due_date < today && h.status === 'pending';
                    return (
                      <div key={h.id} className="sp-row" style={{
                        borderColor: h.status === 'done' ? '#6ee7b7' : overdue ? '#fca5a5' : undefined,
                      }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '1.1rem', lineHeight: 1, paddingTop: 2 }}>
                            {h.status === 'done' ? '✅' : overdue ? '⚠️' : '📋'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, textDecoration: h.status === 'done' ? 'line-through' : 'none', color: h.status === 'done' ? '#94a3b8' : '#1e293b' }}>
                              {h.title}
                            </div>
                            <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              {h.due_date && (
                                <span style={{ color: overdue ? '#dc2626' : '#64748b', fontWeight: overdue ? 700 : 400 }}>
                                  📅 {h.due_date}{overdue ? ' — متأخر!' : ''}
                                </span>
                              )}
                              <span style={{ color: h.status === 'done' ? '#059669' : '#64748b', fontWeight: 600 }}>
                                {h.status === 'done' ? 'مُنجَز' : 'معلّق'}
                              </span>
                            </div>
                            {h.description && (
                              <div style={{ marginTop: 4, fontSize: '.8rem', color: '#475569' }}>{h.description}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Assessments */}
              {assessments.length > 0 && (
                <div>
                  <div className="sp-sec-h">📊 التقييمات ({assessments.length})</div>
                  {assessments.map((a, i) => (
                    <div key={i} className="sp-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '1.1rem' }}>🏅</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>المستوى {a.level}</div>
                          <div style={{ fontSize: '.79rem', color: 'var(--muted)', marginTop: 2 }}>
                            📅 {fmtDate(a.completed_at?.slice(0, 10))}
                          </div>
                        </div>
                        <span style={{
                          background: (a.score ?? 0) >= 70 ? '#dcfce7' : '#fff7ed',
                          color: (a.score ?? 0) >= 70 ? '#15803d' : '#c2410c',
                          fontWeight: 900, fontSize: '.95rem',
                          padding: '4px 12px', borderRadius: 20,
                        }}>
                          {a.score ?? 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  );
}
