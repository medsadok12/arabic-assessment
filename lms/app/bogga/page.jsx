'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter }                    from 'next/navigation';
import Link                             from 'next/link';
import { createClient }                 from '../../lib/supabase';
import Navbar                           from '../../components/Navbar';
import AssessmentCodes                  from '../../components/AssessmentCodes';
import StudentCodes                     from '../../components/StudentCodes';
import TeacherCodes                     from '../../components/TeacherCodes';
import GroupsManager                    from '../../components/GroupsManager';

// ── Time slots 08:00 → 20:00, 30-min increments (25 slots) ─────────────────
const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const mins = 8 * 60 + i * 30;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

// ── Tabs that assistant admins can be granted access to ─────────────────────
const CONTROLLABLE = ['overview', 'codes', 'groups', 'sessions', 'results', 'lexicon', 'recruitment', 'setup'];
const TAB_NAMES = {
  overview: 'نظرة عامة', codes: 'الأكواد', groups: 'إدارة الطلاب',
  sessions: 'الحصص', results: 'نتائج الطلاب', lexicon: 'بنك الكلمات',
  recruitment: 'طلبات التوظيف', setup: 'الإعداد',
};

// ── Arabic month names ──────────────────────────────────────────────────────
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS_AR[parseInt(m) - 1]} ${y}`;
}

// ── Quick contact helpers ───────────────────────────────────────────────────
function waLink(phone) {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

// ── Toggle Switch component ─────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      style={{
        width: 42, height: 24, borderRadius: 12, border: 'none', padding: 0,
        background: checked ? '#1a7c40' : '#d1d5db',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background .22s',
        position: 'relative', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        right: checked ? 3 : 'auto', left: checked ? 'auto' : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,.25)',
        transition: 'right .22s, left .22s',
        display: 'block',
      }} />
    </button>
  );
}

const STATUS_LABELS = { pending: 'قيد المراجعة', reviewed: 'تمت المراجعة', accepted: 'مقبول', rejected: 'مرفوض' };
const STATUS_COLORS = { pending: '#b56a00', reviewed: '#185FA5', accepted: '#1a7c40', rejected: '#e53e3e' };
const IV_LABELS = {
  pending: '⏳ بانتظار الرد', confirmed: '✅ مؤكد',
  reschedule_requested: '📅 طلب تعديل', rejected: '❌ اعتذر',
};
const IV_COLORS = {
  pending: '#b56a00', confirmed: '#1a7c40',
  reschedule_requested: '#185FA5', rejected: '#e53e3e',
};

const EMPTY_ADMIN_FORM = { name: '', email: '' };

const SETUP_SQL = `-- تشغيل هذا SQL في Supabase SQL Editor لتهيئة جميع الجداول:

-- 1. جدول طلبات التوظيف
CREATE TABLE IF NOT EXISTS recruitment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
  experience TEXT, specialty TEXT, notes TEXT, cv_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. جدول بنك الكلمات
CREATE TABLE IF NOT EXISTS lexicon_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL, word_type TEXT NOT NULL,
  sentence TEXT, topic TEXT,
  grade_from INT NOT NULL DEFAULT 1, grade_to INT NOT NULL DEFAULT 7,
  syllables TEXT, root TEXT,
  image_base64 TEXT, audio_base64 TEXT,
  has_image BOOLEAN NOT NULL DEFAULT FALSE, has_audio BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. جدول المقابلات الوظيفية
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES recruitment_applications(id) ON DELETE CASCADE,
  interviewer_name TEXT NOT NULL,
  interview_date DATE NOT NULL, start_time TIME NOT NULL,
  candidate_response TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT valid_response CHECK (
      candidate_response IN ('pending','confirmed','reschedule_requested','rejected')
    ),
  reschedule_reason TEXT,
  response_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. جدول صلاحيات المساعدين (RLS مُفعَّل)
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL, tab_key TEXT NOT NULL,
  is_allowed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (admin_id, tab_key)
);
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "admins_read_own_permissions" ON admin_permissions
  FOR SELECT USING (auth.uid() = admin_id);

