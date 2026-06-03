'use client';
import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import Link                    from 'next/link';
import { createClient }        from '../../lib/supabase';
import Navbar                  from '../../components/Navbar';
import AssessmentCodes         from '../../components/AssessmentCodes';
import StudentCodes             from '../../components/StudentCodes';
import TeacherCodes             from '../../components/TeacherCodes';
import GroupsManager            from '../../components/GroupsManager';

// ── Time slots: 08:00 → 20:00 in 30-min increments (25 slots) ──
const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const mins = 8 * 60 + i * 30;
  const h    = Math.floor(mins / 60);
  const m    = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

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
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  word         TEXT        NOT NULL,
  word_type    TEXT        NOT NULL,
  sentence     TEXT,
  topic        TEXT,
  grade_from   INT         NOT NULL DEFAULT 1,
  grade_to     INT         NOT NULL DEFAULT 7,
  syllables    TEXT,
  root         TEXT,
  image_base64 TEXT,
  audio_base64 TEXT,
  has_image    BOOLEAN     NOT NULL DEFAULT FALSE,
  has_audio    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول المقابلات الوظيفية
CREATE TABLE IF NOT EXISTS interviews (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID        NOT NULL REFERENCES recruitment_applications(id) ON DELETE CASCADE,
  interviewer_name  TEXT        NOT NULL,
  interview_date    DATE        NOT NULL,
  start_time        TIME        NOT NULL,
  candidate_response TEXT       NOT NULL DEFAULT 'pending'
    CONSTRAINT valid_response CHECK (
      candidate_response IN ('pending','confirmed','reschedule_requested','rejected')
    ),
  reschedule_reason TEXT,
  response_token    UUID        NOT NULL DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ترقية جدول الكلمات إن كان موجوداً بدون أعمدة الوسائط
ALTER TABLE lexicon_words ADD COLUMN IF NOT EXISTS image_base64 TEXT;
ALTER TABLE lexicon_words ADD COLUMN IF NOT EXISTS audio_base64 TEXT;
ALTER TABLE lexicon_words ADD COLUMN IF NOT EXISTS has_image BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE lexicon_words ADD COLUMN IF NOT EXISTS has_audio BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE recruitment_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE lexicon_words            DISABLE ROW LEVEL SECURITY;
ALTER TABLE interviews               DISABLE ROW LEVEL SECURITY;

-- فهرس لفحص تعارض المواعيد
CREATE INDEX IF NOT EXISTS interviews_slot_idx
  ON interviews (interviewer_name, interview_date, start_time);`;

const STATUS_LABELS = { pending: 'قيد المراجعة', reviewed: 'تمت المراجعة', accepted: 'مقبول', rejected: 'مرفوض' };
const STATUS_COLORS = { pending: '#b56a00', reviewed: '#185FA5', accepted: '#1a7c40', rejected: '#e53e3e' };

const IV_LABELS = {
  pending:              '⏳ بانتظار الرد',
  confirmed:            '✅ مؤكد',
  reschedule_requested: '📅 طلب تعديل',
  rejected:             '❌ اعتذر',
};
const IV_COLORS = {
  pending:              '#b56a00',
  confirmed:            '#1a7c40',
  reschedule_requested: '#185FA5',
  rejected:             '#e53e3e',
};

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS_AR[parseInt(m) - 1]} ${y}`;
}

const EMPTY_ADMIN_FORM = { name: '', email: '', password: '' };

