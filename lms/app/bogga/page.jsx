'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import AssessmentCodes from '../../components/AssessmentCodes';
import StudentCodes    from '../../components/StudentCodes';
import TeacherCodes    from '../../components/TeacherCodes';
import GroupsManager   from '../../components/GroupsManager';

const SETUP_SQL = `-- تشغيل هذا SQL في Supabase SQL Editor لتهيئة الجداول اللازمة:

-- جدول طلبات التوظيف
CREATE TABLE IF NOT EXISTS recruitment_applications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  phone       TEXT,
  experience  TEXT,
  specialty   TEXT,
  notes       TEXT,
  cv_path     TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول بنك الكلمات
CREATE TABLE IF NOT EXISTS lexicon_words (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  word       TEXT        NOT NULL,
  word_type  TEXT        NOT NULL,
  sentence   TEXT,
  topic      TEXT,
  grade_from INT         NOT NULL DEFAULT 1,
  grade_to   INT         NOT NULL DEFAULT 7,
  syllables  TEXT,
  root       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const STATUS_LABELS = { pending: 'قيد المراجعة', reviewed: 'تمت المراجعة', accepted: 'مقبول', rejected: 'مرفوض' };
const STATUS_COLORS = { pending: '#b56a00', reviewed: '#185FA5', accepted: '#1a7c40', rejected: '#e53e3e' };

const EMPTY_ADMIN_FORM = { name: '', email: '', password: '' };

export default function BruteAdminPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [user, setUser]   = useState(null);
  const [role, setRole]   = useState('');
  const [tab,  setTab]    = useState('overview');

  // Stats
  const [stats, setStats] = useState({ assessments: 0, pass: 0, avg: 0, applications: 0 });

  // Recruitment
  const [apps, setApps]               = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [deletingApp, setDeletingApp] = useState(null);

  // Admins management
  const [admins, setAdmins]             = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adminForm, setAdminForm]       = useState(EMPTY_ADMIN_FORM);
  const [addingAdmin, setAddingAdmin]   = useState(false);
  const [adminMsg, setAdminMsg]         = useState(null);
  const [deletingId, setDeletingId]     = useState(null);

  // CV download
  const [downloadingCV, setDownloadingCV] = useState({});

  // Promotion
  const [promoting, setPromoting]   = useState(false);
  const [promoMsg,  setPromoMsg]    = useState(null);

  // Codes sub-tab
  const [codesTab, setCodesTab] = useState('assessment');

  // Setup
  const [copied, setCopied] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/auth/login'); return; }
      const r = u.user_metadata?.role ?? '';
      if (r !== 'admin' && r !== 'super_admin') { router.push('/dashboard'); return; }
      setUser(u); setRole(r);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    loadStats();
    if (tab === 'recruitment' && isSuperAdmin) loadApps();
    if (tab === 'admins'      && isSuperAdmin) loadAdmins();
  }, [user, tab]);

  // ── Data loaders ────────────────────────────────────────────────
  async function loadStats() {
    const [
      { count: assessCount },
      { count: passCount },
      { data: scoresData },
      appsRes,
    ] = await Promise.all([
      supabase.from('assessments').select('id', { count: 'exact', head: true }),
      supabase.from('assessments').select('id', { count: 'exact', head: true }).gte('score', 70),
      supabase.from('assessments').select('score'),
      // Use admin-client API to bypass RLS on recruitment table
      fetch('/api/bogga/recruitment').then(r => r.json()).catch(() => ({ applications: [] })),
    ]);
    const avg = scoresData?.length
      ? Math.round(scoresData.reduce((s, a) => s + (a.score ?? 0), 0) / scoresData.length)
      : 0;
    setStats({
      assessments:  assessCount ?? 0,
      pass:         passCount   ?? 0,
      avg,
      applications: appsRes.applications?.length ?? 0,
    });
  }

  async function loadApps() {
    setAppsLoading(true);
    // Use admin-client API route to bypass any RLS restrictions
    const res  = await fetch('/api/bogga/recruitment');
    const data = await res.json();
    setApps(data.applications ?? []);
    setAppsLoading(false);
  }

  async function loadAdmins() {
    setAdminsLoading(true);
    const res  = await fetch('/api/bogga/admins');
    const data = await res.json();
    setAdmins(data.admins ?? []);
    setAdminsLoading(false);
  }

  // ── Recruitment ──────────────────────────────────────────────────
  async function updateAppStatus(id, status) {
    await fetch('/api/bogga/recruitment', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, status }),
    });
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  async function deleteApp(id, name) {
    if (!confirm(`هل تريد حذف طلب "${name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    setDeletingApp(id);
    const res = await fetch('/api/bogga/recruitment', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    });
    if (res.ok) {
      setApps(prev => prev.filter(a => a.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || 'تعذر حذف الطلب');
    }
    setDeletingApp(null);
  }

  async function downloadCV(id, filename) {
    setDownloadingCV(p => ({ ...p, [id]: true }));
    try {
      const res  = await fetch(`/api/bogga/recruitment/${id}`);
      const data = await res.json();
      if (!res.ok || !data.cv_base64) {
        alert(data.error || 'لا توجد سيرة ذاتية مرفقة بهذا الطلب');
        return;
      }
      const link   = document.createElement('a');
      link.href     = `data:application/pdf;base64,${data.cv_base64}`;
      link.download = data.cv_filename || filename || 'cv.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingCV(p => ({ ...p, [id]: false }));
    }
  }

  // ── Admins management ────────────────────────────────────────────
  async function handleAddAdmin(e) {
    e.preventDefault();
    setAddingAdmin(true); setAdminMsg(null);
    const res  = await fetch('/api/bogga/admins', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(adminForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setAdminMsg({ type: 'error', text: data.error });
    } else {
      setAdmins(prev => [...prev, data.admin]);
      setShowAddModal(false);
      setAdminForm(EMPTY_ADMIN_FORM);
      setAdminMsg({ type: 'success', text: `✅ تم إنشاء حساب المشرف "${data.admin.name}" بنجاح` });
      setTimeout(() => setAdminMsg(null), 4000);
    }
    setAddingAdmin(false);
  }

  async function handleDeleteAdmin(id, name) {
    if (!confirm(`هل تريد حذف حساب "${name}" نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    setDeletingId(id);
    const res  = await fetch(`/api/bogga/admins/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      setAdmins(prev => prev.filter(a => a.id !== id));
    } else {
      setAdminMsg({ type: 'error', text: data.error });
    }
    setDeletingId(null);
  }

  // ── Promotion ────────────────────────────────────────────────────
  async function handlePromote() {
    if (!confirm('سيتم ترقية حسابك إلى مدير مطلق. هذا الإجراء لا يمكن التراجع عنه. هل تريد المتابعة؟')) return;
    setPromoting(true); setPromoMsg(null);
    const res  = await fetch('/api/bogga/make-super-admin', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setPromoMsg({ type: 'success', text: '✅ تمت الترقية! سيتم تحديث الصفحة...' });
      // Refresh session so new role propagates
      await supabase.auth.refreshSession();
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setPromoMsg({ type: 'error', text: data.error });
    }
    setPromoting(false);
  }

  // ── Setup ─────────────────────────────────────────────────────────
  function copySetupSql() {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render guard ─────────────────────────────────────────────────
  if (!user) return null;

  const isSuperAdmin = role === 'super_admin';

  const TABS = [
    { id: 'overview',    label: '📊 نظرة عامة',         show: true },
    { id: 'codes',       label: '🔑 الأكواد',              show: true },
    { id: 'groups',      label: '👥 إدارة الطلاب',       show: true },
    { id: 'lexicon',     label: '📖 بنك الكلمات',         show: true },
    { id: 'recruitment', label: '📋 طلبات التوظيف',      show: isSuperAdmin },
    { id: 'admins',      label: '👑 إدارة المشرفين',     show: isSuperAdmin },
    { id: 'setup',       label: '⚙️ إعداد',               show: true },
  ].filter(t => t.show);

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap" dir="rtl">
        <div className="container">

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                🏰 حصن الإدارة
              </h1>
              <p style={{ color: isSuperAdmin ? '#1a7c40' : 'var(--muted)', fontSize: '.88rem', fontWeight: isSuperAdmin ? 700 : 400 }}>
                {isSuperAdmin ? '👑 مدير مطلق — صلاحيات كاملة' : '🛡️ مشرف مساعد — صلاحيات محدودة'}
              </p>
            </div>
            <div style={{ marginRight: 'auto' }}>
              <Link href="/bogga/lexicon" className="btn btn-outline btn-sm">📖 بنك الكلمات</Link>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28, borderBottom: '2px solid var(--border)', paddingBottom: 14 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 700,
                  background: tab === t.id ? 'var(--primary)' : 'var(--bg)',
                  color: tab === t.id ? '#fff' : 'var(--muted)',
                  transition: 'all .15s',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ══════════════ Overview Tab ══════════════ */}
          {tab === 'overview' && (
            <div>
              <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 32 }}>
                {[
                  { icon: '📋', val: stats.assessments, lbl: 'إجمالي التقييمات' },
                  { icon: '✅', val: stats.pass,         lbl: 'ناجحون (≥70%)' },
                  { icon: '📊', val: stats.avg + '%',    lbl: 'متوسط النتائج' },
                  ...(isSuperAdmin ? [{ icon: '📄', val: stats.applications, lbl: 'طلبات التوظيف' }] : []),
                ].map(s => (
                  <div key={s.lbl} className="stat-card">
                    <span className="stat-icon">{s.icon}</span>
                    <div><div className="stat-val">{s.val}</div><div className="stat-lbl">{s.lbl}</div></div>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>
                  {isSuperAdmin ? '👑 صلاحيات المدير المطلق' : '🛡️ صلاحياتك كمشرف مساعد'}
                </h3>
                {isSuperAdmin ? (
                  <ul style={{ paddingRight: 20, lineHeight: 2.2, color: 'var(--text)' }}>
                    <li>✅ تعديل وحذف أي شيء في المنصة</li>
                    <li>✅ إدارة وإنشاء المشرفين المساعدين (حد أقصى 2)</li>
                    <li>✅ الاطلاع على طلبات التوظيف والسير الذاتية</li>
                    <li>✅ تعديل بنك الكلمات اللغوية</li>
                    <li>✅ حذف حسابات الطلاب عند الضرورة</li>
                    <li>✅ توليد أكواد التقييم والدعوة</li>
                  </ul>
                ) : (
                  <ul style={{ paddingRight: 20, lineHeight: 2.2, color: 'var(--text)' }}>
                    <li>✅ مراقبة الصفوف ومتابعة نتائج الطلاب</li>
                    <li>✅ توليد وإصدار أكواد التقييم للطلاب</li>
                    <li>✅ الاطلاع على بنك الكلمات</li>
                    <li>🚫 لا يمكن حذف الحسابات أو تعديل المعجم</li>
                    <li>🚫 لا يمكن الاطلاع على طلبات التوظيف</li>
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ══════════════ Codes Tab ══════════════ */}
          {tab === 'codes' && (
            <div>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--bg)', borderRadius: 12, padding: 6, width: 'fit-content' }}>
                {[
                  { id: 'assessment', label: '📋 أكواد التقييم' },
                  { id: 'students',   label: '👤 أكواد الطلبة' },
                  { id: 'teachers',   label: '👨‍🏫 أكواد المعلمين' },
                ].map(st => (
                  <button key={st.id} onClick={() => setCodesTab(st.id)}
                    style={{
                      padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 700,
                      background: codesTab === st.id ? '#fff' : 'transparent',
                      color: codesTab === st.id ? 'var(--primary)' : 'var(--muted)',
                      boxShadow: codesTab === st.id ? '0 1px 6px rgba(0,0,0,.1)' : 'none',
                      transition: 'all .15s',
                    }}>
                    {st.label}
                  </button>
                ))}
              </div>

              {codesTab === 'assessment' && <AssessmentCodes />}
              {codesTab === 'students'   && <StudentCodes />}
              {codesTab === 'teachers'   && <TeacherCodes />}
            </div>
          )}

          {/* ══════════════ Groups Tab ══════════════ */}
          {tab === 'groups' && <GroupsManager />}

          {/* ══════════════ Lexicon Tab ══════════════ */}
          {tab === 'lexicon' && (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📖</div>
              <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 12 }}>بنك الكلمات اللغوية</h3>
              <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
                إدارة الكلمات المشكولة وتعديلها وإضافة الجذور والمقاطع الصوتية لكل صف
              </p>
              <Link href="/bogga/lexicon" className="btn btn-primary btn-lg">
                فتح لوحة بنك الكلمات
              </Link>
            </div>
          )}

          {/* ══════════════ Recruitment Tab ══════════════ */}
          {tab === 'recruitment' && isSuperAdmin && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)' }}>📋 طلبات الترشح للتوظيف</h2>
                <button onClick={loadApps} className="btn btn-outline btn-sm">🔄 تحديث</button>
              </div>
              {appsLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                </div>
              ) : apps.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">📭</span><p>لا توجد طلبات توظيف بعد</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {apps.map(app => (
                    <div key={app.id} className="card" style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4 }}>{app.name}</div>
                          <div style={{ fontSize: '.85rem', color: 'var(--muted)', lineHeight: 1.9 }}>
                            📧 {app.email} &nbsp;|&nbsp; 📱 <bdi dir="ltr">{app.phone}</bdi><br />
                            💼 {app.experience} &nbsp;|&nbsp; 🎓 {app.specialty}
                          </div>
                          {app.notes && (
                            <div style={{ marginTop: 8, fontSize: '.83rem', color: '#475569', background: 'var(--bg)', padding: '8px 12px', borderRadius: 8 }}>
                              {app.notes}
                            </div>
                          )}
                          <button
                            onClick={() => downloadCV(app.id, null)}
                            disabled={downloadingCV[app.id]}
                            className="btn btn-sm btn-outline"
                            style={{ marginTop: 10, fontSize: '.8rem', gap: 6 }}>
                            {downloadingCV[app.id]
                              ? <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />جارٍ التحميل...</>
                              : '⬇️ تحميل السيرة الذاتية'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '.78rem', fontWeight: 700, background: STATUS_COLORS[app.status] + '20', color: STATUS_COLORS[app.status] }}>
                            {STATUS_LABELS[app.status] ?? app.status}
                          </span>
                          <select value={app.status} onChange={e => updateAppStatus(app.id, e.target.value)}
                            style={{ fontSize: '.8rem', padding: '4px 8px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'inherit' }}>
                            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                          <button
                            onClick={() => deleteApp(app.id, app.name)}
                            disabled={deletingApp === app.id}
                            className="btn btn-sm btn-danger"
                            style={{ fontSize: '.78rem' }}>
                            {deletingApp === app.id
                              ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                              : '🗑️ حذف'}
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 10 }}>
                        {new Date(app.created_at).toLocaleString('ar-SA')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════ Admins Management Tab ══════════════ */}
          {tab === 'admins' && isSuperAdmin && (
            <div>
              {/* Tab header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>👑 إدارة المشرفين المساعدين</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
                    حد أقصى 2 مشرفين مساعدين — {admins.length}/2 مستخدَم
                  </p>
                </div>
                <button
                  onClick={() => { setShowAddModal(true); setAdminMsg(null); }}
                  disabled={admins.length >= 2}
                  className="btn btn-primary"
                  style={{ opacity: admins.length >= 2 ? .5 : 1 }}>
                  + إضافة مشرف مساعد جديد
                </button>
              </div>

              {admins.length >= 2 && (
                <div className="alert alert-info" style={{ marginBottom: 18 }}>
                  ⚠️ وصلت للحد الأقصى (2 مشرفين). احذف مشرفاً حالياً لإضافة آخر.
                </div>
              )}

              {adminMsg && (
                <div className={`alert alert-${adminMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 18 }}>
                  {adminMsg.text}
                </div>
              )}

              {/* Admins table */}
              {adminsLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                </div>
              ) : admins.length === 0 ? (
                <div className="empty-state card">
                  <span className="empty-icon">👥</span>
                  <p>لا يوجد مشرفون مساعدون بعد — أضف مشرفاً جديداً</p>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>البريد الإلكتروني</th>
                        <th>تاريخ الإنشاء</th>
                        <th>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 700 }}>{a.name}</td>
                          <td style={{ direction: 'ltr', textAlign: 'right' }}>{a.email}</td>
                          <td style={{ color: 'var(--muted)', fontSize: '.83rem' }}>
                            {new Date(a.created_at).toLocaleDateString('ar-SA')}
                          </td>
                          <td>
                            <button
                              onClick={() => handleDeleteAdmin(a.id, a.name)}
                              disabled={deletingId === a.id}
                              className="btn btn-sm btn-danger">
                              {deletingId === a.id ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '🗑️ حذف'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ Setup Tab ══════════════ */}
          {tab === 'setup' && (
            <div>

              {/* ── Promotion section (for non-super_admin) ── */}
              {!isSuperAdmin && (
                <div className="card" style={{ marginBottom: 28, border: '2px solid #F5A623', background: '#fffbf0' }}>
                  <h3 style={{ fontWeight: 800, color: '#b56a00', marginBottom: 10, fontSize: '1.1rem' }}>
                    👑 ترقية حسابك إلى مدير مطلق
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '.9rem', lineHeight: 1.7, marginBottom: 16 }}>
                    إذا كنت المدير الرئيسي للمنصة ولم يكن هناك مدير مطلق بعد، اضغط الزر أدناه لترقية حسابك.
                    هذا الإجراء متاح مرة واحدة فقط ولا يمكن التراجع عنه.
                  </p>
                  {promoMsg && (
                    <div className={`alert alert-${promoMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>
                      {promoMsg.text}
                    </div>
                  )}
                  <button onClick={handlePromote} disabled={promoting} className="btn btn-accent btn-lg" style={{ gap: 10 }}>
                    {promoting ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#7A3800', borderColor: 'rgba(122,56,0,.2)' }} />جارٍ الترقية...</> : '👑 ترقية حسابي إلى مدير مطلق'}
                  </button>
                </div>
              )}

              {/* ── SQL setup ── */}
              {isSuperAdmin && (
                <>
                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 16 }}>⚙️ تهيئة قاعدة البيانات</h2>
                  <div className="alert alert-info" style={{ marginBottom: 20 }}>
                    افتح <strong>Supabase → SQL Editor</strong> ثم الصق هذا الكود وشغّله لإنشاء الجداول اللازمة للمنصة.
                  </div>
                  <div style={{ position: 'relative' }}>
                    <pre style={{ background: '#1a1a2e', color: '#e2e8f0', borderRadius: 14, padding: '24px 20px', fontSize: '.82rem', lineHeight: 1.8, overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: "'Courier New', monospace" }}>
                      {SETUP_SQL}
                    </pre>
                    <button onClick={copySetupSql} className="btn btn-sm"
                      style={{ position: 'absolute', top: 12, left: 12, background: copied ? '#1a7c40' : 'rgba(255,255,255,.15)', color: '#fff', border: 'none' }}>
                      {copied ? '✅ تم النسخ' : '📋 نسخ'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ══════════════ Add Admin Modal ══════════════ */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 440, direction: 'rtl', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20, fontSize: '1.15rem' }}>
              + إضافة مشرف مساعد جديد
            </h2>

            {adminMsg && (
              <div className={`alert alert-${adminMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>
                {adminMsg.text}
              </div>
            )}

            <form onSubmit={handleAddAdmin}>
              <div className="form-group">
                <label className="form-label">الاسم الكامل *</label>
                <input className="form-input" value={adminForm.name} required
                  onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="أدخل الاسم الكامل" />
              </div>
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني *</label>
                <input className="form-input" type="email" value={adminForm.email} required
                  onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="admin@example.com" dir="ltr" />
              </div>
              <div className="form-group">
                <label className="form-label">كلمة المرور المؤقتة *</label>
                <input className="form-input" type="password" value={adminForm.password} required
                  onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="8 أحرف على الأقل" dir="ltr" />
                <p className="form-help">سيتمكن المشرف من تغييرها لاحقاً من الملف الشخصي</p>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={addingAdmin} style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
                  {addingAdmin ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />جارٍ الإنشاء...</> : '✅ إنشاء الحساب'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowAddModal(false); setAdminMsg(null); }}>
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
