'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';

const STATUS_MAP = {
  planned:   { label: 'مخطط له',      color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: '📋' },
  taught:    { label: 'تم التدريس',   color: '#10b981', bg: '#f0fdf4', border: '#a7f3d0', icon: '✅' },
  postponed: { label: 'مؤجّل',        color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '⏸️' },
};

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`;
}

const EMPTY = {
  group_name: '', lesson_date: '', lesson_time: '', lesson_title: '',
  lesson_content: '', homework: '', future_plan: '',
  status: 'planned', teacher_notes: '',
};

const inp = {
  width: '100%', padding: '10px 14px',
  border: '1.5px solid #e2e8f0', borderRadius: 10,
  fontSize: '.9rem', background: '#fff', boxSizing: 'border-box',
  fontFamily: 'inherit', color: '#1e293b',
};
const lbl = { display: 'block', fontSize: '.82rem', fontWeight: 700, color: '#374151', marginBottom: 5 };

export default function LogbookPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [user,       setUser]       = useState(null);
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(EMPTY);
  const [editing,    setEditing]    = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(null);
  const [msg,        setMsg]        = useState(null);
  const [filterGrp,  setFilterGrp]  = useState('');
  const [filterSt,   setFilterSt]   = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((ev) => {
      if (ev === 'SIGNED_OUT') router.push('/auth/login');
    });
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/auth/login'); return; }
      if (u.user_metadata?.role !== 'teacher') { router.push('/dashboard'); return; }
      setUser(u);
      loadLogs();
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const res  = await fetch('/api/lesson-logs');
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch { setMsg({ type: 'error', text: 'تعذّر تحميل السجلات' }); }
    finally  { setLoading(false); }
  }

  async function handleSave() {
    if (!form.group_name.trim() || !form.lesson_date || !form.lesson_title.trim()) {
      setMsg({ type: 'error', text: 'المجموعة، التاريخ، وعنوان الدرس مطلوبة' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url    = editing ? `/api/lesson-logs/${editing}` : '/api/lesson-logs';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data   = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (editing) {
        setLogs(p => p.map(l => l.id === editing ? { ...data.log, lesson_feedback: l.lesson_feedback } : l));
      } else {
        setLogs(p => [data.log, ...p]);
        setExpandedId(data.log.id);
      }
      setForm(EMPTY); setEditing(null); setShowForm(false);
      setMsg({ type: 'success', text: editing ? 'تم تحديث السجل ✅' : 'تمت إضافة الدرس ✅' });
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally    { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/lesson-logs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setLogs(p => p.filter(l => l.id !== id));
      if (expandedId === id) setExpandedId(null);
      setMsg({ type: 'success', text: 'تم الحذف' });
    } catch { setMsg({ type: 'error', text: 'تعذّر الحذف' }); }
    finally  { setDeleting(null); }
  }

  function startEdit(log) {
    setForm({
      group_name:     log.group_name,
      lesson_date:    log.lesson_date,
      lesson_time:    log.lesson_time    ?? '',
      lesson_title:   log.lesson_title,
      lesson_content: log.lesson_content ?? '',
      homework:       log.homework       ?? '',
      future_plan:    log.future_plan    ?? '',
      status:         log.status,
      teacher_notes:  log.teacher_notes  ?? '',
    });
    setEditing(log.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const groups   = useMemo(() => [...new Set(logs.map(l => l.group_name))].sort(), [logs]);
  const filtered = logs.filter(l =>
    (!filterGrp || l.group_name === filterGrp) &&
    (!filterSt  || l.status     === filterSt)
  );

  const stats = {
    total:     logs.length,
    taught:    logs.filter(l => l.status === 'taught').length,
    planned:   logs.filter(l => l.status === 'planned').length,
    postponed: logs.filter(l => l.status === 'postponed').length,
  };

  if (loading) return (
    <>
      <Navbar />
      <main dir="rtl" style={{ textAlign: 'center', padding: '80px 16px', color: '#64748b', fontSize: '1rem' }}>
        ⏳ جارٍ تحميل الكراس…
      </main>
    </>
  );

  return (
    <>
      <Navbar />
      <main dir="rtl" style={{ maxWidth: 920, margin: '0 auto', padding: '28px 16px 60px' }}>

        {/* ── Breadcrumb ── */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/teacher" style={{ color: '#64748b', textDecoration: 'none', fontSize: '.88rem' }}>
            ← لوحة التحكم
          </Link>
          <span style={{ color: '#cbd5e1', margin: '0 6px' }}>/</span>
          <span style={{ color: '#185FA5', fontWeight: 600, fontSize: '.88rem' }}>📓 كراس الدروس</span>
        </div>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>
              📓 كراس الدروس الرقمي
            </h1>
            <p style={{ color: '#64748b', fontSize: '.9rem', margin: 0 }}>
              {user?.user_metadata?.full_name} — سجّل دروسك وخططك التعليمية
            </p>
          </div>
          <button
            onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(p => !p); setMsg(null); }}
            style={{
              background: showForm ? '#f1f5f9' : '#185FA5',
              color: showForm ? '#64748b' : '#fff',
              border: 'none', borderRadius: 12, padding: '10px 20px',
              fontWeight: 700, cursor: 'pointer', fontSize: '.92rem',
              transition: 'all .2s',
            }}
          >
            {showForm ? '✕ إلغاء' : '+ إضافة درس جديد'}
          </button>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'إجمالي السجلات', val: stats.total,     color: '#185FA5', bg: '#eff6ff' },
            { label: 'تم التدريس',     val: stats.taught,    color: '#10b981', bg: '#f0fdf4' },
            { label: 'مخطط له',        val: stats.planned,   color: '#3b82f6', bg: '#eff6ff' },
            { label: 'مؤجّل',          val: stats.postponed, color: '#f59e0b', bg: '#fffbeb' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: `1.5px solid ${s.color}30`,
              borderRadius: 14, padding: '14px 16px', textAlign: 'center',
            }}>
              <p style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, margin: '0 0 4px' }}>{s.val}</p>
              <p style={{ fontSize: '.75rem', color: '#64748b', margin: 0, fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Toast ── */}
        {msg && (
          <div style={{
            padding: '12px 18px', borderRadius: 10, marginBottom: 18,
            fontSize: '.88rem', fontWeight: 600,
            background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: msg.type === 'error' ? '#dc2626' : '#16a34a',
            border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          }}>
            {msg.text}
          </div>
        )}

        {/* ── Form ── */}
        {showForm && (
          <div style={{
            background: '#fffbf0', border: '2px solid #fde68a',
            borderRadius: 20, padding: '24px', marginBottom: 30,
            boxShadow: '0 4px 24px rgba(251,191,36,.12)',
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, color: '#92400e' }}>
              {editing ? '✏️ تعديل السجل' : '✏️ تسجيل درس جديد'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>المجموعة / الفصل *</label>
                <input
                  value={form.group_name} onChange={set('group_name')}
                  list="grp-list" placeholder="مثال: مجموعة أ، الصف الثالث…"
                  style={inp}
                />
                <datalist id="grp-list">
                  {groups.map(g => <option key={g} value={g} />)}
                </datalist>
              </div>
              <div>
                <label style={lbl}>تاريخ الحصة *</label>
                <input type="date" value={form.lesson_date} onChange={set('lesson_date')} style={inp} />
              </div>
              <div>
                <label style={lbl}>وقت الحصة</label>
                <input
                  type="time"
                  step="300"
                  value={form.lesson_time}
                  onChange={set('lesson_time')}
                  style={inp}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>عنوان الدرس *</label>
                <input
                  value={form.lesson_title} onChange={set('lesson_title')}
                  placeholder="مثال: الأسماء الموصولة، الفعل المضارع…"
                  style={inp}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>ما تم تدريسه فعلياً</label>
              <textarea
                value={form.lesson_content} onChange={set('lesson_content')}
                placeholder="صِف بالتفصيل ما غطّيته في هذه الحصة…"
                rows={3} style={{ ...inp, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>الواجبات والأنشطة</label>
                <textarea
                  value={form.homework} onChange={set('homework')}
                  placeholder="الواجبات والأنشطة الموكلة للطلاب…"
                  rows={3} style={{ ...inp, resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={lbl}>الخطة للحصة القادمة</label>
                <textarea
                  value={form.future_plan} onChange={set('future_plan')}
                  placeholder="ما الذي ستدرّسه في الحصة القادمة؟"
                  rows={3} style={{ ...inp, resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
              <div>
                <label style={lbl}>حالة الدرس</label>
                <select value={form.status} onChange={set('status')} style={inp}>
                  <option value="planned">📋 مخطط له</option>
                  <option value="taught">✅ تم التدريس</option>
                  <option value="postponed">⏸️ مؤجّل</option>
                </select>
              </div>
              <div>
                <label style={lbl}>ملاحظاتي الخاصة 🔒</label>
                <textarea
                  value={form.teacher_notes} onChange={set('teacher_notes')}
                  placeholder="ملاحظات خاصة — لعينَيك فقط"
                  rows={3} style={{ ...inp, resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSave} disabled={saving}
                style={{ background: '#185FA5', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? .7 : 1 }}
              >
                {saving ? 'جارٍ الحفظ…' : (editing ? '💾 حفظ التعديلات' : '✅ إضافة الدرس')}
              </button>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filterGrp} onChange={e => setFilterGrp(e.target.value)} style={{ ...inp, width: 'auto', minWidth: 170 }}>
            <option value="">📚 كل المجموعات</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filterSt} onChange={e => setFilterSt(e.target.value)} style={{ ...inp, width: 'auto', minWidth: 155 }}>
            <option value="">🔍 كل الحالات</option>
            <option value="planned">📋 مخطط له</option>
            <option value="taught">✅ تم التدريس</option>
            <option value="postponed">⏸️ مؤجّل</option>
          </select>
          {(filterGrp || filterSt) && (
            <button
              onClick={() => { setFilterGrp(''); setFilterSt(''); }}
              style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '.82rem' }}
            >
              ✕ مسح الفلتر
            </button>
          )}
          <span style={{ color: '#64748b', fontSize: '.82rem', marginRight: 'auto' }}>
            {filtered.length} سجل
          </span>
        </div>

        {/* ── Timeline ── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 14 }}>📓</div>
            <p style={{ fontSize: '1rem', fontWeight: 500 }}>
              {logs.length === 0 ? 'الكراس فارغ بعد. ابدأ بتسجيل أول درس!' : 'لا توجد سجلات تطابق الفلتر المحدد.'}
            </p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* vertical line */}
            <div style={{
              position: 'absolute', top: 26, bottom: 0,
              right: 18, width: 2,
              background: 'linear-gradient(to bottom, #e2e8f0 80%, transparent)',
            }} />

            {filtered.map((log, i) => {
              const st          = STATUS_MAP[log.status] ?? STATUS_MAP.planned;
              const isExpanded  = expandedId === log.id;
              const fbCount     = log.lesson_feedback?.length ?? 0;
              const unreadFb    = fbCount > 0;

              return (
                <div key={log.id} style={{ display: 'flex', gap: 14, marginBottom: 16, position: 'relative' }}>
                  {/* dot */}
                  <div style={{
                    width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: st.color, marginTop: 20,
                      border: '3px solid #fff',
                      boxShadow: `0 0 0 3px ${st.color}30`,
                      zIndex: 1, position: 'relative',
                    }} />
                  </div>

                  {/* card */}
                  <div style={{
                    flex: 1,
                    background: '#fff',
                    borderRadius: 16,
                    border: '1.5px solid var(--border)',
                    borderRight: `4px solid ${st.color}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                    overflow: 'hidden',
                  }}>
                    {/* card header */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      style={{
                        padding: '14px 18px', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: isExpanded ? '#f8fafc' : '#fff', gap: 10, flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 6 }}>
                          <Badge bg={st.bg} color={st.color} border={st.border}>
                            {st.icon} {st.label}
                          </Badge>
                          <Badge bg="#f1f5f9" color="#475569" border="#e2e8f0">
                            {log.group_name}
                          </Badge>
                          {unreadFb && (
                            <Badge bg="#fef3c7" color="#92400e" border="#fde68a">
                              💬 {fbCount} توجيه
                            </Badge>
                          )}
                        </div>
                        <h3 style={{ margin: '0 0 2px', fontSize: '.98rem', fontWeight: 700, color: '#1e293b' }}>
                          {log.lesson_title}
                        </h3>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '.8rem' }}>
                          {fmtDate(log.lesson_date)}
                          {log.lesson_time && (
                            <span style={{ marginRight: 8, color: '#64748b', fontWeight: 600 }}>
                              ⏰ {log.lesson_time.slice(0, 5)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
                        <button
                          onClick={e => { e.stopPropagation(); startEdit(log); }}
                          style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: '.82rem', color: '#475569' }}
                          title="تعديل"
                        >✏️</button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(log.id); }}
                          disabled={deleting === log.id}
                          style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: '.82rem', color: '#dc2626' }}
                          title="حذف"
                        >{deleting === log.id ? '…' : '🗑️'}</button>
                        <span style={{ color: '#94a3b8', fontSize: '.85rem', userSelect: 'none' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* expanded body */}
                    {isExpanded && (
                      <div style={{ padding: '4px 18px 18px', borderTop: '1px solid var(--border)' }}>
                        {log.lesson_content && (
                          <LogSection icon="📖" title="ما تم تدريسه" content={log.lesson_content} color="#185FA5" />
                        )}
                        {log.homework && (
                          <LogSection icon="📝" title="الواجبات والأنشطة" content={log.homework} color="#7c3aed" />
                        )}
                        {log.future_plan && (
                          <LogSection icon="🔮" title="الخطة للحصة القادمة" content={log.future_plan} color="#059669" />
                        )}
                        {log.teacher_notes && (
                          <LogSection icon="🔒" title="ملاحظاتي الخاصة" content={log.teacher_notes} color="#64748b" />
                        )}

                        {/* Feedback section */}
                        {fbCount > 0 && (
                          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed #e2e8f0' }}>
                            <p style={{ margin: '0 0 10px', fontSize: '.85rem', fontWeight: 700, color: '#92400e' }}>
                              💬 توجيهات الإدارة والمشرف ({fbCount})
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
                                      <span style={{
                                        background: '#fef3c7', borderRadius: 10,
                                        padding: '1px 8px', marginRight: 6, fontSize: '.75rem',
                                      }}>
                                        {fb.author_role === 'supervisor' ? 'مرشد' : 'مدير'}
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
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function Badge({ children, bg, color, border }) {
  return (
    <span style={{
      background: bg, color, border: `1px solid ${border}`,
      borderRadius: 20, padding: '2px 10px',
      fontSize: '.77rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function LogSection({ icon, title, content, color }) {
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