-- ترقيات آمنة للجداول القديمة
ALTER TABLE lexicon_words ADD COLUMN IF NOT EXISTS image_base64 TEXT;
ALTER TABLE lexicon_words ADD COLUMN IF NOT EXISTS audio_base64 TEXT;
ALTER TABLE lexicon_words ADD COLUMN IF NOT EXISTS has_image BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE lexicon_words ADD COLUMN IF NOT EXISTS has_audio BOOLEAN NOT NULL DEFAULT FALSE;
-- 5. جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  meta JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. جدول حصص التدريس
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  teacher_name TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  subject TEXT,
  room_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CONSTRAINT valid_status CHECK (status IN ('scheduled','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recruitment_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE lexicon_words            DISABLE ROW LEVEL SECURITY;
ALTER TABLE interviews               DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS notes  TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS rating INT CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS meet_link     TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS meet_event_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sessions ALTER COLUMN room_name DROP NOT NULL;
CREATE INDEX IF NOT EXISTS interviews_slot_idx ON interviews (interviewer_name, interview_date, start_time);
CREATE INDEX IF NOT EXISTS sessions_teacher_idx ON sessions (teacher_id, session_date);
CREATE INDEX IF NOT EXISTS sessions_student_idx ON sessions (student_email, session_date);
NOTIFY pgrst, 'reload schema';`;

// ════════════════════════════════════════════════════════════════════════════
export default function BoggarAdminPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [tab,  setTab]  = useState('overview');

  // My permissions (non-super_admin only; null = loading, {} = no perms)
  const [myPermissions, setMyPermissions] = useState(null);

  // Stats
  const [stats, setStats] = useState({ assessments: 0, pass: 0, avg: 0, applications: 0 });

  // Recruitment
  const [apps,          setApps]          = useState([]);
  const [appsLoading,   setAppsLoading]   = useState(false);
  const [deletingApp,   setDeletingApp]   = useState(null);
  const [downloadingCV, setDownloadingCV] = useState({});

  // Interviews
  const [interviewsMap,       setInterviewsMap]       = useState({});
  const [schedModal,          setSchedModal]           = useState(null);
  const [schedDate,           setSchedDate]            = useState('');
  const [schedInterviewer,    setSchedInterviewer]     = useState('');
  const [schedTime,           setSchedTime]            = useState('');
  const [bookedSlots,         setBookedSlots]          = useState([]);
  const [slotsLoading,        setSlotsLoading]         = useState(false);
  const [schedulingBusy,      setSchedulingBusy]       = useState(false);
  const [schedMsg,            setSchedMsg]             = useState(null);
  const [cancellingInterview, setCancellingInterview]  = useState(null);

  // Admins
  const [admins,        setAdmins]        = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [adminForm,     setAdminForm]     = useState(EMPTY_ADMIN_FORM);
  const [addingAdmin,   setAddingAdmin]   = useState(false);
  const [adminMsg,      setAdminMsg]      = useState(null);
  const [deletingId,    setDeletingId]    = useState(null);
  const [suspendingId,  setSuspendingId]  = useState(null);
  const [suspended,     setSuspended]     = useState(false);

  // Online status & activity
  const [onlineStatus,    setOnlineStatus]    = useState({});
  const [activityModal,   setActivityModal]   = useState(null);
  const [activityData,    setActivityData]    = useState({ sessions: [], online: null });
  const [activityLoading, setActivityLoading] = useState(false);

  // ── Granular ACL ─────────────────────────────────────────────────────────
  // allPerms[adminId][tabKey] = bool — for super_admin popover UI
  const [allPerms,     setAllPerms]     = useState({});
  const [permsLoading, setPermsLoading] = useState(false);
  // permPopover: { tabKey, top, left } or null
  const [permPopover,  setPermPopover]  = useState(null);
  const [permSaving,   setPermSaving]   = useState({});
  const [permError,    setPermError]    = useState(null);
  const permPopoverRef = useRef(null);

  // Promotion
  const [promoting, setPromoting] = useState(false);
  const [promoMsg,  setPromoMsg]  = useState(null);

  // Codes sub-tab
  const [codesTab, setCodesTab] = useState('assessment');

  // Setup
  const [copied, setCopied] = useState(false);

  // Results tab
  const [results,        setResults]        = useState([]);
  const [resultsTotal,   setResultsTotal]   = useState(0);
  const [resultsPage,    setResultsPage]    = useState(1);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsStats,   setResultsStats]   = useState({ total: 0, passed: 0, avg: 0 });
  const [resultsSearch,  setResultsSearch]  = useState('');
  const [resultsLevel,   setResultsLevel]   = useState('');
  const [resultsMin,     setResultsMin]     = useState('');
  const [resultsMax,     setResultsMax]     = useState('');

  // Admin Sessions
  const [adminSessions,     setAdminSessions]     = useState([]);
  const [adminSessLoading,  setAdminSessLoading]  = useState(false);
  const [adminSessTab,      setAdminSessTab]       = useState('upcoming');
  const [adminCompleteFor,  setAdminCompleteFor]  = useState(null);
  const [adminRecordingUrl, setAdminRecordingUrl] = useState('');
  const [adminCompleteSav,  setAdminCompleteSav]  = useState(false);
  const [adminCancellingId, setAdminCancellingId] = useState(null);
  const [adminWeekOffset,   setAdminWeekOffset]   = useState(0);
  const [adminTeacherFilter,setAdminTeacherFilter]= useState('');

  // Notifications
  const [notifications,  setNotifications]  = useState([]);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [bellOpen,       setBellOpen]       = useState(false);
  const bellRef = useRef(null);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/auth/login'); return; }
      const r = u.user_metadata?.role ?? '';
      if (r !== 'admin' && r !== 'super_admin') { router.push('/dashboard'); return; }
      if (r === 'admin' && u.user_metadata?.status === 'suspended') { setSuspended(true); setUser(u); setRole(r); return; }
      setUser(u); setRole(r);
    });
  }, []);

  // ── Load own permissions (non-super_admin) ────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (role === 'super_admin') { setMyPermissions({}); return; }
    fetch('/api/bogga/permissions/my')
      .then(r => r.json())
      .then(d => {
        if (d.suspended) { setSuspended(true); return; }
        setMyPermissions(d.permissions ?? {});
      })
      .catch(() => setMyPermissions({}));
  }, [user, role]);

  // ── Heartbeat ping every 2 minutes ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const ping = () => fetch('/api/bogga/activity', { method: 'POST' }).catch(() => {});
    ping();
    const iv = setInterval(ping, 2 * 60 * 1000);
    return () => clearInterval(iv);
  }, [user]);

  // ── Redirect to first allowed tab after permissions load ─────────────────
  useEffect(() => {
    if (!myPermissions || role === 'super_admin') return;
    const allowed = CONTROLLABLE.filter(t => myPermissions[t] === true);
    if (!allowed.includes(tab) && allowed.length > 0) setTab(allowed[0]);
  }, [myPermissions]);

  // ── Data loaders ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || myPermissions === null) return;
    const isSA = role === 'super_admin';
    loadStats();
    if (tab === 'recruitment') { loadApps(); if (isSA) loadInterviews(); }
    if (tab === 'admins'      && isSA) loadAdmins();
    if (tab === 'results')   loadResults(1, resultsSearch, resultsLevel, resultsMin, resultsMax);
    if (tab === 'sessions')  loadAdminSessions();
  }, [user, tab, myPermissions]);

  async function loadResults(page = 1, search = '', level = '', min = '', max = '') {
    setResultsLoading(true);
    const params = new URLSearchParams({ page });
    if (search) params.set('search', search);
    if (level)  params.set('level',  level);
    if (min)    params.set('minScore', min);
    if (max)    params.set('maxScore', max);
    const data = await fetch(`/api/bogga/results?${params}`).then(r => r.json()).catch(() => ({}));
    setResults(data.results ?? []);
    setResultsTotal(data.total ?? 0);
    setResultsPage(page);
    if (data.stats) setResultsStats(data.stats);
    setResultsLoading(false);
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  async function loadNotifications() {
    const data = await fetch('/api/bogga/notifications').then(r => r.json()).catch(() => ({}));
    if (data.notifications) {
      setNotifications(data.notifications);
      setUnreadCount(data.unread ?? 0);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const iv = setInterval(loadNotifications, 30_000);
    return () => clearInterval(iv);
  }, [user]);

  useEffect(() => {
    if (!bellOpen) return;
    function handler(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  async function markAllRead() {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await fetch('/api/bogga/notifications', { method: 'PATCH' });
  }

  function handleBellOpen() {
    setBellOpen(o => !o);
    if (!bellOpen && unreadCount > 0) markAllRead();
  }

  function relativeTime(iso) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
    return `منذ ${Math.floor(diff / 86400)} يوم`;
  }

  const NOTIF_ICONS = { recruitment: '📋', interview: '🗓️', assessment: '📝', teacher: '👨‍🏫' };

  // Booked slots (modal) — reload on date/interviewer change
  useEffect(() => {
    if (!schedModal || !schedDate || !schedInterviewer) { setBookedSlots([]); return; }
    setSlotsLoading(true);
    fetch(`/api/bogga/interviews?date=${schedDate}&interviewer=${encodeURIComponent(schedInterviewer)}`)
      .then(r => r.json())
      .then(d => setBookedSlots((d.interviews ?? []).map(iv => iv.start_time?.slice(0, 5))))
      .catch(() => setBookedSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [schedDate, schedInterviewer, schedModal]);

  // Close permission popover on outside click
  useEffect(() => {
    if (!permPopover) return;
    function handler(e) {
      if (permPopoverRef.current && !permPopoverRef.current.contains(e.target)) {
        setPermPopover(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [permPopover]);

  async function loadStats() {
    const [
      { count: ac }, { count: pc }, { data: scores }, appsRes,
    ] = await Promise.all([
      supabase.from('assessments').select('id', { count: 'exact', head: true }),
      supabase.from('assessments').select('id', { count: 'exact', head: true }).gte('score', 70),
      supabase.from('assessments').select('score'),
      fetch('/api/bogga/recruitment').then(r => r.json()).catch(() => ({ applications: [] })),
    ]);
    const avg = scores?.length ? Math.round(scores.reduce((s, a) => s + (a.score ?? 0), 0) / scores.length) : 0;
    setStats({ assessments: ac ?? 0, pass: pc ?? 0, avg, applications: appsRes.applications?.length ?? 0 });
  }

  async function loadApps() {
    setAppsLoading(true);
    const res = await fetch('/api/bogga/recruitment');
    setApps((await res.json()).applications ?? []);
    setAppsLoading(false);
  }

  async function loadInterviews() {
    const res = await fetch('/api/bogga/interviews');
    const map = {};
    ((await res.json()).interviews ?? []).forEach(iv => {
      if (!map[iv.application_id]) map[iv.application_id] = [];
      map[iv.application_id].push(iv);
    });
    setInterviewsMap(map);
  }

  async function loadAdmins() {
    setAdminsLoading(true);
    const [adminsRes, onlineRes] = await Promise.all([
      fetch('/api/bogga/admins').then(r => r.json()),
      fetch('/api/bogga/activity').then(r => r.json()).catch(() => ({ online_status: [] })),
    ]);
    setAdmins(adminsRes.admins ?? []);
    const map = {};
    (onlineRes.online_status ?? []).forEach(s => { map[s.admin_id] = s; });
    setOnlineStatus(map);
    setAdminsLoading(false);
  }

  // ── Recruitment ───────────────────────────────────────────────────────────
  async function updateAppStatus(id, status) {
    await fetch('/api/bogga/recruitment', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  async function deleteApp(id, name) {
    if (!confirm(`هل تريد حذف طلب "${name}" نهائياً؟`)) return;
    setDeletingApp(id);
    const res = await fetch('/api/bogga/recruitment', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setApps(prev => prev.filter(a => a.id !== id));
      setInterviewsMap(prev => { const m = { ...prev }; delete m[id]; return m; });
    } else {
      alert((await res.json()).error || 'تعذر حذف الطلب');
    }
    setDeletingApp(null);
  }

  async function downloadCV(id) {
    setDownloadingCV(p => ({ ...p, [id]: true }));
    try {
      const res  = await fetch(`/api/bogga/recruitment/${id}`);
      const data = await res.json();
      if (!res.ok || !data.cv_base64) { alert(data.error || 'لا توجد سيرة ذاتية'); return; }
      const a = document.createElement('a');
      a.href = `data:application/pdf;base64,${data.cv_base64}`;
      a.download = data.cv_filename || 'cv.pdf';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } finally { setDownloadingCV(p => ({ ...p, [id]: false })); }
  }

  // ── Interviews ────────────────────────────────────────────────────────────
  function openScheduleModal(app) {
    const existing = (interviewsMap[app.id] ?? []).slice(-1)[0];
    setSchedModal(app);
    setSchedDate(existing?.interview_date ?? '');
    setSchedInterviewer(user?.user_metadata?.full_name || user?.email || 'المدير المطلق');
    setSchedTime(''); setBookedSlots([]); setSchedMsg(null);
  }

  async function handleSchedule() {
    if (!schedDate || !schedInterviewer.trim() || !schedTime || !schedModal) return;
    setSchedulingBusy(true); setSchedMsg(null);
    const res  = await fetch('/api/bogga/interviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: schedModal.id, interviewer_name: schedInterviewer.trim(),
        interview_date: schedDate, start_time: schedTime,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSchedMsg({ type: 'error', text: data.error || 'حدث خطأ' });
    } else {
      setSchedMsg({ type: 'success', text: data.emailSent ? '✅ تمّ حجز الموعد وإرسال الدعوة بنجاح!' : '✅ تمّ الحجز (تحقق من إعداد البريد)' });
      setInterviewsMap(prev => ({
        ...prev,
        [schedModal.id]: [...(prev[schedModal.id] ?? []), data.interview],
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
    if (res.ok) setInterviewsMap(prev => ({ ...prev, [appId]: (prev[appId] ?? []).filter(iv => iv.id !== ivId) }));
    setCancellingInterview(null);
  }

  // ── Granular ACL ──────────────────────────────────────────────────────────
  async function openPermPopover(tabKey, e) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPermPopover({ tabKey, top: rect.bottom + 8, left: Math.max(8, rect.left - 180) });
    setPermError(null);
    setPermsLoading(true);
    try {
      const [adminsRes, permsRes] = await Promise.all([
        admins.length === 0 ? fetch('/api/bogga/admins').then(r => r.json()) : null,
        fetch('/api/bogga/permissions').then(r => r.json()),
      ]);
      if (adminsRes) setAdmins(adminsRes.admins ?? []);
      const map = {};
      (permsRes.permissions ?? []).forEach(p => {
        if (!map[p.admin_id]) map[p.admin_id] = {};
        map[p.admin_id][p.tab_key] = p.is_allowed;
      });
      setAllPerms(map);
    } catch { /* silent */ }
    setPermsLoading(false);
  }

  async function togglePerm(adminId, tabKey) {
    const key     = `${adminId}_${tabKey}`;
    const current = allPerms[adminId]?.[tabKey] ?? false;
    const newVal  = !current;
    setPermError(null);
    setAllPerms(prev => ({ ...prev, [adminId]: { ...(prev[adminId] ?? {}), [tabKey]: newVal } }));
    setPermSaving(p => ({ ...p, [key]: true }));
    try {
      const res = await fetch('/api/bogga/permissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, tab_key: tabKey, is_allowed: newVal }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setAllPerms(prev => ({ ...prev, [adminId]: { ...(prev[adminId] ?? {}), [tabKey]: current } }));
        setPermError(d.error || 'تعذّر حفظ الصلاحية — حاول مجدداً');
      }
    } catch {
      setAllPerms(prev => ({ ...prev, [adminId]: { ...(prev[adminId] ?? {}), [tabKey]: current } }));
      setPermError('تعذّر الاتصال بالخادم — تحقّق من الإنترنت وحاول مجدداً');
    }
    setPermSaving(p => { const n = { ...p }; delete n[key]; return n; });
  }

  // ── Admins ────────────────────────────────────────────────────────────────
  async function handleAddAdmin(e) {
    e.preventDefault();
    setAddingAdmin(true); setAdminMsg(null);
    const res  = await fetch('/api/bogga/admins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: adminForm.name, email: adminForm.email }),
    });
    const data = await res.json();
    if (!res.ok) { setAdminMsg({ type: 'error', text: data.error }); }
    else {
      setAdmins(prev => [...prev, data.admin]);
      setShowAddModal(false); setAdminForm(EMPTY_ADMIN_FORM);
      const emailNote = data.emailSent
        ? `📧 تم إرسال بيانات الدخول إلى ${data.admin.email}`
        : `⚠️ فشل إرسال الإيميل — احفظ كلمة المرور الآن: ${data.tempPassword}`;
      setAdminMsg({
        type: data.emailSent ? 'success' : 'error',
        text: `✅ تم إنشاء حساب "${data.admin.name}" — ${emailNote}`,
        tempPassword: data.emailSent ? null : data.tempPassword,
      });
    }
    setAddingAdmin(false);
  }

  async function handleSuspendAdmin(id, currentStatus) {
    const action = currentStatus === 'suspended' ? 'activate' : 'suspend';
    const label  = action === 'suspend' ? 'إيقاف' : 'تفعيل';
    if (!confirm(`هل تريد ${label} حساب هذا المشرف؟`)) return;
    setSuspendingId(id);
    const res  = await fetch(`/api/bogga/admins/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (res.ok) setAdmins(prev => prev.map(a => a.id === id ? { ...a, status: data.status } : a));
    else setAdminMsg({ type: 'error', text: data.error ?? 'فشل تعديل حالة المشرف' });
    setSuspendingId(null);
  }

  async function toggleVisibility(id, current) {
    setApps(prev => prev.map(a => a.id === id ? { ...a, is_visible_to_assistants: !current } : a));
    const res = await fetch('/api/bogga/recruitment', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_visible_to_assistants: !current }),
    });
    if (!res.ok) setApps(prev => prev.map(a => a.id === id ? { ...a, is_visible_to_assistants: current } : a));
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

  async function handlePromote() {
    if (!confirm('سيتم ترقية حسابك إلى مدير مطلق. هذا الإجراء لا يمكن التراجع عنه.')) return;
    setPromoting(true); setPromoMsg(null);
    const res  = await fetch('/api/bogga/make-super-admin', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setPromoMsg({ type: 'success', text: '✅ تمت الترقية! سيتم تحديث الصفحة...' });
      await supabase.auth.refreshSession();
      setTimeout(() => window.location.reload(), 1500);
    } else { setPromoMsg({ type: 'error', text: data.error }); }
    setPromoting(false);
  }

  function copySetupSql() {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  // ── Admin Sessions ────────────────────────────────────────────────────────
  async function loadAdminSessions() {
    setAdminSessLoading(true);
    const data = await fetch('/api/bogga/sessions').then(r => r.json()).catch(() => ({}));
    setAdminSessions(data.sessions ?? []);
    setAdminSessLoading(false);
  }

  async function handleAdminCancel(id) {
    if (!confirm('هل تريد إلغاء هذه الحصة؟')) return;
    setAdminCancellingId(id);
    const res = await fetch('/api/bogga/sessions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setAdminSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
    setAdminCancellingId(null);
  }

  async function handleAdminComplete() {
    setAdminCompleteSav(true);
    const res = await fetch('/api/bogga/sessions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: adminCompleteFor.id, status: 'completed', recording_url: adminRecordingUrl || null }),
    });
    if (res.ok) {
      setAdminSessions(prev => prev.map(s => s.id === adminCompleteFor.id
        ? { ...s, status: 'completed', recording_url: adminRecordingUrl || null } : s));
      setAdminCompleteFor(null);
    }
    setAdminCompleteSav(false);
  }

  function getOnlineInfo(adminId) {
    const s = onlineStatus[adminId];
    if (!s) return { online: false, label: 'لم يُسجَّل دخول بعد', color: '#94a3b8' };
    const diffMin = Math.floor((Date.now() - new Date(s.last_seen)) / 60000);
    if (diffMin < 5)    return { online: true,  label: 'متصل الآن',                           color: '#16a34a' };
    if (diffMin < 60)   return { online: false, label: `منذ ${diffMin} دقيقة`,                color: '#f59e0b' };
    if (diffMin < 1440) return { online: false, label: `منذ ${Math.floor(diffMin/60)} ساعة`, color: '#94a3b8' };
    return               { online: false, label: `منذ ${Math.floor(diffMin/1440)} يوم`,       color: '#94a3b8' };
  }

  async function openActivityModal(a) {
    setActivityModal(a);
    setActivityLoading(true);
    setActivityData({ sessions: [], online: null });
    const res  = await fetch(`/api/bogga/activity?admin_id=${a.id}`);
    const data = await res.json();
    setActivityData(data);
    setActivityLoading(false);
  }

  // ── Render guard ──────────────────────────────────────────────────────────
  if (!user || (myPermissions === null && !suspended)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span className="spinner" style={{ width: 30, height: 30, borderWidth: 3, borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
      </div>
    );
  }

  if (suspended) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', direction: 'rtl' }}>
        <div style={{ textAlign: 'center', padding: '48px 36px', background: '#fff', borderRadius: 24, boxShadow: '0 8px 40px rgba(0,0,0,.12)', maxWidth: 420 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: '#b91c1c', fontWeight: 800, marginBottom: 12, fontSize: '1.3rem' }}>حسابك معطل مؤقتاً</h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, marginBottom: 28 }}>تواصل مع المدير العام لإعادة تفعيل حسابك.</p>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
            className="btn btn-ghost"
            style={{ fontSize: '.9rem' }}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = role === 'super_admin';

  // Build TABS with permission filtering
  const canSee = t => isSuperAdmin || (CONTROLLABLE.includes(t) && myPermissions[t] === true);
  const TABS = [
    { id: 'overview',    label: '📊 نظرة عامة',        show: canSee('overview') },
    { id: 'codes',       label: '🔑 الأكواد',            show: canSee('codes') },
    { id: 'groups',      label: '👥 إدارة الطلاب',      show: canSee('groups') },
    { id: 'sessions',    label: '📅 الحصص',              show: canSee('sessions') },
    { id: 'results',     label: '🏆 نتائج الطلاب',      show: canSee('results') },
    { id: 'lexicon',     label: '📖 بنك الكلمات',       show: canSee('lexicon') },
    { id: 'recruitment', label: '📋 طلبات التوظيف',     show: canSee('recruitment') },
    { id: 'admins',      label: '👑 إدارة المشرفين',    show: isSuperAdmin },
    { id: 'setup',       label: '⚙️ إعداد',              show: canSee('setup') },
  ].filter(t => t.show);

  const activeTab = TABS.some(t => t.id === tab) ? tab : TABS[0]?.id ?? 'overview';

  return (
    <>
      <style>{`
        .time-btn:not(:disabled):hover { background: var(--primary-lt) !important; border-color: var(--primary) !important; }
        .perm-icon { opacity:.55; transition:opacity .15s; }
        .perm-icon:hover { opacity:1; }
        .quick-link { text-decoration:none; transition:opacity .15s; }
        .quick-link:hover { opacity:.75; }
      `}</style>

      <Navbar user={user} />
      <main className="page-wrap" dir="rtl">
        <div className="container">

          {/* ── Header ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>🏰 حصن الإدارة</h1>
              <p style={{ color: isSuperAdmin ? '#1a7c40' : 'var(--muted)', fontSize: '.88rem', fontWeight: isSuperAdmin ? 700 : 400 }}>
                {isSuperAdmin ? '👑 مدير مطلق — صلاحيات كاملة' : '🛡️ مشرف مساعد — صلاحيات محدودة'}
              </p>
            </div>
            <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* ── Notification Bell ── */}
              <div ref={bellRef} style={{ position: 'relative' }}>
                <button
                  onClick={handleBellOpen}
                  title="الإشعارات"
                  style={{
                    position: 'relative', background: bellOpen ? 'var(--primary)' : 'var(--bg)',
                    border: '1.5px solid var(--border)', borderRadius: 10,
                    width: 40, height: 40, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', transition: 'all .15s',
                    color: bellOpen ? '#fff' : 'var(--text)',
                  }}>
                  🔔
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -6, left: -6,
                      background: '#e53e3e', color: '#fff',
                      fontSize: '.65rem', fontWeight: 800,
                      minWidth: 18, height: 18, borderRadius: 9,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px', lineHeight: 1,
                    }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>

                {bellOpen && (
                  <div style={{
                    position: 'absolute', top: 46, left: 0,
                    width: 320, maxHeight: 420, overflowY: 'auto',
                    background: '#fff', borderRadius: 14,
                    boxShadow: '0 8px 32px rgba(24,95,165,.18)',
                    border: '1px solid var(--border)', zIndex: 9999,
                  }}>
                    <div style={{
                      padding: '14px 16px 10px', borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontWeight: 800, fontSize: '.95rem' }}>الإشعارات</span>
                      {notifications.some(n => !n.is_read) && (
                        <button onClick={markAllRead} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--primary)', fontSize: '.78rem', fontWeight: 700,
                        }}>تحديد الكل كمقروء</button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '.88rem' }}>
                        لا توجد إشعارات
                      </div>
                    ) : notifications.map(n => (
                      <div key={n.id} style={{
                        padding: '12px 16px', borderBottom: '1px solid var(--border)',
                        background: n.is_read ? 'transparent' : 'rgba(24,95,165,.05)',
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                      }}>
                        <span style={{ fontSize: '1.2rem', lineHeight: 1.4 }}>{NOTIF_ICONS[n.type] ?? '🔔'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '.88rem', color: 'var(--text)' }}>{n.title}</div>
                          {n.body && <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{n.body}</div>}
                          <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 4 }}>{relativeTime(n.created_at)}</div>
                        </div>
                        {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 5 }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link href="/bogga/lexicon" className="btn btn-outline btn-sm">📖 بنك الكلمات</Link>
            </div>
          </div>

          {/* ── No permissions state ────────────────────────────── */}
          {!isSuperAdmin && TABS.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: 14 }}>🔒</div>
              <h2 style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>لا توجد لك صلاحيات بعد</h2>
              <p style={{ color: 'var(--muted)' }}>تواصل مع المدير العام لمنحك صلاحيات الوصول إلى التبويبات المناسبة.</p>
            </div>
          ) : (
            <>

          {/* ── Tabs bar ────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28, borderBottom: '2px solid var(--border)', paddingBottom: 14, position: 'relative' }}>
            {TABS.map(t => (
              <div key={t.id} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <button
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 700,
                    background: activeTab === t.id ? 'var(--primary)' : 'var(--bg)',
                    color: activeTab === t.id ? '#fff' : 'var(--muted)',
                    transition: 'all .15s',
                    paddingLeft: isSuperAdmin && CONTROLLABLE.includes(t.id) ? 8 : 14,
                  }}>
                  {t.label}
                </button>
                {isSuperAdmin && CONTROLLABLE.includes(t.id) && (
                  <button
                    onClick={e => openPermPopover(t.id, e)}
                    className="perm-icon"
                    title={`إدارة صلاحيات تبويب "${TAB_NAMES[t.id]}"`}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px 0 4px',
                      fontSize: '.72rem', lineHeight: 1, color: activeTab === t.id ? 'rgba(255,255,255,.7)' : 'var(--muted)',
                      marginRight: -6,
                    }}>
                    🔒
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ══ Overview ══════════════════════════════════════════ */}
          {activeTab === 'overview' && (
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
                  <ul style={{ paddingRight: 20, lineHeight: 2.2 }}>
                    <li>✅ تعديل وحذف أي شيء في المنصة</li>
                    <li>✅ إدارة المشرفين المساعدين وضبط صلاحياتهم</li>
                    <li>✅ جدولة مقابلات التوظيف وإرسال دعوات تفاعلية</li>
                    <li>✅ الاطلاع على طلبات التوظيف والسير الذاتية</li>
                    <li>✅ تعديل بنك الكلمات اللغوية</li>
                    <li>✅ توليد أكواد التقييم والدعوة</li>
                  </ul>
                ) : (
                  <ul style={{ paddingRight: 20, lineHeight: 2.2 }}>
                    {Object.keys(myPermissions).filter(k => myPermissions[k]).map(k => (
                      <li key={k}>✅ {TAB_NAMES[k] ?? k}</li>
                    ))}
                    {Object.keys(myPermissions).filter(k => myPermissions[k]).length === 0 && (
                      <li style={{ color: 'var(--muted)' }}>لا توجد صلاحيات مُعيَّنة</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ══ Codes ═════════════════════════════════════════════ */}
          {activeTab === 'codes' && (
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

          {/* ══ Groups ════════════════════════════════════════════ */}
          {activeTab === 'groups' && <GroupsManager />}

          {/* ══ Sessions (Admin) ══════════════════════════════════ */}
          {activeTab === 'sessions' && (() => {
            const today      = new Date().toISOString().slice(0, 10);
            const nextWeekDt = new Date(); nextWeekDt.setDate(nextWeekDt.getDate() + 7);
            const nextWeek   = nextWeekDt.toISOString().slice(0, 10);
            const filtered   = adminTeacherFilter
              ? adminSessions.filter(s => s.teacher_name?.includes(adminTeacherFilter) || s.student_name?.includes(adminTeacherFilter))
              : adminSessions;
            const upcoming   = filtered.filter(s => s.status === 'scheduled' && s.session_date >= today);
            const past       = filtered.filter(s => s.status === 'completed' || (s.status === 'scheduled' && s.session_date < today));
            const cancelled  = filtered.filter(s => s.status === 'cancelled');
            const totalStudents = new Set(adminSessions.map(s => s.student_email || s.student_name)).size;
            const calWeekDays  = Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - d.getDay() + i + adminWeekOffset * 7);
              return d.toISOString().slice(0, 10);
            });
            const dayName = iso => ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'][new Date(iso).getDay()];
            const joinLink = s => s.meet_link || `https://meet.jit.si/${s.room_name}`;

            return (
              <div>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 24 }}>
                  {[
                    { icon: '📅', val: upcoming.length,                                            lbl: 'حصص قادمة'     },
                    { icon: '📆', val: upcoming.filter(s => s.session_date < nextWeek).length,     lbl: 'هذا الأسبوع'   },
                    { icon: '👥', val: totalStudents,                                              lbl: 'إجمالي الطلاب' },
                    { icon: '✅', val: adminSessions.filter(s => s.status === 'completed').length, lbl: 'حصص منجزة'     },
                    { icon: '❌', val: adminSessions.filter(s => s.status === 'cancelled').length, lbl: 'ملغاة'          },
                  ].map(s => (
                    <div key={s.lbl} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem' }}>{s.icon}</div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--primary)' }}>{s.val}</div>
                      <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginTop: 2 }}>{s.lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Filter + Refresh */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input className="form-input" style={{ flex: '1 1 200px', margin: 0 }}
                    placeholder="🔍 فلتر حسب المعلم أو الطالب..."
                    value={adminTeacherFilter}
                    onChange={e => setAdminTeacherFilter(e.target.value)} />
                  <button onClick={loadAdminSessions} className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap' }}>🔄 تحديث</button>
                </div>

                {/* Sub-tabs */}
                <div style={{ display: 'flex', gap: 4, background: '#f0f4f8', borderRadius: 10, padding: 4, marginBottom: 20, flexWrap: 'wrap' }}>
                  {[
                    { key: 'upcoming',  label: `📅 قادمة (${upcoming.length})`    },
                    { key: 'calendar',  label: '🗓️ التقويم'                       },
                    { key: 'past',      label: `✅ منتهية (${past.length})`        },
                    { key: 'cancelled', label: `❌ ملغاة (${cancelled.length})`    },
                  ].map(t => (
                    <button key={t.key} onClick={() => setAdminSessTab(t.key)} style={{
                      flex: 1, minWidth: 80, padding: '8px 4px', border: 'none',
                      background: adminSessTab === t.key ? '#fff' : 'transparent',
                      borderRadius: 7, fontFamily: 'inherit', fontSize: '.85rem', fontWeight: 700,
                      color: adminSessTab === t.key ? 'var(--primary)' : 'var(--muted)',
                      boxShadow: adminSessTab === t.key ? '0 1px 6px rgba(0,0,0,.1)' : 'none',
                      cursor: 'pointer', transition: '.15s',
                    }}>{t.label}</button>
                  ))}
                </div>

                {adminSessLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                  </div>
                ) : (
                  <>
                    {/* Upcoming */}
                    {adminSessTab === 'upcoming' && (
                      upcoming.length === 0 ? (
                        <div className="empty-state card"><span className="empty-icon">📭</span><p>لا توجد حصص قادمة</p></div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {upcoming.map(s => (
                            <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: '1.8rem', paddingTop: 2 }}>🎥</div>
                              <div style={{ flex: 1, minWidth: 180 }}>
                                <div style={{ fontWeight: 800, fontSize: '.97rem', color: 'var(--text)', marginBottom: 3 }}>{s.subject || 'حصة عامة'}</div>
                                <div style={{ fontSize: '.83rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                  <span>👨‍🏫 {s.teacher_name}</span>
                                  <span>👤 {s.student_name}</span>
                                  <span>📅 {fmtDate(s.session_date)}</span>
                                  <span>⏰ {s.start_time?.slice(0, 5)}</span>
                                  <span>⏱️ {s.duration_minutes} د</span>
                                </div>
                                {s.student_email && <div style={{ fontSize: '.79rem', color: 'var(--accent)', marginTop: 3 }}>✉️ {s.student_email}</div>}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start', flexShrink: 0 }}>
                                <a href={joinLink(s)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">ابدأ 🎥</a>
                                <button onClick={() => { setAdminCompleteFor(s); setAdminRecordingUrl(''); }}
                                  className="btn btn-outline btn-sm" style={{ color: '#1a7c40', borderColor: '#1a7c40' }}>✅ أنهِ</button>
                                <button onClick={() => handleAdminCancel(s.id)} disabled={adminCancellingId === s.id}
                                  className="btn btn-outline btn-sm" style={{ color: '#e53e3e', borderColor: '#e53e3e' }}>
                                  {adminCancellingId === s.id ? '...' : 'إلغاء'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* Calendar */}
                    {adminSessTab === 'calendar' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setAdminWeekOffset(w => w - 1)}>← السابق</button>
                          <span style={{ fontWeight: 800, fontSize: '.93rem', color: 'var(--primary)' }}>
                            {adminWeekOffset === 0 ? 'الأسبوع الحالي' : adminWeekOffset > 0 ? `+${adminWeekOffset} أسابيع` : `${adminWeekOffset} أسابيع`}
                          </span>
                          <button className="btn btn-outline btn-sm" onClick={() => setAdminWeekOffset(w => w + 1)}>التالي →</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
                          {calWeekDays.map(dateStr => {
                            const daySess = filtered.filter(s => s.session_date === dateStr && s.status !== 'cancelled');
                            const isToday = dateStr === today;
                            const isPast  = dateStr < today;
                            return (
                              <div key={dateStr} style={{ borderRadius: 10, border: '1.5px solid var(--border)', overflow: 'hidden', minHeight: 80, opacity: isPast ? .7 : 1 }}>
                                <div style={{ padding: '6px 8px', fontSize: '.76rem', fontWeight: 800, textAlign: 'center', background: isToday ? 'var(--primary)' : daySess.length ? '#eef5ff' : '#f8fafc', color: isToday ? '#fff' : daySess.length ? 'var(--primary)' : 'var(--muted)' }}>
                                  <div>{dayName(dateStr)}</div>
                                  <div>{parseInt(dateStr.split('-')[2])}</div>
                                </div>
                                <div style={{ padding: 4 }}>
                                  {daySess.length === 0 ? (
                                    <div style={{ fontSize: '.7rem', color: 'var(--muted)', textAlign: 'center', padding: '8px 4px' }}>—</div>
                                  ) : daySess.map(s => (
                                    <div key={s.id} title={`${s.teacher_name} — ${s.student_name} — ${s.start_time?.slice(0,5)}`}
                                      style={{ padding: '3px 5px', fontSize: '.7rem', background: 'var(--accent)', color: '#fff', borderRadius: 4, margin: '3px 0', fontWeight: 700 }}>
                                      {s.start_time?.slice(0,5)}{s.subject ? ` · ${s.subject.slice(0,6)}` : ''}<br/>
                                      <span style={{ opacity: .85, fontWeight: 400 }}>👤 {s.student_name?.slice(0,8)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Past */}
                    {adminSessTab === 'past' && (
                      past.length === 0 ? (
                        <div className="empty-state card"><span className="empty-icon">📭</span><p>لا توجد حصص منتهية</p></div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {past.slice(0, 30).map(s => (
                            <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid var(--border)', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: '1.6rem', paddingTop: 2 }}>✅</div>
                              <div style={{ flex: 1, minWidth: 180 }}>
                                <div style={{ fontWeight: 800, fontSize: '.95rem', marginBottom: 3 }}>{s.subject || 'حصة عامة'}</div>
                                <div style={{ fontSize: '.83rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                  <span>👨‍🏫 {s.teacher_name}</span>
                                  <span>👤 {s.student_name}</span>
                                  <span>📅 {fmtDate(s.session_date)}</span>
                                  <span>⏰ {s.start_time?.slice(0, 5)}</span>
                                  <span style={{ color: '#1a7c40', fontWeight: 700 }}>منتهية</span>
                                </div>
                                {s.notes && <div style={{ marginTop: 6, padding: '6px 10px', background: '#fffbeb', borderRadius: 8, fontSize: '.82rem', color: '#92400e' }}>📝 {s.notes}</div>}
                                {s.recording_url && (
                                  <div style={{ marginTop: 4 }}>
                                    <a href={s.recording_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.8rem', color: 'var(--primary)', fontWeight: 600 }}>🎬 رابط التسجيل</a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* Cancelled */}
                    {adminSessTab === 'cancelled' && (
                      cancelled.length === 0 ? (
                        <div className="empty-state card"><span className="empty-icon">📭</span><p>لا توجد حصص ملغاة</p></div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {cancelled.slice(0, 30).map(s => (
                            <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid var(--border)', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', opacity: .7 }}>
                              <div style={{ fontSize: '1.6rem', paddingTop: 2 }}>❌</div>
                              <div style={{ flex: 1, minWidth: 180 }}>
                                <div style={{ fontWeight: 800, fontSize: '.95rem', marginBottom: 3 }}>{s.subject || 'حصة عامة'}</div>
                                <div style={{ fontSize: '.83rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                  <span>👨‍🏫 {s.teacher_name}</span>
                                  <span>👤 {s.student_name}</span>
                                  <span>📅 {fmtDate(s.session_date)}</span>
                                  <span>⏰ {s.start_time?.slice(0, 5)}</span>
                                  <span style={{ color: '#e53e3e', fontWeight: 700 }}>ملغاة</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* ══ Lexicon ═══════════════════════════════════════════ */}
          {activeTab === 'lexicon' && (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📖</div>
              <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 12 }}>بنك الكلمات اللغوية</h3>
              <p style={{ color: 'var(--muted)', marginBottom: 24 }}>إدارة الكلمات المشكولة وتعديلها وإضافة الجذور والمقاطع الصوتية لكل صف</p>
              <Link href="/bogga/lexicon" className="btn btn-primary btn-lg">فتح لوحة بنك الكلمات</Link>
            </div>
          )}

          {/* ══ Recruitment ═══════════════════════════════════════ */}
          {activeTab === 'recruitment' && (
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
                    const wa = waLink(app.phone);
                    return (
                      <div key={app.id} className="card" style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

                          {/* Candidate info */}
                          <div style={{ flex: '1 1 260px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{app.name}</span>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => toggleVisibility(app.id, app.is_visible_to_assistants ?? true)}
                                  title={app.is_visible_to_assistants !== false ? 'مرئي للمساعدين — انقر للإخفاء' : 'مخفي عن المساعدين — انقر للإظهار'}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                                    fontSize: '.73rem', fontWeight: 700,
                                    background: app.is_visible_to_assistants !== false ? '#dcfce7' : '#f1f5f9',
                                    color:      app.is_visible_to_assistants !== false ? '#166534' : '#64748b',
                                  }}
                                >
                                  {app.is_visible_to_assistants !== false ? '👁️ مرئي' : '🙈 مخفي'}
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: '.85rem', color: 'var(--muted)', lineHeight: 2 }}>
                              {/* Mailto link */}
                              📧&nbsp;
                              <a className="quick-link" href={`mailto:${app.email}?subject=بخصوص طلبك في أكاديمية عارم`}
                                style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                {app.email}
                              </a>
                              &nbsp;|&nbsp;
                              {/* WhatsApp link */}
                              📱&nbsp;
                              {wa ? (
                                <a className="quick-link" href={wa} target="_blank" rel="noopener noreferrer"
                                  style={{ color: '#1a7c40', fontWeight: 600 }}>
                                  <bdi dir="ltr">{app.phone}</bdi>
                                </a>
                              ) : (
                                <bdi dir="ltr">{app.phone}</bdi>
                              )}
                              <br />
                              💼 {app.experience}&nbsp;|&nbsp;🎓 {app.specialty}
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

                            {/* Interview status block */}
                            {latestIv && (
                              <div style={{ marginTop: 14, background: '#eef5ff', borderRadius: 10, padding: '11px 14px', fontSize: '.83rem', borderRight: '3px solid #185FA5' }}>
                                <div style={{ fontWeight: 800, color: '#185FA5', marginBottom: 6, fontSize: '.88rem' }}>📅 المقابلة المجدولة</div>
                                <div style={{ color: '#1a2d4a', lineHeight: 1.8 }}>
                                  📆 {fmtDate(latestIv.interview_date)} · ⏰ {latestIv.start_time?.slice(0, 5)} · 👤 {latestIv.interviewer_name}
                                </div>
                                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                  <span style={{ padding: '3px 11px', borderRadius: 20, fontSize: '.76rem', fontWeight: 700, background: (IV_COLORS[latestIv.candidate_response] ?? '#6b7280') + '22', color: IV_COLORS[latestIv.candidate_response] ?? '#6b7280' }}>
                                    {IV_LABELS[latestIv.candidate_response] ?? latestIv.candidate_response}
                                  </span>
                                  {cancellingInterview === latestIv.id
                                    ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2, borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                                    : <button onClick={() => cancelInterview(latestIv.id, app.id)} style={{ fontSize: '.76rem', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>✕ إلغاء</button>
                                  }
                                </div>
                                {latestIv.candidate_response === 'reschedule_requested' && latestIv.reschedule_reason && (
                                  <div style={{ marginTop: 10, padding: '9px 12px', background: '#fff8e1', borderRadius: 8, border: '1px solid #ffe082', color: '#7a4f00', fontSize: '.83rem', lineHeight: 1.7 }}>
                                    💬 <strong>سبب التعديل:</strong> {latestIv.reschedule_reason}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions column */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '.78rem', fontWeight: 700, background: STATUS_COLORS[app.status] + '20', color: STATUS_COLORS[app.status] }}>
                              {STATUS_LABELS[app.status] ?? app.status}
                            </span>
                            {isSuperAdmin && <>
                              <select value={app.status} onChange={e => updateAppStatus(app.id, e.target.value)}
                                style={{ fontSize: '.8rem', padding: '4px 8px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'inherit' }}>
                                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                              <button onClick={() => openScheduleModal(app)} className="btn btn-sm"
                                style={{ background: '#e8f0fb', color: '#185FA5', border: '1.5px solid #b3ccee', fontSize: '.8rem', gap: 5 }}>
                                📅 {latestIv ? 'إعادة جدولة' : 'جدولة مقابلة'}
                              </button>
                              <button onClick={() => deleteApp(app.id, app.name)} disabled={deletingApp === app.id} className="btn btn-sm btn-danger" style={{ fontSize: '.78rem' }}>
                                {deletingApp === app.id ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : '🗑️ حذف'}
                              </button>
                            </>}
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

          {/* ══ Admins ════════════════════════════════════════════ */}
          {activeTab === 'admins' && isSuperAdmin && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>👑 إدارة المشرفين المساعدين</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>حد أقصى 2 — {admins.length}/2 مستخدَم</p>
                </div>
                <button onClick={() => { setShowAddModal(true); setAdminMsg(null); }} disabled={admins.length >= 2} className="btn btn-primary" style={{ opacity: admins.length >= 2 ? .5 : 1 }}>
                  + إضافة مشرف مساعد جديد
                </button>
              </div>
              {admins.length >= 2 && <div className="alert alert-info" style={{ marginBottom: 18 }}>⚠️ وصلت للحد الأقصى (2 مشرفين).</div>}
              {adminMsg && (
                <div className={`alert alert-${adminMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 18 }}>
                  {adminMsg.text}
                  {adminMsg.tempPassword && (
                    <div style={{ marginTop: 10, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '10px 14px' }}>
                      <strong>كلمة المرور المؤقتة:</strong>
                      <span dir="ltr" style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', marginRight: 8, letterSpacing: '.08em', userSelect: 'all', color: '#b56a00' }}>
                        {adminMsg.tempPassword}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {adminsLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} /></div>
              ) : admins.length === 0 ? (
                <div className="empty-state card"><span className="empty-icon">👥</span><p>لا يوجد مشرفون مساعدون بعد</p></div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead><tr><th>الاسم</th><th>البريد الإلكتروني</th><th>حالة الحساب</th><th>آخر نشاط</th><th>تاريخ الإنشاء</th><th>إجراءات</th></tr></thead>
                    <tbody>
                      {admins.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 700 }}>{a.name}</td>
                          <td style={{ direction: 'ltr', textAlign: 'right' }}>{a.email}</td>
                          <td>
                            <span style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 700,
                              background: a.status === 'suspended' ? '#fee2e2' : '#dcfce7',
                              color:      a.status === 'suspended' ? '#b91c1c' : '#166534',
                            }}>
                              {a.status === 'suspended' ? '🚫 موقوف' : '✅ مفعَّل'}
                            </span>
                          </td>
                          <td>
                            {(() => {
                              const s = getOnlineInfo(a.id);
                              return (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.75rem', fontWeight: 700, color: s.color }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                                  {s.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: '.83rem' }}>{new Date(a.created_at).toLocaleDateString('ar-SA')}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button onClick={() => openActivityModal(a)} className="btn btn-sm" style={{ background: '#eef5ff', color: '#185FA5', border: 'none' }}>
                                📊 النشاط
                              </button>
                              <button
                                onClick={() => handleSuspendAdmin(a.id, a.status ?? 'active')}
                                disabled={suspendingId === a.id}
                                className="btn btn-sm"
                                style={{ background: a.status === 'suspended' ? '#1a7c40' : '#f59e0b', color: '#fff', border: 'none' }}
                              >
                                {suspendingId === a.id
                                  ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                  : a.status === 'suspended' ? '✅ تفعيل' : '⏸ إيقاف'}
                              </button>
                              <button onClick={() => handleDeleteAdmin(a.id, a.name)} disabled={deletingId === a.id} className="btn btn-sm btn-danger">
                                {deletingId === a.id ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '🗑️ حذف'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══ Results ═══════════════════════════════════════════ */}
          {activeTab === 'results' && (
            <div>
              {/* Stats */}
              <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', marginBottom: 24 }}>
                {[
                  { icon: '📋', val: resultsStats.total,          lbl: 'إجمالي التقييمات' },
                  { icon: '✅', val: resultsStats.passed,         lbl: 'ناجحون (≥70%)' },
                  { icon: '📊', val: (resultsStats.avg ?? 0) + '%', lbl: 'متوسط النتائج' },
                  { icon: '❌', val: (resultsStats.total ?? 0) - (resultsStats.passed ?? 0), lbl: 'دون 70%' },
                ].map(s => (
                  <div key={s.lbl} className="stat-card">
                    <span className="stat-icon">{s.icon}</span>
                    <div><div className="stat-val">{s.val}</div><div className="stat-lbl">{s.lbl}</div></div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>🔍 بحث بالاسم</label>
                    <input
                      className="form-input" style={{ margin: 0 }}
                      placeholder="اسم الطالب..."
                      value={resultsSearch}
                      onChange={e => setResultsSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && loadResults(1, resultsSearch, resultsLevel, resultsMin, resultsMax)}
                    />
                  </div>
                  <div style={{ flex: '0 1 130px' }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>المستوى</label>
                    <select className="form-input" style={{ margin: 0 }} value={resultsLevel} onChange={e => setResultsLevel(e.target.value)}>
                      <option value="">كل المستويات</option>
                      {[1,2,3,4,5,6,7].map(l => <option key={l} value={l}>المستوى {l}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: '0 1 110px' }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>الدرجة من</label>
                    <input className="form-input" style={{ margin: 0 }} type="number" min="0" max="100" placeholder="0" value={resultsMin} onChange={e => setResultsMin(e.target.value)} />
                  </div>
                  <div style={{ flex: '0 1 110px' }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>الدرجة إلى</label>
                    <input className="form-input" style={{ margin: 0 }} type="number" min="0" max="100" placeholder="100" value={resultsMax} onChange={e => setResultsMax(e.target.value)} />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => loadResults(1, resultsSearch, resultsLevel, resultsMin, resultsMax)}
                    disabled={resultsLoading}
                  >
                    {resultsLoading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '🔍 بحث'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setResultsSearch(''); setResultsLevel(''); setResultsMin(''); setResultsMax('');
                      loadResults(1, '', '', '', '');
                    }}
                  >
                    مسح
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                        {['#', 'اسم الطالب', 'المستوى', 'الدرجة', 'الحالة', 'التاريخ'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)', fontSize: '.82rem' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultsLoading ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}><span className="spinner" /></td></tr>
                      ) : results.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>لا توجد نتائج</td></tr>
                      ) : results.map((r, i) => {
                        const passed = (r.score ?? 0) >= 70;
                        const rowNum = (resultsPage - 1) * 50 + i + 1;
                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <td style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: '.82rem' }}>{rowNum}</td>
                            <td style={{ padding: '11px 16px', fontWeight: 600 }}>{r.student_name ?? '—'}</td>
                            <td style={{ padding: '11px 16px' }}>
                              <span style={{ background: 'var(--primary-lt)', color: 'var(--primary)', borderRadius: 6, padding: '2px 10px', fontSize: '.82rem', fontWeight: 700 }}>
                                المستوى {r.level ?? '—'}
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px', fontWeight: 800, fontSize: '1rem', color: passed ? '#1a7c40' : '#b91c1c' }}>
                              {r.score ?? 0}%
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span style={{
                                borderRadius: 6, padding: '3px 10px', fontSize: '.8rem', fontWeight: 700,
                                background: passed ? '#dcfce7' : '#fee2e2',
                                color:      passed ? '#15803d' : '#b91c1c',
                              }}>
                                {passed ? '✅ ناجح' : '❌ دون المعدل'}
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: '.85rem' }}>
                              {r.completed_at ? new Date(r.completed_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {resultsTotal > 50 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)', fontSize: '.85rem' }}>
                    <span style={{ color: 'var(--muted)' }}>
                      عرض {(resultsPage - 1) * 50 + 1}–{Math.min(resultsPage * 50, resultsTotal)} من {resultsTotal}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" disabled={resultsPage === 1}
                        onClick={() => loadResults(resultsPage - 1, resultsSearch, resultsLevel, resultsMin, resultsMax)}>
                        ← السابق
                      </button>
                      <button className="btn btn-ghost btn-sm" disabled={resultsPage * 50 >= resultsTotal}
                        onClick={() => loadResults(resultsPage + 1, resultsSearch, resultsLevel, resultsMin, resultsMax)}>
                        التالي →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ Setup ═════════════════════════════════════════════ */}
          {activeTab === 'setup' && (
            <div>
              {!isSuperAdmin && (
                <div className="card" style={{ marginBottom: 28, border: '2px solid #F5A623', background: '#fffbf0' }}>
                  <h3 style={{ fontWeight: 800, color: '#b56a00', marginBottom: 10, fontSize: '1.1rem' }}>👑 ترقية حسابك إلى مدير مطلق</h3>
                  <p style={{ color: '#64748b', fontSize: '.9rem', lineHeight: 1.7, marginBottom: 16 }}>إذا كنت المدير الرئيسي ولم يكن هناك مدير مطلق بعد، اضغط الزر أدناه.</p>
                  {promoMsg && <div className={`alert alert-${promoMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>{promoMsg.text}</div>}
                  <button onClick={handlePromote} disabled={promoting} className="btn btn-accent btn-lg" style={{ gap: 10 }}>
                    {promoting ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#7A3800', borderColor: 'rgba(122,56,0,.2)' }} />جارٍ الترقية...</> : '👑 ترقية حسابي إلى مدير مطلق'}
                  </button>
                </div>
              )}
              {isSuperAdmin && (
                <>
                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 16 }}>⚙️ تهيئة قاعدة البيانات</h2>
                  <div className="alert alert-info" style={{ marginBottom: 20 }}>
                    افتح <strong>Supabase → SQL Editor</strong> ثم الصق هذا الكود وشغّله.
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

            </> /* end of tabs content */
          )}

        </div>
      </main>

      {/* ══ Admin Complete Session Modal ═══════════════════════════════════ */}
      {adminCompleteFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 650, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setAdminCompleteFor(null)}>
          <div style={{ background: '#fff', borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 480, direction: 'rtl', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 6, color: '#1a7c40' }}>✅ إنهاء الحصة</h2>
            <p style={{ fontSize: '.88rem', color: 'var(--muted)', marginBottom: 20 }}>
              {adminCompleteFor.subject || 'حصة عامة'} — {adminCompleteFor.student_name} مع {adminCompleteFor.teacher_name}
            </p>
            <div className="form-group">
              <label className="form-label">رابط تسجيل الحصة (اختياري)</label>
              <input className="form-input" type="url" dir="ltr"
                placeholder="https://drive.google.com/..."
                value={adminRecordingUrl} onChange={e => setAdminRecordingUrl(e.target.value)} />
              <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 4 }}>يظهر للطالب في سجل حصصه</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={handleAdminComplete} disabled={adminCompleteSav}
                className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#1a7c40', borderColor: '#1a7c40' }}>
                {adminCompleteSav ? 'جارٍ الحفظ...' : '✅ تأكيد الإنهاء'}
              </button>
              <button onClick={() => setAdminCompleteFor(null)} className="btn btn-outline">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Activity Modal ═════════════════════════════════════════════════ */}
      {activityModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setActivityModal(null); }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: '28px', width: '100%', maxWidth: 580, direction: 'rtl', boxShadow: '0 24px 72px rgba(0,0,0,.28)', maxHeight: '85vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', margin: '0 0 2px' }}>📊 سجل نشاط المشرف</h2>
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', margin: 0 }}>{activityModal.name} — {activityModal.email}</p>
              </div>
              <button onClick={() => setActivityModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--muted)', cursor: 'pointer', lineHeight: 1, padding: 2 }}>✕</button>
            </div>

            {activityLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
              </div>
            ) : (
              <>
                {/* Current connection status */}
                {(() => {
                  const s     = getOnlineInfo(activityModal.id);
                  const now   = activityData.online;
                  const curDur = now && s.online
                    ? Math.floor((Date.now() - new Date(now.session_start)) / 60000)
                    : null;
                  return (
                    <div style={{ background: s.online ? '#dcfce7' : '#f8faff', border: `1.5px solid ${s.online ? '#86efac' : '#e2e8f0'}`, borderRadius: 12, padding: '14px 18px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{s.online ? '🟢' : '🔴'}</span>
                      <div>
                        <div style={{ fontWeight: 800, color: s.online ? '#15803d' : '#64748b', fontSize: '.95rem' }}>{s.label}</div>
                        {now && (
                          <div style={{ color: 'var(--muted)', fontSize: '.78rem', marginTop: 3 }}>
                            {s.online
                              ? `بدأت الجلسة: ${new Date(now.session_start).toLocaleString('ar-SA')} — مدة الجلسة الحالية: ${curDur} دقيقة`
                              : `آخر ظهور: ${new Date(now.last_seen).toLocaleString('ar-SA')}`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Sessions list */}
                <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--muted)', marginBottom: 12 }}>سجل الجلسات السابقة</div>
                {activityData.sessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--muted)', fontSize: '.9rem' }}>لا توجد جلسات مسجّلة بعد</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activityData.sessions.map(s => {
                      const dur = s.duration_minutes ?? 0;
                      const durLabel = dur >= 60 ? `${Math.floor(dur/60)}س ${dur%60}د` : `${dur} دقيقة`;
                      return (
                        <div key={s.id} style={{ background: '#f8faff', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '.88rem' }}>
                              📅 {new Date(s.session_start).toLocaleDateString('ar-SA', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            <div style={{ color: 'var(--muted)', fontSize: '.78rem', marginTop: 3, display: 'flex', gap: 16 }}>
                              <span>🕐 من: {new Date(s.session_start).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span>🕓 إلى: {new Date(s.session_end).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <div style={{ background: '#185FA5', color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: '.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            ⏱ {durLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ Permission Popover ══════════════════════════════════════════════ */}
      {permPopover && (
        <div
          ref={permPopoverRef}
          style={{
            position: 'fixed', top: permPopover.top, left: permPopover.left,
            zIndex: 800, background: '#fff', borderRadius: 14,
            boxShadow: '0 8px 36px rgba(0,0,0,.18)', border: '1px solid var(--border)',
            padding: '18px 20px', minWidth: 270, maxWidth: 330, direction: 'rtl',
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '.95rem' }}>
                🔒 {TAB_NAMES[permPopover.tabKey]}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '.75rem', marginTop: 2 }}>صلاحيات المشرفين المساعدين</div>
            </div>
            <button onClick={() => setPermPopover(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.1rem', padding: 2, lineHeight: 1 }}>✕</button>
          </div>

          {permsLoading ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
            </div>
          ) : admins.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '.85rem', margin: 0 }}>
              لا يوجد مشرفون مساعدون — أضف مشرفاً من تبويب <strong>إدارة المشرفين</strong> أولاً.
            </p>
          ) : (
            admins.map(admin => {
              const isAllowed = allPerms[admin.id]?.[permPopover.tabKey] ?? false;
              const saving    = !!permSaving[`${admin.id}_${permPopover.tabKey}`];
              return (
                <div key={admin.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: '.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{admin.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '.74rem' }}>{admin.email}</div>
                  </div>
                  {saving
                    ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#1a7c40', borderColor: 'var(--border)', flexShrink: 0 }} />
                    : <ToggleSwitch checked={isAllowed} onChange={() => togglePerm(admin.id, permPopover.tabKey)} />
                  }
                </div>
              );
            })
          )}

          {permError && (
            <div style={{ marginTop: 12, padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '.78rem', color: '#b91c1c', lineHeight: 1.5 }}>
              ⚠️ {permError}
            </div>
          )}

          <div style={{ marginTop: 12, padding: '8px 10px', background: '#f8faff', borderRadius: 8, fontSize: '.76rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            الوضع الافتراضي لأي تبويب: <strong style={{ color: '#b91c1c' }}>مخفي</strong> — لا يظهر لأي مساعد إلا بعد تفعيله يدوياً
          </div>
        </div>
      )}

      {/* ══ Interview Schedule Modal ════════════════════════════════════════ */}
      {schedModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget && !schedulingBusy) setSchedModal(null); }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: '28px 28px 24px', width: '100%', maxWidth: 520, direction: 'rtl', boxShadow: '0 24px 72px rgba(0,0,0,.28)', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.15rem', margin: '0 0 4px' }}>📅 جدولة مقابلة</h2>
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', margin: 0 }}>{schedModal.name}</p>
              </div>
              <button onClick={() => { if (!schedulingBusy) setSchedModal(null); }} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--muted)', cursor: 'pointer', lineHeight: 1, padding: 2 }}>✕</button>
            </div>

            {schedMsg && <div className={`alert alert-${schedMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 16 }}>{schedMsg.text}</div>}

            <div className="form-group">
              <label className="form-label">👤 المقابِل</label>
              <input className="form-input" value={schedInterviewer} onChange={e => setSchedInterviewer(e.target.value)} placeholder="اسم من سيجري المقابلة" disabled={schedulingBusy} />
              <p className="form-help">سيظهر هذا الاسم في بريد الدعوة المرسل للمترشح</p>
            </div>

            <div className="form-group">
              <label className="form-label">📆 تاريخ المقابلة</label>
              <input className="form-input" type="date" value={schedDate} min={new Date().toISOString().split('T')[0]} onChange={e => { setSchedDate(e.target.value); setSchedTime(''); }} disabled={schedulingBusy} dir="ltr" />
            </div>

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
                      <button key={slot} disabled={booked || schedulingBusy} onClick={() => setSchedTime(slot)} className="time-btn"
                        style={{
                          padding: '8px 2px', borderRadius: 9, fontFamily: 'inherit',
                          fontSize: '.8rem', fontWeight: selected ? 800 : 400,
                          cursor: booked ? 'not-allowed' : 'pointer',
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

            <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
              <button onClick={handleSchedule} disabled={!schedDate || !schedInterviewer.trim() || !schedTime || schedulingBusy} className="btn btn-primary"
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

      {/* ══ Add Admin Modal ═════════════════════════════════════════════════ */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 440, direction: 'rtl', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20, fontSize: '1.15rem' }}>+ إضافة مشرف مساعد جديد</h2>
            {adminMsg && <div className={`alert alert-${adminMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>{adminMsg.text}</div>}
            <form onSubmit={handleAddAdmin}>
              <div className="form-group">
                <label className="form-label">الاسم الكامل *</label>
                <input className="form-input" value={adminForm.name} required onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} placeholder="أدخل الاسم الكامل" />
              </div>
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني *</label>
                <input className="form-input" type="email" value={adminForm.email} required onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} placeholder="admin@example.com" dir="ltr" />
              </div>
              <div className="alert alert-info" style={{ fontSize: '.85rem', marginBottom: 4 }}>
                🔑 ستُنشأ كلمة مرور مؤقتة تلقائياً وتُرسل للمشرف عبر بريده الإلكتروني.
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
