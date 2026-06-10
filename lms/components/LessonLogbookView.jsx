'use client';
import { useState, useEffect, useMemo } from 'react';

const STATUS_MAP = {
  planned:   { label: 'مخطط له',    color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: '📋' },
  taught:    { label: 'تم التدريس', color: '#10b981', bg: '#f0fdf4', border: '#a7f3d0', icon: '✅' },
  postponed: { label: 'مؤجّل',      color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '⏸️' },
};

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`;
}

const selStyle = {
  padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10,
  fontSize: '.88rem', background: '#fff', fontFamily: 'inherit', color: '#1e293b', cursor: 'pointer',
};

export default function LessonLogbookView({ lang = 'ar' }) {
  const ar = lang === 'ar';

  const [allLogs,      setAllLogs]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterTeacher,setFilterTeacher]= useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGroup,  setFilterGroup]  = useState('');
  const [expandedId,   setExpandedId]   = useState(null);
  const [feedbackFor,  setFeedbackFor]  = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [savingFb,     setSavingFb]     = useState(false);
  const [msg,          setMsg]          = useState(null);
  const [reviewing,    setReviewing]    = useState(new Set());

  // Auto-load all lesson logs on mount
  useEffect(() => {
    fetch('/api/lesson-logs/view')
      .then(r => r.json())
      .then(data => setAllLogs(data.logs ?? []))
      .catch(() => setMsg({ type: 'error', text: ar ? 'تعذّر تحميل البيانات' : 'Failed to load data' }))
      .finally(() => setLoading(false));
  }, []);

  async function markReviewed(logId) {
    setReviewing(prev => new Set(prev).add(logId));
    try {
      const res  = await fetch(`/api/lesson-logs/${logId}/review`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAllLogs(prev => prev.map(l =>
        l.id === logId
          ? { ...l, reviewed_at: data.log.reviewed_at, reviewed_by: data.log.reviewed_by }
          : l
      ));
      setMsg({ type: 'success', text: ar ? '✅ تمت المراجعة بنجاح' : '✅ Marked as reviewed' });
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setReviewing(prev => { const s = new Set(prev); s.delete(logId); return s; });
    }
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
      setAllLogs(prev => prev.map(l =>
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

  // Unique teachers in current data
  const teachers = useMemo(() => {
    const map = {};
    allLogs.forEach(l => { map[l.teacher_id] = l.teacher_name; });
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name));
  }, [allLogs]);

  // Unique groups (filtered by selected teacher)
  const groups = useMemo(() => {
    const src = filterTeacher ? allLogs.filter(l => l.teacher_id === filterTeacher) : allLogs;
    return [...new Set(src.map(l => l.group_name))].sort();
  }, [allLogs, filterTeacher]);

  // Filtered logs
  const filtered = useMemo(() => allLogs.filter(l =>
    (!filterTeacher || l.teacher_id === filterTeacher) &&
    (!filterStatus  || l.status     === filterStatus)  &&
    (!filterGroup   || l.group_name === filterGroup)
  ), [allLogs, filterTeacher, filterStatus, filterGroup]);

  // Group filtered logs by teacher
  const byTeacher = useMemo(() => {
    const map = {};
    filtered.forEach(l => {
      if (!map[l.teacher_id]) map[l.teacher_id] = { name: l.teacher_name, logs: [] };
      map[l.teacher_id].logs.push(l);
    });
    return Object.entries(map).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [filtered]);

  const totalPlanned = allLogs.filter(l => l.status === 'planned').length;
  const totalTaught  = allLogs.filter(l => l.status === 'taught').length;

  return (
    <div dir="rtl">

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

      {/* ── Summary stats ── */}
      {!loading && allLogs.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: ar ? 'إجمالي التخطيطات' : 'Total Logs',      val: allLogs.length,   color: '#185FA5', bg: '#eff6ff' },
            { label: ar ? 'عدد المعلمين'     : 'Teachers',         val: teachers.length,  color: '#7c3aed', bg: '#f5f3ff' },
            { label: ar ? 'مخطط له'          : 'Planned',          val: totalPlanned,     color: '#3b82f6', bg: '#eff6ff' },
            { label: ar ? 'تم التدريس'       : 'Taught',           val: totalTaught,      color: '#10b981', bg: '#f0fdf4' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: `1.5px solid ${s.color}30`,
              borderRadius: 12, padding: '10px 18px', display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.val}</span>
              <span style={{ fontSize: '.78rem', color: '#64748b', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      {!loading && allLogs.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>
              {ar ? 'المعلم' : 'Teacher'}
            </label>
            <select value={filterTeacher} onChange={e => { setFilterTeacher(e.target.value); setFilterGroup(''); }} style={{ ...selStyle, minWidth: 200 }}>
              <option value="">{ar ? 'كل المعلمين' : 'All Teachers'}</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>
              {ar ? 'المجموعة' : 'Group'}
            </label>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ ...selStyle, minWidth: 160 }}>
              <option value="">{ar ? 'كل المجموعات' : 'All Groups'}</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>
              {ar ? 'الحالة' : 'Status'}
            </label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...selStyle, minWidth: 150 }}>
              <option value="">{ar ? 'كل الحالات' : 'All'}</option>
              <option value="planned">📋 {ar ? 'مخطط له' : 'Planned'}</option>
              <option value="taught">✅ {ar ? 'تم التدريس' : 'Taught'}</option>
              <option value="postponed">⏸️ {ar ? 'مؤجّل' : 'Postponed'}</option>
            </select>
          </div>
          {(filterTeacher || filterStatus || filterGroup) && (
            <button
              onClick={() => { setFilterTeacher(''); setFilterStatus(''); setFilterGroup(''); }}
              style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '.82rem', alignSelf: 'flex-end' }}
            >
              ✕ {ar ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>⏳</div>
          <p style={{ fontSize: '.92rem' }}>{ar ? 'جارٍ تحميل تخطيطات الدروس…' : 'Loading lesson plans…'}</p>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && allLogs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
          <p style={{ fontSize: '.9rem', fontWeight: 500 }}>
            {ar ? 'لم يسجّل أي معلم تخطيطاً بعد' : 'No lesson plans recorded yet'}
          </p>
        </div>
      )}

      {/* ── No results from filter ── */}
      {!loading && allLogs.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
          <p style={{ fontSize: '.9rem' }}>{ar ? 'لا توجد تخطيطات تطابق الفلتر' : 'No results match the filter'}</p>
        </div>
      )}

      {/* ── Grouped by teacher ── */}
      {!loading && byTeacher.map(([tid, group]) => (
        <div key={tid} style={{ marginBottom: 32 }}>

          {/* Teacher header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
            paddingBottom: 10, borderBottom: '2px solid #e2e8f0',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: '#185FA5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0,
            }}>
              {group.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#1e293b' }}>
                👨‍🏫 {group.name}
              </h3>
              <p style={{ margin: 0, fontSize: '.78rem', color: '#64748b' }}>
                {group.logs.length} {ar ? 'تخطيط' : 'plans'} ·{' '}
                {group.logs.filter(l=>l.status==='taught').length} {ar ? 'مُدرَّس' : 'taught'} ·{' '}
                {group.logs.filter(l=>l.status==='planned').length} {ar ? 'مخطط' : 'planned'}
              </p>
            </div>
          </div>

          {/* Logs for this teacher */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {group.logs.map(log => {
              const st         = STATUS_MAP[log.status] ?? STATUS_MAP.planned;
              const isExpanded = expandedId === log.id;
              const fbCount    = log.lesson_feedback?.length ?? 0;

              return (
                <div key={log.id} style={{
                  background: '#fff', borderRadius: 14,
                  border: '1.5px solid var(--border)',
                  borderRight: `4px solid ${st.color}`,
                  boxShadow: '0 1px 6px rgba(0,0,0,.04)',
                  overflow: 'hidden',
                }}>
                  {/* header row */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: isExpanded ? '#f8fafc' : '#fff', gap: 10, flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                        <SBadge bg={st.bg} color={st.color} border={st.border}>
                          {st.icon} {st.label}
                        </SBadge>
                        <SBadge bg="#f1f5f9" color="#475569" border="#e2e8f0">
                          {log.group_name}
                        </SBadge>
                        {fbCount > 0 && (
                          <SBadge bg="#fef3c7" color="#92400e" border="#fde68a">
                            💬 {fbCount}
                          </SBadge>
                        )}
                      </div>
                      <p style={{ margin: '0 0 2px', fontSize: '.95rem', fontWeight: 700, color: '#1e293b' }}>
                        {log.lesson_title}
                      </p>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '.78rem' }}>
                        {fmtDate(log.lesson_date)}
                        {log.lesson_time && (
                          <span style={{ marginRight: 8, fontWeight: 600, color: '#64748b' }}>
                            ⏰ {log.lesson_time.slice(0, 5)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      {log.reviewed_at ? (
                        <SBadge bg="#f0fdf4" color="#16a34a" border="#bbf7d0">
                          ✅ {ar ? 'تمت المراجعة' : 'Reviewed'}
                        </SBadge>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); markReviewed(log.id); }}
                          disabled={reviewing.has(log.id)}
                          style={{
                            background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                            borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                            fontSize: '.8rem', fontWeight: 700,
                            opacity: reviewing.has(log.id) ? .6 : 1,
                          }}
                        >
                          {reviewing.has(log.id) ? '…' : (ar ? '✅ تم' : '✅ Done')}
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); setFeedbackFor(log.id); setFeedbackText(''); }}
                        style={{
                          background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
                          borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
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
                    <div style={{ padding: '4px 16px 16px', borderTop: '1px solid var(--border)' }}>
                      {log.lesson_content && <VSection icon="📖" title={ar?'ما تم تدريسه':'Taught'} content={log.lesson_content} color="#185FA5" />}
                      {log.homework       && <VSection icon="📝" title={ar?'الواجبات والأنشطة':'Homework'} content={log.homework} color="#7c3aed" />}
                      {log.future_plan    && <VSection icon="🔮" title={ar?'الخطة القادمة':'Next Plan'} content={log.future_plan} color="#059669" />}
                      {log.reviewed_at && (
                        <div style={{
                          marginTop: 12, padding: '7px 12px', borderRadius: 10,
                          background: '#f0fdf4', border: '1px solid #bbf7d0',
                          fontSize: '.78rem', color: '#16a34a', fontWeight: 600,
                        }}>
                          ✅ {ar ? 'راجعها' : 'Reviewed by'}: {log.reviewed_by} — {fmtDate(log.reviewed_at.split('T')[0])}
                        </div>
                      )}

                      {fbCount > 0 && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #e2e8f0' }}>
                          <p style={{ margin: '0 0 8px', fontSize: '.82rem', fontWeight: 700, color: '#92400e' }}>
                            💬 {ar ? `التوجيهات المسجّلة (${fbCount})` : `Recorded feedback (${fbCount})`}
                          </p>
                          {log.lesson_feedback
                            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                            .map(fb => (
                              <div key={fb.id} style={{
                                background: '#fffbeb', border: '1px solid #fde68a',
                                borderRadius: 10, padding: '9px 14px', marginBottom: 7,
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, flexWrap: 'wrap', gap: 4 }}>
                                  <span style={{ fontWeight: 700, color: '#92400e', fontSize: '.82rem' }}>
                                    {fb.author_name}
                                    <span style={{ background: '#fef3c7', borderRadius: 10, padding: '1px 8px', marginRight: 6, fontSize: '.74rem' }}>
                                      {fb.author_role === 'supervisor' ? (ar?'مرشد':'Supervisor') : (ar?'مدير':'Admin')}
                                    </span>
                                  </span>
                                  <span style={{ color: '#a16207', fontSize: '.76rem' }}>
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
        </div>
      ))}

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
            <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
              💬 {ar ? 'إضافة توجيه تربوي' : 'Add Educational Guidance'}
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '.84rem', color: '#64748b' }}>
              {ar ? 'سيصل هذا التوجيه للمعلم في كراسه فور الحفظ' : 'The teacher will see this in their logbook immediately'}
            </p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder={ar ? 'اكتب توجيهك أو ملاحظتك التربوية هنا…' : 'Write your pedagogical guidance here…'}
              rows={5} autoFocus
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
    </div>
  );
}

function SBadge({ children, bg, color, border }) {
  return (
    <span style={{
      background: bg, color, border: `1px solid ${border}`,
      borderRadius: 20, padding: '2px 9px', fontSize: '.76rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function VSection({ icon, title, content, color }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ margin: '0 0 4px', fontSize: '.8rem', fontWeight: 700, color }}>{icon} {title}</p>
      <p style={{ margin: 0, color: '#374151', fontSize: '.88rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{content}</p>
    </div>
  );
}