export default function BruteAdminPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [tab,  setTab]  = useState('overview');

  // Stats
  const [stats, setStats] = useState({ assessments: 0, pass: 0, avg: 0, applications: 0 });

  // Recruitment
  const [apps,        setApps]        = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [deletingApp, setDeletingApp] = useState(null);
  const [downloadingCV, setDownloadingCV] = useState({});

  // Interviews
  const [interviewsMap,       setInterviewsMap]       = useState({}); // { [appId]: interview[] }
  const [schedModal,          setSchedModal]           = useState(null); // app | null
  const [schedDate,           setSchedDate]            = useState('');
  const [schedInterviewer,    setSchedInterviewer]     = useState('');
  const [schedTime,           setSchedTime]            = useState('');
  const [bookedSlots,         setBookedSlots]          = useState([]);
  const [slotsLoading,        setSlotsLoading]         = useState(false);
  const [schedulingBusy,      setSchedulingBusy]       = useState(false);
  const [schedMsg,            setSchedMsg]             = useState(null);
  const [cancellingInterview, setCancellingInterview]  = useState(null);

  // Admins management
  const [admins,        setAdmins]        = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [adminForm,     setAdminForm]     = useState(EMPTY_ADMIN_FORM);
  const [addingAdmin,   setAddingAdmin]   = useState(false);
  const [adminMsg,      setAdminMsg]      = useState(null);
  const [deletingId,    setDeletingId]    = useState(null);

  // Promotion
  const [promoting, setPromoting] = useState(false);
  const [promoMsg,  setPromoMsg]  = useState(null);

  // Codes sub-tab
  const [codesTab, setCodesTab] = useState('assessment');

  // Setup
  const [copied, setCopied] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────
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
    if (tab === 'recruitment' && role === 'super_admin') { loadApps(); loadInterviews(); }
    if (tab === 'admins'      && role === 'super_admin') loadAdmins();
  }, [user, tab]);

  // Fetch booked slots whenever date or interviewer changes (modal only)
  useEffect(() => {
    if (!schedModal || !schedDate || !schedInterviewer) { setBookedSlots([]); return; }
    setSlotsLoading(true);
    fetch(`/api/bogga/interviews?date=${schedDate}&interviewer=${encodeURIComponent(schedInterviewer)}`)
      .then(r => r.json())
      .then(d => {
        setBookedSlots((d.interviews ?? []).map(iv => iv.start_time?.slice(0, 5)));
      })
      .catch(() => setBookedSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [schedDate, schedInterviewer, schedModal]);

  // ── Data loaders ───────────────────────────────────────────────────
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
    const res  = await fetch('/api/bogga/recruitment');
    const data = await res.json();
    setApps(data.applications ?? []);
    setAppsLoading(false);
  }

  async function loadInterviews() {
    const res  = await fetch('/api/bogga/interviews');
    const data = await res.json();
    const map  = {};
    (data.interviews ?? []).forEach(iv => {
      if (!map[iv.application_id]) map[iv.application_id] = [];
      map[iv.application_id].push(iv);
    });
    setInterviewsMap(map);
  }

  async function loadAdmins() {
    setAdminsLoading(true);
    const res  = await fetch('/api/bogga/admins');
    const data = await res.json();
    setAdmins(data.admins ?? []);
    setAdminsLoading(false);
  }

  // ── Recruitment ────────────────────────────────────────────────────
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
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setApps(prev => prev.filter(a => a.id !== id));
      setInterviewsMap(prev => { const m = { ...prev }; delete m[id]; return m; });
    } else {
      const data = await res.json();
      alert(data.error || 'تعذر حذف الطلب');
    }
    setDeletingApp(null);
  }

  async function downloadCV(id) {
    setDownloadingCV(p => ({ ...p, [id]: true }));
    try {
      const res  = await fetch(`/api/bogga/recruitment/${id}`);
      const data = await res.json();
      if (!res.ok || !data.cv_base64) { alert(data.error || 'لا توجد سيرة ذاتية مرفقة'); return; }
      const link   = document.createElement('a');
      link.href     = `data:application/pdf;base64,${data.cv_base64}`;
      link.download = data.cv_filename || 'cv.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingCV(p => ({ ...p, [id]: false }));
    }
  }

  // ── Interviews ─────────────────────────────────────────────────────
  function openScheduleModal(app) {
    const existing = (interviewsMap[app.id] ?? []).slice(-1)[0];
    setSchedModal(app);
    setSchedDate(existing?.interview_date ?? '');
    setSchedInterviewer(
      user?.user_metadata?.full_name || user?.email || 'المدير المطلق'
    );
    setSchedTime('');
    setBookedSlots([]);
    setSchedMsg(null);
  }

  async function handleSchedule() {
    if (!schedDate || !schedInterviewer.trim() || !schedTime || !schedModal) return;
    setSchedulingBusy(true);
    setSchedMsg(null);

    const res  = await fetch('/api/bogga/interviews', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        application_id:   schedModal.id,
        interviewer_name: schedInterviewer.trim(),
        interview_date:   schedDate,
        start_time:       schedTime,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setSchedMsg({ type: 'error', text: data.error || 'حدث خطأ غير متوقع' });
    } else {
      const msg = data.emailSent
        ? '✅ تمّ حجز الموعد وإرسال الدعوة للمترشح بنجاح!'
        : '✅ تمّ حجز الموعد (تعذّر إرسال الإيميل — تحقق من إعداد البريد)';
      setSchedMsg({ type: 'success', text: msg });
      const iv = data.interview;
      setInterviewsMap(prev => ({
        ...prev,
        [schedModal.id]: [...(prev[schedModal.id] ?? []), iv],
      }));
      setTimeout(() => { setSchedModal(null); setSchedMsg(null); }, 2200);
    }
    setSchedulingBusy(false);
  }

  async function cancelInterview(ivId, appId) {
    if (!confirm('هل تريد إلغاء هذه المقابلة؟')) return;
    setCancellingInterview(ivId);
    const res = await fetch('/api/bogga/interviews', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ivId }),
    });
    if (res.ok) {
      setInterviewsMap(prev => ({
        ...prev,
        [appId]: (prev[appId] ?? []).filter(iv => iv.id !== ivId),
      }));
    }
    setCancellingInterview(null);
  }

  // ── Admins management ──────────────────────────────────────────────
  async function handleAddAdmin(e) {
    e.preventDefault();
    setAddingAdmin(true); setAdminMsg(null);
    const res  = await fetch('/api/bogga/admins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminForm),
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
    if (!confirm(`هل تريد حذف حساب "${name}" نهائياً؟`)) return;
    setDeletingId(id);
    const res  = await fetch(`/api/bogga/admins/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) setAdmins(prev => prev.filter(a => a.id !== id));
    else setAdminMsg({ type: 'error', text: data.error });
    setDeletingId(null);
  }

  // ── Promotion ──────────────────────────────────────────────────────
  async function handlePromote() {
    if (!confirm('سيتم ترقية حسابك إلى مدير مطلق. هذا الإجراء لا يمكن التراجع عنه. هل تريد المتابعة؟')) return;
    setPromoting(true); setPromoMsg(null);
    const res  = await fetch('/api/bogga/make-super-admin', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setPromoMsg({ type: 'success', text: '✅ تمت الترقية! سيتم تحديث الصفحة...' });
      await supabase.auth.refreshSession();
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setPromoMsg({ type: 'error', text: data.error });
    }
    setPromoting(false);
  }

  function copySetupSql() {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
      <style>{`
        .time-btn { transition: all .15s; }
        .time-btn:not(:disabled):hover { background: var(--primary-lt) !important; border-color: var(--primary) !important; }
      `}</style>

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
                    <li>✅ جدولة مقابلات التوظيف وإرسال دعوات تفاعلية</li>
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
              <Link href="/bogga/lexicon" className="btn btn-primary btn-lg">فتح لوحة بنك الكلمات</Link>
            </div>
          )}

          {/* ══════════════ Recruitment Tab ══════════════ */}
          {tab === 'recruitment' && isSuperAdmin && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)' }}>📋 طلبات الترشح للتوظيف</h2>
                <button onClick={() => { loadApps(); loadInterviews(); }} className="btn btn-outline btn-sm">🔄 تحديث</button>
              </div>
              {appsLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                </div>
              ) : apps.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">📭</span><p>لا توجد طلبات توظيف بعد</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {apps.map(app => {
                    const ivList  = interviewsMap[app.id] ?? [];
                    const latestIv = ivList.slice(-1)[0];
                    return (
                      <div key={app.id} className="card" style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

                          {/* Left: candidate info */}
                          <div style={{ flex: '1 1 260px' }}>
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
                              onClick={() => downloadCV(app.id)}
                              disabled={downloadingCV[app.id]}
                              className="btn btn-sm btn-outline"
                              style={{ marginTop: 10, fontSize: '.8rem', gap: 6 }}>
                              {downloadingCV[app.id]
                                ? <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />جارٍ التحميل...</>
                                : '⬇️ تحميل السيرة الذاتية'}
                            </button>

                            {/* ── Interview Status Block ── */}
                            {latestIv && (
                              <div style={{
                                marginTop: 14, background: '#eef5ff',
                                borderRadius: 10, padding: '11px 14px',
                                fontSize: '.83rem', borderRight: '3px solid #185FA5',
                              }}>
                                <div style={{ fontWeight: 800, color: '#185FA5', marginBottom: 6, fontSize: '.88rem' }}>
                                  📅 المقابلة المجدولة
                                </div>
                                <div style={{ color: '#1a2d4a', lineHeight: 1.8 }}>
                                  📆 {fmtDate(latestIv.interview_date)}
                                  &nbsp;·&nbsp;
                                  ⏰ {latestIv.start_time?.slice(0, 5)}
                                  &nbsp;·&nbsp;
                                  👤 {latestIv.interviewer_name}
                                </div>
                                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                  <span style={{
                                    padding: '3px 11px', borderRadius: 20,
                                    fontSize: '.76rem', fontWeight: 700,
                                    background: (IV_COLORS[latestIv.candidate_response] ?? '#6b7280') + '22',
                                    color: IV_COLORS[latestIv.candidate_response] ?? '#6b7280',
                                  }}>
                                    {IV_LABELS[latestIv.candidate_response] ?? latestIv.candidate_response}
                                  </span>
                                  {cancellingInterview === latestIv.id
                                    ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2, borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                                    : (
                                      <button
                                        onClick={() => cancelInterview(latestIv.id, app.id)}
                                        style={{ fontSize: '.76rem', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                                        ✕ إلغاء المقابلة
                                      </button>
                                    )
                                  }
                                </div>
                                {latestIv.candidate_response === 'reschedule_requested' && latestIv.reschedule_reason && (
                                  <div style={{
                                    marginTop: 10, padding: '9px 12px',
                                    background: '#fff8e1', borderRadius: 8,
                                    border: '1px solid #ffe082',
                                    color: '#7a4f00', fontSize: '.83rem', lineHeight: 1.7,
                                  }}>
                                    💬 <strong>سبب طلب التعديل:</strong> {latestIv.reschedule_reason}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right: actions */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                            <span style={{
                              padding: '4px 12px', borderRadius: 20, fontSize: '.78rem', fontWeight: 700,
                              background: STATUS_COLORS[app.status] + '20', color: STATUS_COLORS[app.status],
                            }}>
                              {STATUS_LABELS[app.status] ?? app.status}
                            </span>
                            <select value={app.status} onChange={e => updateAppStatus(app.id, e.target.value)}
                              style={{ fontSize: '.8rem', padding: '4px 8px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'inherit' }}>
                              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                            <button
                              onClick={() => openScheduleModal(app)}
                              className="btn btn-sm"
                              style={{ background: '#e8f0fb', color: '#185FA5', border: '1.5px solid #b3ccee', fontSize: '.8rem', gap: 5 }}>
                              📅 {latestIv ? 'إعادة جدولة' : 'جدولة مقابلة'}
                            </button>
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
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════ Admins Management Tab ══════════════ */}
          {tab === 'admins' && isSuperAdmin && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>👑 إدارة المشرفين المساعدين</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>حد أقصى 2 مشرفين مساعدين — {admins.length}/2 مستخدَم</p>
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
                      <tr><th>الاسم</th><th>البريد الإلكتروني</th><th>تاريخ الإنشاء</th><th>إجراء</th></tr>
                    </thead>
                    <tbody>
                      {admins.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 700 }}>{a.name}</td>
                          <td style={{ direction: 'ltr', textAlign: 'right' }}>{a.email}</td>
                          <td style={{ color: 'var(--muted)', fontSize: '.83rem' }}>{new Date(a.created_at).toLocaleDateString('ar-SA')}</td>
                          <td>
                            <button onClick={() => handleDeleteAdmin(a.id, a.name)} disabled={deletingId === a.id} className="btn btn-sm btn-danger">
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
              {!isSuperAdmin && (
                <div className="card" style={{ marginBottom: 28, border: '2px solid #F5A623', background: '#fffbf0' }}>
                  <h3 style={{ fontWeight: 800, color: '#b56a00', marginBottom: 10, fontSize: '1.1rem' }}>👑 ترقية حسابك إلى مدير مطلق</h3>
                  <p style={{ color: '#64748b', fontSize: '.9rem', lineHeight: 1.7, marginBottom: 16 }}>
                    إذا كنت المدير الرئيسي للمنصة ولم يكن هناك مدير مطلق بعد، اضغط الزر أدناه لترقية حسابك.
                  </p>
                  {promoMsg && (
                    <div className={`alert alert-${promoMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>{promoMsg.text}</div>
                  )}
                  <button onClick={handlePromote} disabled={promoting} className="btn btn-accent btn-lg" style={{ gap: 10 }}>
                    {promoting ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#7A3800', borderColor: 'rgba(122,56,0,.2)' }} />جارٍ الترقية...</> : '👑 ترقية حسابي إلى مدير مطلق'}
                  </button>
                </div>
              )}
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

      {/* ══════════════ Interview Schedule Modal ══════════════ */}
      {schedModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget && !schedulingBusy) setSchedModal(null); }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: '28px 28px 24px', width: '100%', maxWidth: 520, direction: 'rtl', boxShadow: '0 24px 72px rgba(0,0,0,.28)', maxHeight: '92vh', overflowY: 'auto' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.15rem', margin: '0 0 4px' }}>📅 جدولة مقابلة</h2>
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', margin: 0 }}>{schedModal.name}</p>
              </div>
              <button onClick={() => { if (!schedulingBusy) setSchedModal(null); }} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--muted)', cursor: 'pointer', lineHeight: 1, padding: 2 }}>✕</button>
            </div>

            {schedMsg && (
              <div className={`alert alert-${schedMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 16 }}>
                {schedMsg.text}
              </div>
            )}

            {/* Interviewer */}
            <div className="form-group">
              <label className="form-label">👤 المقابِل</label>
              <input
                className="form-input"
                value={schedInterviewer}
                onChange={e => setSchedInterviewer(e.target.value)}
                placeholder="اسم من سيجري المقابلة"
                disabled={schedulingBusy}
              />
              <p className="form-help">سيظهر هذا الاسم في بريد الدعوة المرسل للمترشح</p>
            </div>

            {/* Date picker */}
            <div className="form-group">
              <label className="form-label">📆 تاريخ المقابلة</label>
              <input
                className="form-input"
                type="date"
                value={schedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => { setSchedDate(e.target.value); setSchedTime(''); }}
                disabled={schedulingBusy}
                dir="ltr"
              />
            </div>

            {/* Start time grid */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                ⏰ ساعة الانطلاق
                {slotsLoading && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />}
              </label>
              {!schedDate || !schedInterviewer.trim() ? (
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', background: 'var(--bg)', padding: '10px 14px', borderRadius: 8, margin: 0 }}>
                  حدّد المقابِل والتاريخ أولاً لعرض الأوقات المتاحة
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7, marginTop: 4 }}>
                  {TIME_SLOTS.map(slot => {
                    const booked   = bookedSlots.includes(slot);
                    const selected = schedTime === slot;
                    return (
                      <button
                        key={slot}
                        disabled={booked || schedulingBusy}
                        onClick={() => setSchedTime(slot)}
                        className="time-btn"
                        style={{
                          padding: '8px 2px', borderRadius: 9, fontFamily: 'inherit',
                          fontSize: '.8rem', fontWeight: selected ? 800 : 400, cursor: booked ? 'not-allowed' : 'pointer',
                          border: selected ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                          background: booked ? '#f8fafc' : selected ? 'var(--primary-lt)' : '#fff',
                          color: booked ? '#c4c8d0' : selected ? 'var(--primary)' : 'var(--text)',
                          textDecoration: booked ? 'line-through' : 'none',
                        }}>
                        {slot}
                        {booked && <span style={{ fontSize: '.6rem', display: 'block', color: '#e53e3e', textDecoration: 'none' }}>محجوز</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm button */}
            <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
              <button
                onClick={handleSchedule}
                disabled={!schedDate || !schedInterviewer.trim() || !schedTime || schedulingBusy}
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', gap: 8, opacity: (!schedDate || !schedInterviewer.trim() || !schedTime) ? .55 : 1 }}>
                {schedulingBusy
                  ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />جارٍ الحجز وإرسال الدعوة...</>
                  : '✅ تأكيد الموعد وإرسال الدعوة'}
              </button>
              <button onClick={() => { if (!schedulingBusy) setSchedModal(null); }} className="btn btn-ghost" disabled={schedulingBusy}>إلغاء</button>
            </div>

            {schedTime && (
              <div style={{ marginTop: 12, background: '#eef5ff', borderRadius: 9, padding: '10px 14px', fontSize: '.83rem', color: '#1a2d4a' }}>
                📋 سيُرسَل بريد إلى <strong>{schedModal.email}</strong> بموعد {fmtDate(schedDate)} الساعة {schedTime} مع المقابِل <strong>{schedInterviewer}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ Add Admin Modal ══════════════ */}
      {showAddModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 440, direction: 'rtl', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20, fontSize: '1.15rem' }}>+ إضافة مشرف مساعد جديد</h2>
            {adminMsg && (
              <div className={`alert alert-${adminMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>{adminMsg.text}</div>
            )}
            <form onSubmit={handleAddAdmin}>
              <div className="form-group">
                <label className="form-label">الاسم الكامل *</label>
                <input className="form-input" value={adminForm.name} required onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} placeholder="أدخل الاسم الكامل" />
              </div>
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني *</label>
                <input className="form-input" type="email" value={adminForm.email} required onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} placeholder="admin@example.com" dir="ltr" />
              </div>
              <div className="form-group">
                <label className="form-label">كلمة المرور المؤقتة *</label>
                <input className="form-input" type="password" value={adminForm.password} required onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} placeholder="8 أحرف على الأقل" dir="ltr" />
                <p className="form-help">سيتمكن المشرف من تغييرها لاحقاً</p>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={addingAdmin} style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
                  {addingAdmin ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />جارٍ الإنشاء...</> : '✅ إنشاء الحساب'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowAddModal(false); setAdminMsg(null); }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
