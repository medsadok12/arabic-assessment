'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useRouter }                    from 'next/navigation';
import Link                             from 'next/link';
import { createClient }                 from '../../lib/supabase';
import Navbar                           from '../../components/Navbar';
import AssessmentCodes                  from '../../components/AssessmentCodes';
import StudentCodes                     from '../../components/StudentCodes';
import TeacherCodes                     from '../../components/TeacherCodes';
import GroupsManager                    from '../../components/GroupsManager';
import LessonLogbookView               from '../../components/LessonLogbookView';
import TeacherSpace                    from '../../components/TeacherSpace';
import NotificationBell                from '../../components/NotificationBell';
import FinancialsTab                   from '../../components/FinancialsTab';
import LifeSceneSimulator              from '../../components/LifeSceneSimulator';
import PricingAdmin                    from '../../components/PricingAdmin';
import TeamAdmin                        from '../../components/TeamAdmin';
import { useLanguage }                  from '../../contexts/LanguageContext';

// ── Time slots 00:00 → 23:55, 5-min increments (288 slots) ─────────────────
const TIME_SLOTS = Array.from({ length: 288 }, (_, i) => {
  const mins = i * 5;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

// ── Tabs that assistant admins can be granted access to ─────────────────────
const CONTROLLABLE = ['overview', 'codes', 'groups', 'sessions', 'results', 'lexicon', 'recruitment', 'simulator', 'setup'];
const TAB_NAMES = {
  overview: 'نظرة عامة', codes: 'الأكواد', groups: 'إدارة الطلاب',
  sessions: 'الحصص', results: 'نتائج الطلاب', lexicon: 'بنك الكلمات',
  recruitment: 'طلبات التوظيف', simulator: 'مسرح التعبير', setup: 'الإعداد',
};
const TAB_NAMES_EN = {
  overview: 'Overview', codes: 'Codes', groups: 'Students',
  sessions: 'Sessions', results: 'Results', lexicon: 'Word Bank',
  recruitment: 'Job Applications', simulator: 'Expression Theater', setup: 'Setup',
};

// ── Arabic month names ──────────────────────────────────────────────────────
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function fmtDate(iso, langCode) {
  if (!iso) return '';
  if (langCode !== 'ar') {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
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

const STATUS_COLORS = { pending: '#b56a00', reviewed: '#185FA5', accepted: '#1a7c40', rejected: '#e53e3e' };
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
CREATE POLICY "admins_read_own_permissions" ON admin_permissions
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
    CONSTRAINT valid_status CHECK (status IN ('scheduled','active','completed','cancelled')),
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
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS reminder_sent      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS reminder_5min_sent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS reminder_24h_sent  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sessions ALTER COLUMN room_name DROP NOT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS attended BOOLEAN;
-- تحديث قيد الحالة ليشمل 'active' (بدء الحصة الفعلي)
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE sessions ADD CONSTRAINT  valid_status CHECK (status IN ('scheduled','active','completed','cancelled'));
CREATE INDEX IF NOT EXISTS interviews_slot_idx ON interviews (interviewer_name, interview_date, start_time);
CREATE INDEX IF NOT EXISTS sessions_teacher_idx ON sessions (teacher_id, session_date);
CREATE INDEX IF NOT EXISTS sessions_student_idx ON sessions (student_email, session_date);
-- تفعيل Realtime على sessions حتى يصل الطالب تحديث فوري عند بدء الحصة
ALTER publication supabase_realtime ADD TABLE sessions;

-- 7. جداول مساندة للحصص
CREATE TABLE IF NOT EXISTS attendance_logs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID         NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id    UUID         NOT NULL,
  student_email TEXT         NOT NULL,
  student_name  TEXT,
  session_date  DATE         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE attendance_logs DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS attendance_logs_session_idx ON attendance_logs (session_id);
CREATE INDEX IF NOT EXISTS attendance_logs_student_idx ON attendance_logs (student_email);

CREATE TABLE IF NOT EXISTS session_support_students (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID         NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_name  TEXT         NOT NULL,
  student_email TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_email)
);
ALTER TABLE session_support_students DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS session_teacher_invites (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID         NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  teacher_id    UUID         NOT NULL,
  teacher_email TEXT         NOT NULL,
  teacher_name  TEXT,
  status        TEXT         NOT NULL DEFAULT 'pending'
    CONSTRAINT valid_invite_status CHECK (status IN ('pending','accepted','declined')),
  invited_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  UNIQUE (session_id, teacher_id)
);
ALTER TABLE session_teacher_invites DISABLE ROW LEVEL SECURITY;

-- 8. جدول قاعدة معرفة فهيم للزوار
CREATE TABLE IF NOT EXISTS faheem_visitor_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE faheem_visitor_qa DISABLE ROW LEVEL SECURITY;

-- 8. جدول الفواتير والإدارة المالية
CREATE TABLE IF NOT EXISTS invoices (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID,
  user_name        TEXT         NOT NULL,
  user_email       TEXT         NOT NULL,
  type             TEXT         NOT NULL CONSTRAINT invoice_type CHECK (type IN ('teacher_payout','student_bill')),
  total_hours      NUMERIC(8,2) NOT NULL DEFAULT 0,
  sessions_count   INT          NOT NULL DEFAULT 0,
  rate_per_hour    NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  status           TEXT         NOT NULL DEFAULT 'draft' CONSTRAINT invoice_status CHECK (status IN ('draft','sent')),
  billing_period   TEXT         NOT NULL,
  items            JSONB,
  sent_at          TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (user_email, type, billing_period)
);
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS invoices_period_idx ON invoices (billing_period, type);

NOTIFY pgrst, 'reload schema';`;

// ════════════════════════════════════════════════════════════════════════════
function StoriesTab({ lang }) {
  const [stories,  setStories]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    fetch('/api/stories')
      .then(r => r.json())
      .then(j => setStories(j.stories || []))
      .catch(() => setStories([]));
  }, []);

  const handleToggle = async (s) => {
    setToggling(s.id);
    const newStatus = s.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/stories/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const j = await res.json();
      if (j.story) setStories(p => p.map(x => x.id === s.id ? j.story : x));
    } catch {}
    setToggling(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف القصة نهائياً؟')) return;
    setDeleting(id);
    try {
      await fetch(`/api/stories/${id}`, { method: 'DELETE' });
      setStories(p => p.filter(s => s.id !== id));
    } catch {}
    setDeleting(null);
  };

  if (stories === null) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'#94a3b8', fontWeight:700, fontFamily:'Cairo,Tajawal,sans-serif' }}>⏳ جارٍ التحميل...</div>
  );

  return (
    <div style={{ direction:'rtl', fontFamily:'Cairo,Tajawal,sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontWeight:800, color:'var(--primary)', margin:'0 0 4px' }}>📚 إدارة القصص</h2>
          <p style={{ color:'var(--muted)', fontSize:'.85rem', margin:0 }}>أضف وعدّل وانشر القصص للطلاب</p>
        </div>
        <a href="/teacher/stories" style={{
          display:'inline-flex', alignItems:'center', gap:8,
          background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff',
          border:'none', borderRadius:12, padding:'10px 20px',
          fontSize:'.88rem', fontWeight:800, textDecoration:'none',
          boxShadow:'0 4px 14px rgba(16,185,129,.3)',
        }}>
          ✏️ فتح محرر القصص الكامل
        </a>
      </div>

      {stories.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8', fontWeight:700 }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>📖</div>
          لا توجد قصص بعد —{' '}
          <a href="/teacher/stories" style={{ color:'#10b981', textDecoration:'none', fontWeight:900 }}>أضف أول قصة</a>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {stories.map(s => (
            <div key={s.id} style={{
              display:'flex', alignItems:'center', gap:14,
              background:'#fff', borderRadius:16, padding:'14px 18px',
              border:'1.5px solid #f1f5f9', boxShadow:'0 2px 10px rgba(0,0,0,.05)',
            }}>
              <div style={{ width:48, height:48, borderRadius:12, background: s.bg || '#ecfdf5', border:`2px solid ${s.border_color || '#6ee7b7'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.7rem', flexShrink:0 }}>
                {s.icon || '📖'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:800, color:'#1e293b', fontSize:'.92rem', marginBottom:5 }}>{s.title}</div>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  {s.status === 'published'
                    ? <span style={{ background:'#d1fae5', color:'#065f46', borderRadius:20, padding:'2px 9px', fontSize:'.65rem', fontWeight:900, border:'1.5px solid #86efac' }}>✅ منشورة</span>
                    : <span style={{ background:'#fef3c7', color:'#78350f', borderRadius:20, padding:'2px 9px', fontSize:'.65rem', fontWeight:900, border:'1.5px solid #fde68a' }}>✏️ مسودة</span>
                  }
                  <span style={{ background:'#f8fafc', color:'#64748b', borderRadius:20, padding:'2px 9px', fontSize:'.65rem', fontWeight:700, border:'1px solid #e2e8f0' }}>مستوى {s.level || 1}</span>
                  <span style={{ background:'#f8fafc', color:'#64748b', borderRadius:20, padding:'2px 9px', fontSize:'.65rem', fontWeight:700, border:'1px solid #e2e8f0' }}>⭐ {s.points || 10} نقطة</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                {s.status === 'published' && (
                  <a href={`/library/stories/${s.slug}`} target="_blank" style={{ background:'#ecfdf5', color:'#065f46', border:'1.5px solid #86efac', borderRadius:10, padding:'6px 13px', fontSize:'.75rem', fontWeight:700, textDecoration:'none' }}>
                    👁 عرض
                  </a>
                )}
                <button
                  onClick={() => handleToggle(s)}
                  disabled={toggling === s.id}
                  style={{ background: s.status==='published'?'#fef3c7':'#d1fae5', color: s.status==='published'?'#78350f':'#065f46', border:'none', borderRadius:10, padding:'6px 13px', fontSize:'.75rem', fontWeight:700, cursor:'pointer' }}
                >
                  {toggling === s.id ? '...' : s.status==='published' ? '⬇️ إلغاء النشر' : '🚀 نشر'}
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deleting === s.id}
                  style={{ background:'#fee2e2', color:'#b91c1c', border:'none', borderRadius:10, padding:'6px 13px', fontSize:'.75rem', fontWeight:700, cursor:'pointer' }}
                >
                  {deleting === s.id ? '...' : '🗑'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function BoggarAdminPage() {
  const supabase      = createClient();
  const router        = useRouter();
  const { t: tr, lang } = useLanguage();

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

  // Supervisors
  const [supervisors,          setSupervisors]          = useState([]);
  const [supervisorsLoading,   setSupervisorsLoading]   = useState(false);
  const [showAddSupervisor,    setShowAddSupervisor]    = useState(false);
  const [supervisorForm,       setSupervisorForm]       = useState(EMPTY_ADMIN_FORM);
  const [addingSupervisor,     setAddingSupervisor]     = useState(false);
  const [supervisorMsg,        setSupervisorMsg]        = useState(null);
  const [deletingSupervisorId, setDeletingSupervisorId] = useState(null);
  const [suspendingSupervisorId, setSuspendingSupervisorId] = useState(null);

  // Users directory
  const [usersList,        setUsersList]        = useState([]);
  const [usersLoading,     setUsersLoading]     = useState(false);
  const [usersSearch,      setUsersSearch]      = useState('');
  const [usersRoleFilter,  setUsersRoleFilter]  = useState('all');
  const [resettingPwdId,   setResettingPwdId]   = useState(null);
  const [resetPwdResult,   setResetPwdResult]   = useState(null); // { id, password }
  const [revealedPwds,    setRevealedPwds]    = useState(new Set());
  const [deletingUserId,   setDeletingUserId]   = useState(null);
  const [editingUser,      setEditingUser]      = useState(null); // { id, name }
  const [savingUserId,     setSavingUserId]     = useState(null);
  const [bulkResetting,    setBulkResetting]    = useState(false);

  // Parent messages
  const [parentMessages,    setParentMessages]    = useState([]);
  const [msgsLoaded,        setMsgsLoaded]        = useState(false);

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
  // inline perms panel per admin row
  const [openPermsFor, setOpenPermsFor] = useState(null);

  // Promotion
  const [promoting, setPromoting] = useState(false);
  const [promoMsg,  setPromoMsg]  = useState(null);

  // Puzzles
  const [puzzles,       setPuzzles]       = useState([]);
  const [puzzlesLoading,setPuzzlesLoading]= useState(false);
  const [puzzleForm,    setPuzzleForm]    = useState({ title: '', cols: 3, rows: 3, badge_name: 'بطل الأحجية', badge_icon: '🏆', is_active: true });
  const [puzzleImgFile, setPuzzleImgFile] = useState(null);
  const [puzzleImgPrev, setPuzzleImgPrev] = useState(null);
  const [editingPuzzle, setEditingPuzzle] = useState(null);
  const [puzzleSaving,  setPuzzleSaving]  = useState(false);
  const [puzzleMsg,     setPuzzleMsg]     = useState(null);
  const [showPuzzleForm,setShowPuzzleForm]= useState(false);
  const puzzleFileRef = useRef(null);

  // Codes sub-tab
  const [codesTab, setCodesTab] = useState('assessment');

  // Setup
  const [copied, setCopied] = useState(false);
  const [sheetsUrl,      setSheetsUrl]      = useState(() => typeof window !== 'undefined' ? localStorage.getItem('admin_sheets_url') ?? '' : '');
  const [sheetsUrlInput, setSheetsUrlInput] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('admin_sheets_url') ?? '' : '');
  const [sheetsSaved,    setSheetsSaved]    = useState(false);

  // Visitor Q&A — فهيم الزوار
  const [visitorQA,    setVisitorQA]    = useState([]);
  const [qaLoading,    setQaLoading]    = useState(false);
  const [qaForm,       setQaForm]       = useState({ question: '', answer: '', sort_order: 0 });
  const [qaEditing,    setQaEditing]    = useState(null);
  const [qaShowModal,  setQaShowModal]  = useState(false);
  const [qaSaving,     setQaSaving]     = useState(false);
  const [qaDeletingId, setQaDeletingId] = useState(null);
  const [qaMsg,        setQaMsg]        = useState(null);

  // Results tab
  const [results,        setResults]        = useState([]);
  const [resultsTotal,   setResultsTotal]   = useState(0);
  const [resultsPage,    setResultsPage]    = useState(1);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsStats,   setResultsStats]   = useState({ total: 0, passed: 0, avg: 0, levelCounts: {}, scoreDist: {} });
  const [resultsSearch,  setResultsSearch]  = useState('');
  const [resultsLevel,   setResultsLevel]   = useState('');
  const [resultsMin,     setResultsMin]     = useState('');
  const [resultsMax,     setResultsMax]     = useState('');
  const [resultsExporting, setResultsExporting] = useState(false);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [editingNoteId,    setEditingNoteId]    = useState(null);
  const [editNoteText,     setEditNoteText]     = useState('');
  const [noteSaving,       setNoteSaving]       = useState(false);

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
  // Admin session scheduling modal
  const EMPTY_SCHED = { teacherName:'', teacherId:'', teacherEmail:'', studentName:'', studentEmail:'', sessionDate:'', startTime:'', durationMinutes:'60', subject:'' };
  const [adminSchedModal,   setAdminSchedModal]   = useState(false);
  const [adminSchedForm,    setAdminSchedForm]    = useState(EMPTY_SCHED);
  const [adminSchedSaving,  setAdminSchedSaving]  = useState(false);
  const [adminSchedMsg,     setAdminSchedMsg]     = useState(null);
  const [adminTeacherList,  setAdminTeacherList]  = useState([]);

  // Notifications

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/auth/login'); return; }
      const r = u.user_metadata?.role ?? '';
      if (r !== 'admin' && r !== 'super_admin') {
        router.push(r === 'supervisor' ? '/supervisor' : r === 'teacher' ? '/teacher' : '/dashboard');
        return;
      }
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
    if (tab === 'admins'      && isSA) { loadAdmins(); loadSupervisors(); }
    if ((tab === 'teachers_mgmt' || tab === 'students_mgmt') && isSA) loadUsers();
    if (tab === 'overview' || !tab)
      fetch('/api/bogga/results?page=1').then(r => r.json()).then(d => setRecentAssessments(d.results?.slice(0, 5) ?? [])).catch(() => {});
    if (tab === 'results')   loadResults(1, resultsSearch, resultsLevel, resultsMin, resultsMax);
    if (tab === 'sessions')    loadAdminSessions();
    if (tab === 'visitor_qa' && isSA) loadVisitorQA();
    if (tab === 'puzzles'    && isSA) loadPuzzles();
    // logbook + space tabs need no pre-loading — their components load on demand
    if (tab === 'messages' && !msgsLoaded) {
      fetch('/api/contact/supervisor').then(r => r.json()).then(d => {
        setParentMessages(d.messages ?? []); setMsgsLoaded(true);
      });
    }
  }, [user, tab, myPermissions, msgsLoaded]);

  function markMsgRead(id) {
    fetch('/api/contact/supervisor', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setParentMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
  }

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

  async function exportCsv() {
    setResultsExporting(true);
    const params = new URLSearchParams({ all: 'true' });
    if (resultsSearch) params.set('search',   resultsSearch);
    if (resultsLevel)  params.set('level',    resultsLevel);
    if (resultsMin)    params.set('minScore', resultsMin);
    if (resultsMax)    params.set('maxScore', resultsMax);
    const data = await fetch(`/api/bogga/results?${params}`).then(r => r.json()).catch(() => ({}));
    const rows = data.results ?? [];
    const headers = [lang === 'ar' ? 'اسم الطالب' : 'Student', lang === 'ar' ? 'المستوى' : 'Level', lang === 'ar' ? 'الدرجة' : 'Score', lang === 'ar' ? 'الحالة' : 'Status', lang === 'ar' ? 'التاريخ' : 'Date', lang === 'ar' ? 'ملاحظات' : 'Notes'];
    const csv = [
      headers.join(','),
      ...rows.map(r => [
        `"${(r.student_name ?? '').replace(/"/g, '""')}"`,
        r.level ?? '',
        r.score ?? '',
        (r.score ?? 0) >= 70 ? (lang === 'ar' ? 'ناجح' : 'Passed') : (lang === 'ar' ? 'دون المعدل' : 'Below average'),
        r.completed_at ? new Date(r.completed_at).toLocaleDateString('en-GB') : '',
        `"${(r.notes ?? '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\
');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `نتائج_التقييم_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setResultsExporting(false);
  }

  async function saveNote(id, notes) {
    setNoteSaving(true);
    await fetch(`/api/bogga/results/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    }).catch(() => {});
    setResults(prev => prev.map(r => r.id === id ? { ...r, notes } : r));
    setEditingNoteId(null);
    setNoteSaving(false);
  }

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

  async function loadSupervisors() {
    setSupervisorsLoading(true);
    const res = await fetch('/api/bogga/supervisors').then(r => r.json());
    setSupervisors(res.supervisors ?? []);
    setSupervisorsLoading(false);
  }

  async function loadUsers() {
    setUsersLoading(true);
    const res = await fetch('/api/bogga/users').then(r => r.json());
    setUsersList(res.users ?? []);
    setUsersLoading(false);
  }

  async function handleBulkReset() {
    const hidden = usersList.filter(u => !u.password);
    if (hidden.length === 0) return;
    const msg = lang === 'ar'
      ? `سيتم إعادة ضبط كلمات سر ${hidden.length} حساب (الحسابات التي كلمة سرها غير مرئية). هل تريد المتابعة؟`
      : `This will reset passwords for ${hidden.length} accounts without visible passwords. Continue?`;
    if (!confirm(msg)) return;
    setBulkResetting(true);
    try {
      const res  = await fetch('/api/bogga/users/bulk-reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Merge new passwords into usersList
      setUsersList(prev => prev.map(u => {
        const updated = data.updated.find(r => r.id === u.id);
        return updated ? { ...u, password: updated.password } : u;
      }));
    } catch (e) {
      alert(e.message);
    } finally {
      setBulkResetting(false);
    }
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
    if (!confirm(lang === 'ar' ? `هل تريد حذف طلب "${name}" نهائياً؟` : `Delete "${name}"'s application permanently?`)) return;
    setDeletingApp(id);
    const res = await fetch('/api/bogga/recruitment', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setApps(prev => prev.filter(a => a.id !== id));
      setInterviewsMap(prev => { const m = { ...prev }; delete m[id]; return m; });
    } else {
      alert((await res.json()).error || (lang === 'ar' ? 'تعذر حذف الطلب' : 'Failed to delete application'));
    }
    setDeletingApp(null);
  }

  async function downloadCV(id) {
    setDownloadingCV(p => ({ ...p, [id]: true }));
    try {
      const res  = await fetch(`/api/bogga/recruitment/${id}`);
      const data = await res.json();
      if (!res.ok || !data.cv_base64) { alert(data.error || (lang === 'ar' ? 'لا توجد سيرة ذاتية' : 'No CV found')); return; }
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
    if (!confirm(lang === 'ar' ? 'هل تريد إلغاء هذه المقابلة؟' : 'Cancel this interview?')) return;
    setCancellingInterview(ivId);
    const res = await fetch('/api/bogga/interviews', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ivId }),
    });
    if (res.ok) setInterviewsMap(prev => ({ ...prev, [appId]: (prev[appId] ?? []).filter(iv => iv.id !== ivId) }));
    setCancellingInterview(null);
  }

  // ── Granular ACL ──────────────────────────────────────────────────────────
  async function toggleAdminPermsPanel(adminId) {
    if (openPermsFor === adminId) { setOpenPermsFor(null); return; }
    setOpenPermsFor(adminId);
    if (Object.keys(allPerms).length > 0) return; // already loaded
    setPermsLoading(true);
    try {
      const res = await fetch('/api/bogga/permissions');
      const data = await res.json();
      const map = {};
      (data.permissions ?? []).forEach(p => {
        if (!map[p.admin_id]) map[p.admin_id] = {};
        map[p.admin_id][p.tab_key] = p.is_allowed;
      });
      setAllPerms(map);
    } catch { /* silent */ }
    setPermsLoading(false);
  }

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
    const label  = action === 'suspend' ? (lang === 'ar' ? 'إيقاف' : 'suspend') : (lang === 'ar' ? 'تفعيل' : 'activate');
    if (!confirm(lang === 'ar' ? `هل تريد ${label} حساب هذا المشرف؟` : `Do you want to ${label} this admin's account?`)) return;
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
    if (!confirm(lang === 'ar' ? `هل تريد حذف حساب "${name}" نهائياً؟` : `Delete "${name}"'s account permanently?`)) return;
    setDeletingId(id);
    const res  = await fetch(`/api/bogga/admins/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) setAdmins(prev => prev.filter(a => a.id !== id));
    else setAdminMsg({ type: 'error', text: data.error });
    setDeletingId(null);
  }

  // ── Supervisors ───────────────────────────────────────────────────────────
  async function handleAddSupervisor(e) {
    e.preventDefault();
    setAddingSupervisor(true); setSupervisorMsg(null);
    const res  = await fetch('/api/bogga/supervisors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: supervisorForm.name, email: supervisorForm.email }),
    });
    const data = await res.json();
    if (!res.ok) { setSupervisorMsg({ type: 'error', text: data.error }); }
    else {
      setSupervisors(prev => [...prev, data.supervisor]);
      setShowAddSupervisor(false); setSupervisorForm(EMPTY_ADMIN_FORM);
      const emailNote = data.emailSent
        ? `📧 ${lang === 'ar' ? 'تم إرسال بيانات الدخول إلى' : 'Login details sent to'} ${data.supervisor.email}`
        : `⚠️ ${lang === 'ar' ? 'فشل إرسال الإيميل — احفظ كلمة المرور الآن:' : 'Email failed — save password now:'} ${data.tempPassword}`;
      setSupervisorMsg({
        type: data.emailSent ? 'success' : 'error',
        text: `✅ ${lang === 'ar' ? `تم إنشاء حساب "${data.supervisor.name}" — ${emailNote}` : `Account "${data.supervisor.name}" created — ${emailNote}`}`,
        tempPassword: data.emailSent ? null : data.tempPassword,
      });
    }
    setAddingSupervisor(false);
  }

  async function handleSuspendSupervisor(id, currentStatus) {
    const action = currentStatus === 'suspended' ? 'activate' : 'suspend';
    const label  = action === 'suspend' ? (lang === 'ar' ? 'إيقاف' : 'suspend') : (lang === 'ar' ? 'تفعيل' : 'activate');
    if (!confirm(lang === 'ar' ? `هل تريد ${label} حساب هذا المرشد؟` : `Do you want to ${label} this supervisor's account?`)) return;
    setSuspendingSupervisorId(id);
    const res  = await fetch(`/api/bogga/supervisors/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (res.ok) setSupervisors(prev => prev.map(s => s.id === id ? { ...s, status: data.status } : s));
    else setSupervisorMsg({ type: 'error', text: data.error ?? (lang === 'ar' ? 'فشل تعديل حالة المرشد' : 'Failed to update supervisor status') });
    setSuspendingSupervisorId(null);
  }

  async function handleDeleteSupervisor(id, name) {
    if (!confirm(lang === 'ar' ? `هل تريد حذف حساب "${name}" نهائياً؟` : `Delete "${name}"'s account permanently?`)) return;
    setDeletingSupervisorId(id);
    const res  = await fetch(`/api/bogga/supervisors/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) setSupervisors(prev => prev.filter(s => s.id !== id));
    else setSupervisorMsg({ type: 'error', text: data.error });
    setDeletingSupervisorId(null);
  }

  // ── Users directory ───────────────────────────────────────────────────────
  function togglePwd(key) {
    setRevealedPwds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleResetPassword(id) {
    setResettingPwdId(id);
    const res  = await fetch(`/api/bogga/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-password' }),
    });
    const data = await res.json();
    if (res.ok) setUsersList(prev => prev.map(u => u.id === id ? { ...u, password: data.password } : u));
    else alert(data.error ?? (lang === 'ar' ? 'فشل إعادة كلمة السر' : 'Failed to reset password'));
    setResettingPwdId(null);
  }

  async function handleUpdateName(id) {
    if (!editingUser?.name?.trim()) return;
    setSavingUserId(id);
    const res  = await fetch(`/api/bogga/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-name', name: editingUser.name }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, name: data.name } : u));
      setEditingUser(null);
    } else { alert(data.error ?? (lang === 'ar' ? 'فشل حفظ الاسم' : 'Failed to save name')); }
    setSavingUserId(null);
  }

  async function handleDeleteUser(id, name) {
    if (!confirm(lang === 'ar' ? `هل تريد حذف حساب "${name}" نهائياً؟` : `Delete "${name}"'s account permanently?`)) return;
    setDeletingUserId(id);
    const res  = await fetch(`/api/bogga/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) { setUsersList(prev => prev.filter(u => u.id !== id)); setResetPwdResult(null); }
    else alert(data.error ?? (lang === 'ar' ? 'فشل حذف الحساب' : 'Failed to delete account'));
    setDeletingUserId(null);
  }

  async function handlePromote() {
    if (!confirm(lang === 'ar' ? 'سيتم ترقية حسابك إلى مدير مطلق. هذا الإجراء لا يمكن التراجع عنه.' : 'Your account will be promoted to Super Admin. This action cannot be undone.')) return;
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

  // ── Visitor Q&A ──────────────────────────────────────────────────────────
  async function loadVisitorQA() {
    setQaLoading(true);
    const data = await fetch('/api/bogga/visitor-qa').then(r => r.json()).catch(() => ({}));
    setVisitorQA(data.items ?? []);
    setQaLoading(false);
  }

  async function loadPuzzles() {
    setPuzzlesLoading(true);
    const data = await fetch('/api/bogga/puzzles').then(r => r.json()).catch(() => ({}));
    setPuzzles(data.puzzles ?? []);
    setPuzzlesLoading(false);
  }

  function openAddPuzzle() {
    setEditingPuzzle(null);
    setPuzzleForm({ title: '', cols: 3, rows: 3, badge_name: 'بطل الأحجية', badge_icon: '🏆', is_active: true });
    setPuzzleImgFile(null); setPuzzleImgPrev(null);
    setPuzzleMsg(null); setShowPuzzleForm(true);
  }

  function openEditPuzzle(pz) {
    setEditingPuzzle(pz);
    setPuzzleForm({ title: pz.title || '', cols: pz.cols || 3, rows: pz.rows || 3, badge_name: pz.badge_name || '', badge_icon: pz.badge_icon || '🏆', is_active: pz.is_active ?? true });
    setPuzzleImgFile(null); setPuzzleImgPrev(pz.image_url || null);
    setPuzzleMsg(null); setShowPuzzleForm(true);
  }

  async function handleSavePuzzle(e) {
    e.preventDefault();
    setPuzzleSaving(true); setPuzzleMsg(null);
    try {
      let image_url = editingPuzzle?.image_url || null;
      if (puzzleImgFile) {
        const fd = new FormData(); fd.append('file', puzzleImgFile);
        const up = await fetch('/api/bogga/puzzles/upload', { method: 'POST', body: fd });
        const uj = await up.json();
        if (!up.ok) throw new Error(uj.error || 'فشل رفع الصورة');
        image_url = uj.url;
      }
      const body = { ...puzzleForm, image_url, cols: Number(puzzleForm.cols), rows: Number(puzzleForm.rows) };
      const url  = editingPuzzle ? `/api/bogga/puzzles?id=${editingPuzzle.id}` : '/api/bogga/puzzles';
      const res  = await fetch(url, { method: editingPuzzle ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'فشل الحفظ');
      setPuzzleMsg({ ok: true, text: '✅ تم الحفظ' });
      await loadPuzzles();
      setTimeout(() => setShowPuzzleForm(false), 800);
    } catch (err) {
      setPuzzleMsg({ ok: false, text: '❌ ' + err.message });
    }
    setPuzzleSaving(false);
  }

  async function handleDeletePuzzle(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الأحجية؟')) return;
    await fetch(`/api/bogga/puzzles?id=${id}`, { method: 'DELETE' });
    await loadPuzzles();
  }

  async function handleTogglePuzzle(pz) {
    await fetch(`/api/bogga/puzzles?id=${pz.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pz, is_active: !pz.is_active, cols: pz.cols, rows: pz.rows }),
    });
    await loadPuzzles();
  }

  async function handleSaveQA(e) {
    e.preventDefault();
    setQaSaving(true); setQaMsg(null);
    const isEdit = !!qaEditing;
    const res = await fetch('/api/bogga/visitor-qa', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit
        ? { id: qaEditing.id, ...qaForm }
        : qaForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setQaMsg({ type: 'error', text: data.error || 'حدث خطأ' });
    } else {
      if (isEdit) {
        setVisitorQA(prev => prev.map(q => q.id === qaEditing.id ? data.item : q));
      } else {
        setVisitorQA(prev => [...prev, data.item]);
      }
      setQaShowModal(false); setQaEditing(null);
      setQaForm({ question: '', answer: '', sort_order: 0 });
    }
    setQaSaving(false);
  }

  async function handleDeleteQA(id) {
    if (!confirm(lang === 'ar' ? 'هل تريد حذف هذا السؤال نهائياً؟' : 'Delete this question permanently?')) return;
    setQaDeletingId(id);
    const res = await fetch('/api/bogga/visitor-qa', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setVisitorQA(prev => prev.filter(q => q.id !== id));
    setQaDeletingId(null);
  }

  async function toggleQAActive(item) {
    setVisitorQA(prev => prev.map(q => q.id === item.id ? { ...q, is_active: !q.is_active } : q));
    await fetch('/api/bogga/visitor-qa', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
    });
  }

  // ── Admin Sessions ────────────────────────────────────────────────────────
  async function loadAdminSessions() {
    setAdminSessLoading(true);
    const data = await fetch('/api/bogga/sessions').then(r => r.json()).catch(() => ({}));
    setAdminSessions(data.sessions ?? []);
    setAdminSessLoading(false);
  }

  async function handleAdminCancel(id) {
    if (!confirm(lang === 'ar' ? 'هل تريد إلغاء هذه الحصة؟' : 'Cancel this session?')) return;
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

  // ── Admin session scheduling ──────────────────────────────────────────────
  async function openAdminSchedModal() {
    setAdminSchedModal(true);
    setAdminSchedForm(EMPTY_SCHED);
    setAdminSchedMsg(null);
    if (adminTeacherList.length === 0) {
      const res = await fetch('/api/bogga/users').then(r => r.json()).catch(() => ({}));
      setAdminTeacherList((res.users ?? []).filter(u => u.role === 'teacher'));
    }
  }

  async function handleAdminSchedSubmit(e) {
    e.preventDefault();
    if (!adminSchedForm.teacherName || !adminSchedForm.studentName || !adminSchedForm.sessionDate || !adminSchedForm.startTime) {
      setAdminSchedMsg({ type: 'error', text: 'المعلم واسم الطالب والتاريخ والوقت مطلوبة' }); return;
    }
    setAdminSchedSaving(true); setAdminSchedMsg(null);
    const res = await fetch('/api/bogga/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...adminSchedForm, durationMinutes: parseInt(adminSchedForm.durationMinutes) || 60 }),
    });
    const data = await res.json();
    if (!res.ok) { setAdminSchedMsg({ type: 'error', text: data.error }); setAdminSchedSaving(false); return; }
    setAdminSessions(prev => [data.session, ...prev]);
    setAdminSchedMsg({ type: 'success', text: '✅ تمّت جدولة الحصة بنجاح' });
    setAdminSchedSaving(false);
    setTimeout(() => setAdminSchedModal(false), 1400);
  }

  function getOnlineInfo(adminId) {
    const s = onlineStatus[adminId];
    if (!s) return { online: false, label: lang === 'ar' ? 'لم يُسجَّل دخول بعد' : 'Never logged in', color: '#94a3b8' };
    const diffMin = Math.floor((Date.now() - new Date(s.last_seen)) / 60000);
    if (diffMin < 5)    return { online: true,  label: lang === 'ar' ? 'متصل الآن'                              : 'Online now',               color: '#16a34a' };
    if (diffMin < 60)   return { online: false, label: lang === 'ar' ? `منذ ${diffMin} دقيقة`                   : `${diffMin}m ago`,          color: '#f59e0b' };
    if (diffMin < 1440) return { online: false, label: lang === 'ar' ? `منذ ${Math.floor(diffMin/60)} ساعة`     : `${Math.floor(diffMin/60)}h ago`, color: '#94a3b8' };
    return               { online: false, label: lang === 'ar' ? `منذ ${Math.floor(diffMin/1440)} يوم`           : `${Math.floor(diffMin/1440)}d ago`, color: '#94a3b8' };
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <div style={{ textAlign: 'center', padding: '48px 36px', background: '#fff', borderRadius: 24, boxShadow: '0 8px 40px rgba(0,0,0,.12)', maxWidth: 420 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: '#b91c1c', fontWeight: 800, marginBottom: 12, fontSize: '1.3rem' }}>{tr('admin.suspended')}</h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, marginBottom: 28 }}>{tr('admin.suspendedMsg')}</p>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
            className="btn btn-ghost"
            style={{ fontSize: '.9rem' }}
          >
            {tr('nav.signOut')}
          </button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = role === 'super_admin';

  const STATUS_LABELS = lang === 'ar'
    ? { pending: 'قيد المراجعة', reviewed: 'تمت المراجعة', accepted: 'مقبول', rejected: 'مرفوض' }
    : { pending: 'Pending', reviewed: 'Reviewed', accepted: 'Accepted', rejected: 'Rejected' };

  const IV_LABELS = lang === 'ar'
    ? { pending: '⏳ بانتظار الرد', confirmed: '✅ مؤكد', reschedule_requested: '📅 طلب تعديل', rejected: '❌ اعتذر' }
    : { pending: '⏳ Awaiting Reply', confirmed: '✅ Confirmed', reschedule_requested: '📅 Reschedule Requested', rejected: '❌ Declined' };

  // Build TABS with permission filtering
  const canSee = id => isSuperAdmin || (CONTROLLABLE.includes(id) && myPermissions[id] === true);
  const TABS = [
    { id: 'overview',    label: tr('admin.tabs.overview'),    show: canSee('overview') },
    { id: 'codes',       label: tr('admin.tabs.codes'),       show: canSee('codes') },
    { id: 'groups',      label: tr('admin.tabs.groups'),      show: canSee('groups') },
    { id: 'sessions',    label: tr('admin.tabs.sessions'),    show: canSee('sessions') },
    { id: 'results',     label: tr('admin.tabs.results'),     show: canSee('results') },
    { id: 'lexicon',     label: tr('admin.tabs.lexicon'),     show: canSee('lexicon') },
    { id: 'recruitment', label: tr('admin.tabs.recruitment'), show: canSee('recruitment') },
    { id: 'simulator',   label: tr('admin.tabs.simulator'),   show: canSee('simulator') },
    { id: 'logbook',     label: tr('admin.tabs.logbook'),     show: isSuperAdmin },
    { id: 'space',       label: tr('admin.tabs.space'),       show: true },
    { id: 'messages',    label: tr('admin.tabs.messages'),    show: true },
    { id: 'financials',  label: tr('admin.tabs.financials'),  show: isSuperAdmin },
    { id: 'admins',        label: tr('admin.tabs.admins'),        show: isSuperAdmin },
    { id: 'teachers_mgmt', label: tr('admin.tabs.teachers_mgmt'), show: isSuperAdmin },
    { id: 'students_mgmt', label: tr('admin.tabs.students_mgmt'), show: isSuperAdmin },
    { id: 'visitor_qa',   label: tr('admin.tabs.visitor_qa'),   show: isSuperAdmin },
    { id: 'stories',     label: 'القصص 📚',                  show: true },
    { id: 'puzzles',     label: 'الأحاجي 🧩',                show: isSuperAdmin },
    { id: 'pricing',     label: lang === 'ar' ? '💰 الباقات والأسعار' : '💰 Pricing Plans', show: isSuperAdmin },
    { id: 'team',        label: '👨‍🏫 فريقنا',                show: isSuperAdmin },
    { id: 'setup',       label: tr('admin.tabs.setup'),       show: canSee('setup') },
  ].filter(tab => tab.show);

  const activeTab = TABS.some(t => t.id === tab) ? tab : TABS[0]?.id ?? 'overview';

  return (
    <>
      <style>{`
        .time-btn:not(:disabled):hover { background: var(--primary-lt) !important; border-color: var(--primary) !important; }
        .perm-icon { opacity:.55; transition:opacity .15s; }
        .perm-icon:hover { opacity:1; }
        .quick-link { text-decoration:none; transition:opacity .15s; }
        .quick-link:hover { opacity:.75; }
        .admin-tab-btn:hover { background: #eef5ff !important; color: var(--primary) !important; }
        @media (max-width: 800px) {
          /* Stack sidebar above content */
          .admin-layout { flex-direction: column !important; }

          /* Sidebar: full width, column layout, properly contained */
          .admin-sidebar {
            width: 100% !important;
            position: static !important;
            flex-direction: column !important;
            border-radius: 14px !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          /* Nav: 2-column grid — stays inside white box, no overflow */
          .admin-sidebar-nav {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
            padding: 10px !important;
            overflow: visible !important;
          }

          /* Each tab button: centred text, readable size, can wrap */
          .admin-sidebar-nav > div {
            width: 100% !important;
            min-width: 0 !important;
          }
          .admin-sidebar-nav > div > button:first-child {
            width: 100% !important;
            justify-content: center !important;
            text-align: center !important;
            font-size: .78rem !important;
            padding: 9px 6px !important;
            white-space: normal !important;
            line-height: 1.35 !important;
            word-break: keep-all !important;
          }

          /* Hide permission lock icons on mobile — not actionable on small screens */
          .admin-sidebar .perm-icon { display: none !important; }

          /* Ensure content area doesn't overflow screen */
          .admin-layout > div:last-child {
            min-width: 0 !important;
            max-width: 100% !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <Navbar user={user} />
      <main className="page-wrap" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="container">

          {/* ── Header ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>{tr('admin.title')}</h1>
              <p style={{ color: isSuperAdmin ? '#1a7c40' : 'var(--muted)', fontSize: '.88rem', fontWeight: isSuperAdmin ? 700 : 400 }}>
                {isSuperAdmin ? tr('admin.superRole') : tr('admin.assistantRole')}
              </p>
            </div>
            <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* ── Notification Bell ── */}
              <NotificationBell userId={user?.id} role={role} lang={lang} />
              <Link href="/bogga/lexicon" className="btn btn-outline btn-sm">📖 {lang === 'ar' ? 'بنك الكلمات' : 'Word Bank'}</Link>
            </div>
          </div>

          {/* ── No permissions state ────────────────────────────── */}
          {!isSuperAdmin && TABS.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: 14 }}>🔒</div>
              <h2 style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>{lang === 'ar' ? 'لا توجد لك صلاحيات بعد' : 'No permissions yet'}</h2>
              <p style={{ color: 'var(--muted)' }}>{lang === 'ar' ? 'تواصل مع المدير العام لمنحك صلاحيات الوصول إلى التبويبات المناسبة.' : 'Contact the super admin to grant you access to the appropriate tabs.'}</p>
            </div>
          ) : (
            <>

          {/* ── Admin layout: sidebar + content ───────────────── */}
          <div className="admin-layout" style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>

          {/* ── Vertical Sidebar ── */}
          <div className="admin-sidebar" style={{
            width: 218, flexShrink: 0,
            position: 'sticky', top: 80,
            background: '#fff', borderRadius: 20,
            border: '1.5px solid var(--border)',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(24,95,165,.08)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Sidebar brand strip */}
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,#f8faff,#eef3fb)' }}>
              <div style={{ fontSize: '.68rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '.07em', textTransform: 'uppercase' }}>
                {lang === 'ar' ? 'القائمة' : 'Navigation'}
              </div>
            </div>

            {/* Tab buttons */}
            <div className="admin-sidebar-nav" style={{ padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              {TABS.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    className={activeTab === t.id ? '' : 'admin-tab-btn'}
                    onClick={() => setTab(t.id)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 13px', borderRadius: 11, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '.875rem', fontWeight: 700,
                      background: activeTab === t.id ? 'var(--primary)' : 'transparent',
                      color: activeTab === t.id ? '#fff' : '#334155',
                      transition: 'all .15s', textAlign: 'inherit',
                      boxShadow: activeTab === t.id ? '0 2px 10px rgba(24,95,165,.28)' : 'none',
                    }}>
                    {t.label}
                  </button>
                  {isSuperAdmin && CONTROLLABLE.includes(t.id) && (
                    <button
                      onClick={e => openPermPopover(t.id, e)}
                      className="perm-icon"
                      title={`${lang === 'ar' ? 'إدارة صلاحيات' : 'Permissions'}: "${(lang === 'ar' ? TAB_NAMES : TAB_NAMES_EN)[t.id]}"`}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                        fontSize: '.68rem', lineHeight: 1,
                        color: activeTab === t.id ? 'rgba(255,255,255,.5)' : '#c4cdd8',
                        flexShrink: 0,
                      }}>
                      🔒
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Content area ─────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0 }}>

          {/* ══ Overview ══════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div>
              <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 32 }}>
                {[
                  { icon: '📋', val: stats.assessments, lbl: tr('admin.overview.totalAssessments') },
                  { icon: '✅', val: stats.pass,         lbl: lang === 'ar' ? 'ناجحون (≥70%)' : 'Passed (≥70%)' },
                  { icon: '📊', val: stats.avg + '%',    lbl: lang === 'ar' ? 'متوسط النتائج' : 'Average Score' },
                  ...(isSuperAdmin ? [{ icon: '📄', val: stats.applications, lbl: tr('admin.overview.applications') }] : []),
                ].map(s => (
                  <div key={s.lbl} className="stat-card">
                    <span className="stat-icon">{s.icon}</span>
                    <div><div className="stat-val">{s.val}</div><div className="stat-lbl">{s.lbl}</div></div>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>
                  {isSuperAdmin
                    ? (lang === 'ar' ? '👑 صلاحيات المدير المطلق' : '👑 Super Admin Permissions')
                    : (lang === 'ar' ? '🛡️ صلاحياتك كمشرف مساعد' : '🛡️ Your Permissions as Assistant Admin')}
                </h3>
                {isSuperAdmin ? (
                  <ul style={{ paddingRight: 20, lineHeight: 2.2 }}>
                    {lang === 'ar' ? (
                      <>
                        <li>✅ تعديل وحذف أي شيء في المنصة</li>
                        <li>✅ إدارة المشرفين المساعدين وضبط صلاحياتهم</li>
                        <li>✅ جدولة مقابلات التوظيف وإرسال دعوات تفاعلية</li>
                        <li>✅ الاطلاع على طلبات التوظيف والسير الذاتية</li>
                        <li>✅ تعديل بنك الكلمات اللغوية</li>
                        <li>✅ توليد أكواد التقييم والدعوة</li>
                      </>
                    ) : (
                      <>
                        <li>✅ Edit and delete anything on the platform</li>
                        <li>✅ Manage assistant admins and their permissions</li>
                        <li>✅ Schedule job interviews and send interactive invitations</li>
                        <li>✅ View job applications and resumes</li>
                        <li>✅ Edit the word bank</li>
                        <li>✅ Generate assessment and invitation codes</li>
                      </>
                    )}
                  </ul>
                ) : (
                  <ul style={{ paddingRight: 20, lineHeight: 2.2 }}>
                    {Object.keys(myPermissions).filter(k => myPermissions[k]).map(k => (
                      <li key={k}>✅ {(lang === 'ar' ? TAB_NAMES : TAB_NAMES_EN)[k] ?? k}</li>
                    ))}
                    {Object.keys(myPermissions).filter(k => myPermissions[k]).length === 0 && (
                      <li style={{ color: 'var(--muted)' }}>{lang === 'ar' ? 'لا توجد صلاحيات مُعيَّنة' : 'No permissions assigned yet'}</li>
                    )}
                  </ul>
                )}
              </div>

              {/* ── آخر التقييمات ── */}
              <div className="card" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ fontWeight: 700, fontSize: '.95rem', margin: 0 }}>🏆 {lang === 'ar' ? 'آخر التقييمات' : 'Recent Assessments'}</h3>
                  <button onClick={() => setTab('results')} style={{ fontSize: '.82rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: '4px 10px', borderRadius: 7, textDecoration: 'underline' }}>
                    {lang === 'ar' ? '← عرض الكل' : 'View All →'}
                  </button>
                </div>
                {recentAssessments.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem', textAlign: 'center', padding: '16px 0', margin: 0 }}>
                    {lang === 'ar' ? 'لا توجد تقييمات بعد' : 'No assessments yet'}
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '6px 10px', textAlign: lang === 'ar' ? 'right' : 'left', color: 'var(--muted)', fontWeight: 600 }}>{lang === 'ar' ? 'الطالب' : 'Student'}</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>{lang === 'ar' ? 'المستوى' : 'Level'}</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>{lang === 'ar' ? 'النتيجة' : 'Score'}</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentAssessments.map((r, i) => (
                          <tr key={r.id ?? i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.student_name ?? '—'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{lang === 'ar' ? `المستوى ${r.level}` : `Level ${r.level}`}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: (r.score ?? 0) >= 70 ? '#16a34a' : '#dc2626' }}>{r.score ?? 0}%</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: '.8rem' }}>{r.completed_at ? new Date(r.completed_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ Codes ═════════════════════════════════════════════ */}
          {activeTab === 'codes' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--bg)', borderRadius: 12, padding: 6, width: 'fit-content' }}>
                {[
                  { id: 'assessment', label: lang === 'ar' ? '📋 أكواد التقييم'  : '📋 Assessment Codes' },
                  { id: 'students',   label: lang === 'ar' ? '👤 أكواد الطلبة'   : '👤 Student Codes' },
                  { id: 'teachers',   label: lang === 'ar' ? '👨‍🏫 أكواد المعلمين' : '👨‍🏫 Teacher Codes' },
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
            const dayName = iso => (lang === 'ar'
              ? ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
              : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[new Date(iso).getDay()];
            const joinLink = s => s.meet_link ?? null;

            return (
              <div>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 24 }}>
                  {[
                    { icon: '📅', val: upcoming.length,                                            lbl: lang === 'ar' ? 'حصص قادمة'     : 'Upcoming'       },
                    { icon: '📆', val: upcoming.filter(s => s.session_date < nextWeek).length,     lbl: lang === 'ar' ? 'هذا الأسبوع'   : 'This week'      },
                    { icon: '👥', val: totalStudents,                                              lbl: lang === 'ar' ? 'إجمالي الطلاب' : 'Total students'  },
                    { icon: '✅', val: adminSessions.filter(s => s.status === 'completed').length, lbl: lang === 'ar' ? 'حصص منجزة'     : 'Completed'      },
                    { icon: '❌', val: adminSessions.filter(s => s.status === 'cancelled').length, lbl: lang === 'ar' ? 'ملغاة'          : 'Cancelled'      },
                  ].map(s => (
                    <div key={s.lbl} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem' }}>{s.icon}</div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--primary)' }}>{s.val}</div>
                      <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginTop: 2 }}>{s.lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Filter + Refresh + Schedule */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input className="form-input" style={{ flex: '1 1 200px', margin: 0 }}
                    placeholder={lang === 'ar' ? '🔍 فلتر حسب المعلم أو الطالب...' : '🔍 Filter by teacher or student...'}
                    value={adminTeacherFilter}
                    onChange={e => setAdminTeacherFilter(e.target.value)} />
                  <button onClick={loadAdminSessions} className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap' }}>🔄 {lang === 'ar' ? 'تحديث' : 'Refresh'}</button>
                  <button onClick={openAdminSchedModal} className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                    📅 {lang === 'ar' ? '+ جدولة حصة' : '+ Schedule'}
                  </button>
                </div>

                {/* Sub-tabs */}
                <div style={{ display: 'flex', gap: 4, background: '#f0f4f8', borderRadius: 10, padding: 4, marginBottom: 20, flexWrap: 'wrap' }}>
                  {[
                    { key: 'upcoming',  label: lang === 'ar' ? `📅 قادمة (${upcoming.length})`  : `📅 Upcoming (${upcoming.length})` },
                    { key: 'calendar',  label: lang === 'ar' ? '🗓️ التقويم'                     : '🗓️ Calendar' },
                    { key: 'past',      label: lang === 'ar' ? `✅ منتهية (${past.length})`     : `✅ Past (${past.length})` },
                    { key: 'cancelled', label: lang === 'ar' ? `❌ ملغاة (${cancelled.length})` : `❌ Cancelled (${cancelled.length})` },
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
                        <div className="empty-state card"><span className="empty-icon">📭</span><p>{lang === 'ar' ? 'لا توجد حصص قادمة' : 'No upcoming sessions'}</p></div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {upcoming.map(s => (
                            <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: '1.8rem', paddingTop: 2 }}>🎥</div>
                              <div style={{ flex: 1, minWidth: 180 }}>
                                <div style={{ fontWeight: 800, fontSize: '.97rem', color: 'var(--text)', marginBottom: 3 }}>{s.subject || (lang === 'ar' ? 'حصة عامة' : 'General session')}</div>
                                <div style={{ fontSize: '.83rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                  <span>👨‍🏫 {s.teacher_name}</span>
                                  <span>👤 {s.student_name}</span>
                                  <span>📅 {fmtDate(s.session_date, lang)}</span>
                                  <span>⏰ {s.start_time?.slice(0, 5)}</span>
                                  <span>⏱️ {s.duration_minutes} {lang === 'ar' ? 'د' : 'min'}</span>
                                </div>
                                {s.student_email && <div style={{ fontSize: '.79rem', color: 'var(--accent)', marginTop: 3 }}>✉️ {s.student_email}</div>}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start', flexShrink: 0 }}>
                                {joinLink(s) && <a href={joinLink(s)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">{lang === 'ar' ? 'ابدأ' : 'Start'} 🎥</a>}
                                <button onClick={() => { setAdminCompleteFor(s); setAdminRecordingUrl(''); }}
                                  className="btn btn-outline btn-sm" style={{ color: '#1a7c40', borderColor: '#1a7c40' }}>✅ {lang === 'ar' ? 'أنهِ' : 'Complete'}</button>
                                <button onClick={() => handleAdminCancel(s.id)} disabled={adminCancellingId === s.id}
                                  className="btn btn-outline btn-sm" style={{ color: '#e53e3e', borderColor: '#e53e3e' }}>
                                  {adminCancellingId === s.id ? '...' : (lang === 'ar' ? 'إلغاء' : 'Cancel')}
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
                          <button className="btn btn-outline btn-sm" onClick={() => setAdminWeekOffset(w => w - 1)}>{lang === 'ar' ? '← السابق' : '← Prev'}</button>
                          <span style={{ fontWeight: 800, fontSize: '.93rem', color: 'var(--primary)' }}>
                            {adminWeekOffset === 0
                              ? (lang === 'ar' ? 'الأسبوع الحالي' : 'This week')
                              : adminWeekOffset > 0
                                ? (lang === 'ar' ? `+${adminWeekOffset} أسابيع` : `+${adminWeekOffset} week${adminWeekOffset > 1 ? 's' : ''}`)
                                : (lang === 'ar' ? `${adminWeekOffset} أسابيع` : `${adminWeekOffset} week${Math.abs(adminWeekOffset) > 1 ? 's' : ''}`)}
                          </span>
                          <button className="btn btn-outline btn-sm" onClick={() => setAdminWeekOffset(w => w + 1)}>{lang === 'ar' ? 'التالي →' : 'Next →'}</button>
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
                    {adminSessTab === 'past' && (() => {
                      const attendedCount = past.filter(s => s.attended === true).length;
                      const markedCount   = past.filter(s => s.attended !== null && s.attended !== undefined).length;
                      return past.length === 0 ? (
                        <div className="empty-state card"><span className="empty-icon">📭</span><p>{lang === 'ar' ? 'لا توجد حصص منتهية' : 'No past sessions'}</p></div>
                      ) : (
                        <>
                          {markedCount > 0 && (
                            <div style={{ background: '#f0fdf4', border: '1.5px solid #6ee7b7', borderRadius: 12, padding: '10px 16px', marginBottom: 14, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: '.88rem', color: '#065f46' }}>📊 إحصائيات الحضور</span>
                              <span style={{ fontSize: '.85rem', color: '#047857' }}>✅ حضر: <strong>{attendedCount}</strong></span>
                              <span style={{ fontSize: '.85rem', color: '#b91c1c' }}>❌ غاب: <strong>{markedCount - attendedCount}</strong></span>
                              <span style={{ fontSize: '.85rem', color: '#64748b' }}>نسبة الحضور: <strong>{Math.round((attendedCount / markedCount) * 100)}%</strong></span>
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {past.slice(0, 30).map(s => (
                              <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${s.attended === true ? '#6ee7b7' : s.attended === false ? '#fca5a5' : 'var(--border)'}`, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                                <div style={{ fontSize: '1.6rem', paddingTop: 2 }}>{s.attended === true ? '✅' : s.attended === false ? '❌' : '📋'}</div>
                                <div style={{ flex: 1, minWidth: 180 }}>
                                  <div style={{ fontWeight: 800, fontSize: '.95rem', marginBottom: 3 }}>{s.subject || (lang === 'ar' ? 'حصة عامة' : 'General session')}</div>
                                  <div style={{ fontSize: '.83rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                    <span>👨‍🏫 {s.teacher_name}</span>
                                    <span>👤 {s.student_name}</span>
                                    <span>📅 {fmtDate(s.session_date, lang)}</span>
                                    <span>⏰ {s.start_time?.slice(0, 5)}</span>
                                  </div>
                                  {s.notes && <div style={{ marginTop: 6, padding: '6px 10px', background: '#fffbeb', borderRadius: 8, fontSize: '.82rem', color: '#92400e' }}>📝 {s.notes}</div>}
                                  {s.recording_url && (
                                    <div style={{ marginTop: 4 }}>
                                      <a href={s.recording_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.8rem', color: 'var(--primary)', fontWeight: 600 }}>🎬 {lang === 'ar' ? 'رابط التسجيل' : 'Recording Link'}</a>
                                    </div>
                                  )}
                                </div>
                                {/* Attendance toggle */}
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                  <button
                                    onClick={async () => {
                                      const next = s.attended === true ? null : true;
                                      await fetch('/api/bogga/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, attended: next }) });
                                      setAdminSessions(prev => prev.map(x => x.id === s.id ? { ...x, attended: next } : x));
                                    }}
                                    style={{ padding: '5px 12px', borderRadius: 20, border: 'none', background: s.attended === true ? '#16a34a' : '#e2e8f0', color: s.attended === true ? '#fff' : '#64748b', fontWeight: 700, fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                                  >✅ حضر</button>
                                  <button
                                    onClick={async () => {
                                      const next = s.attended === false ? null : false;
                                      await fetch('/api/bogga/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, attended: next }) });
                                      setAdminSessions(prev => prev.map(x => x.id === s.id ? { ...x, attended: next } : x));
                                    }}
                                    style={{ padding: '5px 12px', borderRadius: 20, border: 'none', background: s.attended === false ? '#dc2626' : '#e2e8f0', color: s.attended === false ? '#fff' : '#64748b', fontWeight: 700, fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                                  >❌ غاب</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}

                    {/* Cancelled */}
                    {adminSessTab === 'cancelled' && (
                      cancelled.length === 0 ? (
                        <div className="empty-state card"><span className="empty-icon">📭</span><p>{lang === 'ar' ? 'لا توجد حصص ملغاة' : 'No cancelled sessions'}</p></div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {cancelled.slice(0, 30).map(s => (
                            <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid var(--border)', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', opacity: .7 }}>
                              <div style={{ fontSize: '1.6rem', paddingTop: 2 }}>❌</div>
                              <div style={{ flex: 1, minWidth: 180 }}>
                                <div style={{ fontWeight: 800, fontSize: '.95rem', marginBottom: 3 }}>{s.subject || (lang === 'ar' ? 'حصة عامة' : 'General session')}</div>
                                <div style={{ fontSize: '.83rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                  <span>👨‍🏫 {s.teacher_name}</span>
                                  <span>👤 {s.student_name}</span>
                                  <span>📅 {fmtDate(s.session_date, lang)}</span>
                                  <span>⏰ {s.start_time?.slice(0, 5)}</span>
                                  <span style={{ color: '#e53e3e', fontWeight: 700 }}>{lang === 'ar' ? 'ملغاة' : 'Cancelled'}</span>
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
              <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 12 }}>{lang === 'ar' ? 'بنك الكلمات اللغوية' : 'Language Word Bank'}</h3>
              <p style={{ color: 'var(--muted)', marginBottom: 24 }}>{lang === 'ar' ? 'إدارة الكلمات المشكولة وتعديلها وإضافة الجذور والمقاطع الصوتية لكل صف' : 'Manage voweled words, edit them and add roots and syllables per grade'}</p>
              <Link href="/bogga/lexicon" className="btn btn-primary btn-lg">{lang === 'ar' ? 'فتح لوحة بنك الكلمات' : 'Open Word Bank Panel'}</Link>
            </div>
          )}

          {/* ══ Expression Theater ════════════════════════════════ */}
          {activeTab === 'simulator' && (
            <LifeSceneSimulator role="teacher" currentUser={user} />
          )}

          {/* ══ Recruitment ═══════════════════════════════════════ */}
          {activeTab === 'recruitment' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)' }}>📋 {lang === 'ar' ? 'طلبات الترشح للتوظيف' : 'Job Applications'}</h2>
                <button onClick={() => { loadApps(); loadInterviews(); }} className="btn btn-outline btn-sm">🔄 {lang === 'ar' ? 'تحديث' : 'Refresh'}</button>
              </div>
              {appsLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                </div>
              ) : apps.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">📭</span><p>{lang === 'ar' ? 'لا توجد طلبات توظيف بعد' : 'No job applications yet'}</p></div>
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
                                  title={app.is_visible_to_assistants !== false
                                    ? (lang === 'ar' ? 'مرئي للمساعدين — انقر للإخفاء' : 'Visible to assistants — click to hide')
                                    : (lang === 'ar' ? 'مخفي عن المساعدين — انقر للإظهار' : 'Hidden from assistants — click to show')}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                                    fontSize: '.73rem', fontWeight: 700,
                                    background: app.is_visible_to_assistants !== false ? '#dcfce7' : '#f1f5f9',
                                    color:      app.is_visible_to_assistants !== false ? '#166534' : '#64748b',
                                  }}
                                >
                                  {app.is_visible_to_assistants !== false
                                    ? (lang === 'ar' ? '👁️ مرئي' : '👁️ Visible')
                                    : (lang === 'ar' ? '🙈 مخفي' : '🙈 Hidden')}
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
                                ? <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />{lang === 'ar' ? 'جارٍ التحميل...' : 'Downloading...'}</>
                                : (lang === 'ar' ? '⬇️ تحميل السيرة الذاتية' : '⬇️ Download CV')}
                            </button>

                            {/* Interview status block */}
                            {latestIv && (
                              <div style={{ marginTop: 14, background: '#eef5ff', borderRadius: 10, padding: '11px 14px', fontSize: '.83rem', borderRight: '3px solid #185FA5' }}>
                                <div style={{ fontWeight: 800, color: '#185FA5', marginBottom: 6, fontSize: '.88rem' }}>📅 {lang === 'ar' ? 'المقابلة المجدولة' : 'Scheduled Interview'}</div>
                                <div style={{ color: '#1a2d4a', lineHeight: 1.8 }}>
                                  📆 {fmtDate(latestIv.interview_date, lang)} · ⏰ {latestIv.start_time?.slice(0, 5)} · 👤 {latestIv.interviewer_name}
                                </div>
                                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                  <span style={{ padding: '3px 11px', borderRadius: 20, fontSize: '.76rem', fontWeight: 700, background: (IV_COLORS[latestIv.candidate_response] ?? '#6b7280') + '22', color: IV_COLORS[latestIv.candidate_response] ?? '#6b7280' }}>
                                    {IV_LABELS[latestIv.candidate_response] ?? latestIv.candidate_response}
                                  </span>
                                  {cancellingInterview === latestIv.id
                                    ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2, borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                                    : <button onClick={() => cancelInterview(latestIv.id, app.id)} style={{ fontSize: '.76rem', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>✕ {lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                                  }
                                </div>
                                {latestIv.candidate_response === 'reschedule_requested' && latestIv.reschedule_reason && (
                                  <div style={{ marginTop: 10, padding: '9px 12px', background: '#fff8e1', borderRadius: 8, border: '1px solid #ffe082', color: '#7a4f00', fontSize: '.83rem', lineHeight: 1.7 }}>
                                    💬 <strong>{lang === 'ar' ? 'سبب التعديل:' : 'Reason:'}</strong> {latestIv.reschedule_reason}
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
                                📅 {latestIv ? (lang === 'ar' ? 'إعادة جدولة' : 'Reschedule') : (lang === 'ar' ? 'جدولة مقابلة' : 'Schedule Interview')}
                              </button>
                              <button onClick={() => deleteApp(app.id, app.name)} disabled={deletingApp === app.id} className="btn btn-sm btn-danger" style={{ fontSize: '.78rem' }}>
                                {deletingApp === app.id ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : (lang === 'ar' ? '🗑️ حذف' : '🗑️ Delete')}
                              </button>
                            </>}
                          </div>
                        </div>
                        <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 10 }}>
                          {new Date(app.created_at).toLocaleString(lang === 'ar' ? 'en-GB' : 'en-GB')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ Logbook ════════════════════════════════════════════ */}
          {activeTab === 'logbook' && isSuperAdmin && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                  📓 {lang === 'ar' ? 'كراس الدروس الرقمي' : 'Digital Lesson Logbook'}
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
                  {lang === 'ar'
                    ? 'اعرض كراس أي معلم، تابع خططه وتقدمه، وأضف توجيهات تربوية تصله فوراً'
                    : 'View any teacher\'s logbook, track lesson plans & progress, and send instant pedagogical guidance'}
                </p>
              </div>
              <div style={{
                background: '#fff', borderRadius: 20,
                border: '1.5px solid var(--border)',
                padding: '24px',
                boxShadow: '0 2px 12px rgba(24,95,165,.05)',
              }}>
                <LessonLogbookView lang={lang} />
              </div>
            </div>
          )}

          {/* ══ Stories ════════════════════════════════════════════ */}
          {activeTab === 'stories' && (
            <StoriesTab lang={lang} />
          )}

          {/* ══ Teacher Space ══════════════════════════════════════ */}
          {activeTab === 'space' && (
            <TeacherSpace currentUser={user} />
          )}

          {/* ══ Parent Messages ════════════════════════════════════ */}
          {activeTab === 'messages' && (
            <div>
              <div style={{ marginBottom: 22 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                  📩 {lang === 'ar' ? 'رسائل الأولياء' : 'Parent Messages'}
                  {parentMessages.filter(m => !m.is_read).length > 0 && (
                    <span style={{ background: '#dc2626', color: '#fff', fontSize: '.75rem',
                      borderRadius: 20, padding: '2px 9px', marginRight: 10, fontWeight: 700 }}>
                      {parentMessages.filter(m => !m.is_read).length} {lang === 'ar' ? 'جديدة' : 'new'}
                    </span>
                  )}
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
                  {lang === 'ar' ? 'رسائل أولياء الأمور المُرسَلة عبر الموقع' : 'Messages sent by parents through the website'}
                </p>
              </div>
              {!msgsLoaded ? (
                <div style={{ textAlign:'center', padding:'48px 0', color:'var(--muted)' }}>جارٍ التحميل...</div>
              ) : parentMessages.length === 0 ? (
                <div style={{ textAlign:'center', padding:'56px 24px', background:'#fff',
                  borderRadius:16, border:'1.5px solid var(--border)' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📭</div>
                  <p style={{ color:'var(--muted)', fontWeight:600 }}>
                    {lang === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}
                  </p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {parentMessages.map(m => (
                    <div key={m.id} style={{
                      background:'#fff', borderRadius:14,
                      border:`1.5px solid ${m.is_read ? 'var(--border)' : '#c4b5fd'}`,
                      padding:'16px 20px',
                      borderRight:`4px solid ${m.is_read ? '#e2e8f0' : '#7c3aed'}`,
                      opacity: m.is_read ? .8 : 1,
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                        <div>
                          <div style={{ fontWeight:800, fontSize:'.97rem', color:'#1e293b' }}>
                            {m.is_read ? '' : '🔵 '}{m.parent_name}
                            {m.student_name && (
                              <span style={{ fontWeight:600, color:'#7c3aed', fontSize:'.85rem', marginRight:8 }}>
                                — {lang === 'ar' ? 'طالب:' : 'student:'} {m.student_name}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize:'.8rem', color:'#94a3b8', marginTop:3 }}>
                            {new Date(m.created_at).toLocaleString('en-GB', { dateStyle:'medium', timeStyle:'short' })}
                            {m.phone && <span style={{ marginRight:12 }}>📞 <a href={`tel:${m.phone}`} style={{ color:'var(--primary)' }}>{m.phone}</a></span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {!m.is_read && (
                            <button onClick={() => markMsgRead(m.id)}
                              style={{ background:'#f3f0ff', border:'none', borderRadius:8,
                                padding:'5px 12px', fontSize:'.78rem', fontWeight:700,
                                color:'#7c3aed', cursor:'pointer' }}>
                              ✓ {lang === 'ar' ? 'تمّ الاطلاع' : 'Mark read'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (!window.confirm(lang === 'ar' ? 'هل تريد حذف هذه الرسالة؟' : 'Delete this message?')) return;
                              fetch('/api/contact/supervisor', {
                                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: m.id }),
                              });
                              setParentMessages(prev => prev.filter(x => x.id !== m.id));
                            }}
                            style={{ background:'#fee2e2', border:'none', borderRadius:8,
                              padding:'5px 12px', fontSize:'.78rem', fontWeight:700,
                              color:'#b91c1c', cursor:'pointer' }}>
                            🗑 {lang === 'ar' ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      <div style={{ marginTop:12, padding:'12px 14px', background:'#fafafa',
                        borderRadius:10, fontSize:'.9rem', color:'#334155', lineHeight:1.7,
                        borderRight:'3px solid #e2e8f0' }}>
                        {m.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ Financials ════════════════════════════════════════ */}
          {activeTab === 'financials' && isSuperAdmin && (
            <FinancialsTab lang={lang} />
          )}

          {/* ══ Admins ════════════════════════════════════════════ */}
          {activeTab === 'admins' && isSuperAdmin && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>👑 {tr('admin.admins.title')}</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>{lang === 'ar' ? `حد أقصى 2 — ${admins.length}/2 مستخدَم` : `Max 2 — ${admins.length}/2 used`}</p>
                </div>
                <button onClick={() => { setShowAddModal(true); setAdminMsg(null); }} disabled={admins.length >= 2} className="btn btn-primary" style={{ opacity: admins.length >= 2 ? .5 : 1 }}>
                  + {lang === 'ar' ? 'إضافة مشرف مساعد جديد' : 'Add New Assistant Admin'}
                </button>
              </div>
              {admins.length >= 2 && <div className="alert alert-info" style={{ marginBottom: 18 }}>⚠️ {lang === 'ar' ? 'وصلت للحد الأقصى (2 مشرفين).' : 'You have reached the maximum limit (2 admins).'}</div>}
              {adminMsg && (
                <div className={`alert alert-${adminMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 18 }}>
                  {adminMsg.text}
                  {adminMsg.tempPassword && (
                    <div style={{ marginTop: 10, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '10px 14px' }}>
                      <strong>{lang === 'ar' ? 'كلمة المرور المؤقتة:' : 'Temporary Password:'}</strong>
                      <span dir="ltr" style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', marginRight: 8, letterSpacing: '.08em', userSelect: revealedPwds.has('adminTempPwd') ? 'all' : 'none', color: '#b56a00' }}>
                        {revealedPwds.has('adminTempPwd') ? adminMsg.tempPassword : '••••••••••••'}
                      </span>
                      <button onClick={() => togglePwd('adminTempPwd')} title={revealedPwds.has('adminTempPwd') ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'إظهار' : 'Show')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', marginRight: 6, padding: 2 }}>{revealedPwds.has('adminTempPwd') ? '🙈' : '👁️'}</button>
                      <button onClick={() => navigator.clipboard.writeText(adminMsg.tempPassword)} title={lang === 'ar' ? 'نسخ' : 'Copy'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 2 }}>📋</button>
                    </div>
                  )}
                </div>
              )}
              {adminsLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} /></div>
              ) : admins.length === 0 ? (
                <div className="empty-state card"><span className="empty-icon">👥</span><p>{lang === 'ar' ? 'لا يوجد مشرفون مساعدون بعد' : 'No assistant admins yet'}</p></div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead><tr><th>{lang === 'ar' ? 'الاسم' : 'Name'}</th><th>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th><th>{lang === 'ar' ? 'حالة الحساب' : 'Account Status'}</th><th>{lang === 'ar' ? 'آخر نشاط' : 'Last Seen'}</th><th>{lang === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</th><th>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th></tr></thead>
                    <tbody>
                      {admins.map(a => {
                        const permsOpen = openPermsFor === a.id;
                        return (
                          <Fragment key={a.id}>
                            <tr>
                              <td style={{ fontWeight: 700 }}>{a.name}</td>
                              <td style={{ direction: 'ltr', textAlign: 'right' }}>{a.email}</td>
                              <td>
                                <span style={{
                                  padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 700,
                                  background: a.status === 'suspended' ? '#fee2e2' : '#dcfce7',
                                  color:      a.status === 'suspended' ? '#b91c1c' : '#166534',
                                }}>
                                  {a.status === 'suspended' ? (lang === 'ar' ? '🚫 موقوف' : '🚫 Suspended') : (lang === 'ar' ? '✅ مفعَّل' : '✅ Active')}
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
                              <td style={{ color: 'var(--muted)', fontSize: '.83rem' }}>{new Date(a.created_at).toLocaleDateString(lang === 'ar' ? 'en-GB' : 'en-GB')}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <button onClick={() => openActivityModal(a)} className="btn btn-sm" style={{ background: '#eef5ff', color: '#185FA5', border: 'none' }}>
                                    📊 {lang === 'ar' ? 'النشاط' : 'Activity'}
                                  </button>
                                  <button
                                    onClick={() => toggleAdminPermsPanel(a.id)}
                                    className="btn btn-sm"
                                    style={{ background: permsOpen ? '#7c3aed' : '#f3e8ff', color: permsOpen ? '#fff' : '#7c3aed', border: 'none', fontWeight: 700 }}
                                  >
                                    🔐 {lang === 'ar' ? 'الصلاحيات' : 'Permissions'}
                                  </button>
                                  <button
                                    onClick={() => handleSuspendAdmin(a.id, a.status ?? 'active')}
                                    disabled={suspendingId === a.id}
                                    className="btn btn-sm"
                                    style={{ background: a.status === 'suspended' ? '#1a7c40' : '#f59e0b', color: '#fff', border: 'none' }}
                                  >
                                    {suspendingId === a.id
                                      ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                      : a.status === 'suspended'
                                        ? (lang === 'ar' ? '✅ تفعيل' : '✅ Activate')
                                        : (lang === 'ar' ? '⏸ إيقاف' : '⏸ Suspend')}
                                  </button>
                                  <button onClick={() => handleDeleteAdmin(a.id, a.name)} disabled={deletingId === a.id} className="btn btn-sm btn-danger">
                                    {deletingId === a.id ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : (lang === 'ar' ? '🗑️ حذف' : '🗑️ Delete')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {permsOpen && (
                              <tr>
                                <td colSpan={6} style={{ background: '#faf5ff', padding: '16px 20px', borderBottom: '2px solid #e9d5ff' }}>
                                  {permsLoading ? (
                                    <div style={{ textAlign: 'center', padding: 12 }}><span className="spinner" style={{ borderTopColor: '#7c3aed', borderColor: '#e9d5ff' }} /></div>
                                  ) : (
                                    <div>
                                      <p style={{ fontWeight: 700, color: '#7c3aed', marginBottom: 12, fontSize: '.9rem' }}>
                                        🔐 {lang === 'ar' ? `صلاحيات ${a.name}` : `${a.name}'s Permissions`}
                                      </p>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                        {CONTROLLABLE.map(tabKey => {
                                          const isAllowed = allPerms[a.id]?.[tabKey] === true;
                                          return (
                                            <button
                                              key={tabKey}
                                              onClick={() => togglePerm(a.id, tabKey)}
                                              style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                                                fontFamily: 'inherit', fontWeight: 700, fontSize: '.82rem',
                                                background: isAllowed ? '#7c3aed' : '#e9d5ff',
                                                color: isAllowed ? '#fff' : '#7c3aed',
                                                transition: 'background .18s, color .18s',
                                              }}
                                            >
                                              <span style={{
                                                width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                                                background: isAllowed ? '#a78bfa' : '#c4b5fd',
                                                border: isAllowed ? '2px solid #fff' : '2px solid #a78bfa',
                                                display: 'inline-block',
                                              }} />
                                              {lang === 'ar' ? TAB_NAMES[tabKey] : TAB_NAMES_EN[tabKey]}
                                              <span style={{ fontSize: '.75rem', opacity: .85 }}>{isAllowed ? '✓' : '✗'}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                      <p style={{ marginTop: 10, fontSize: '.78rem', color: '#9f67e4' }}>
                                        {lang === 'ar' ? '* اضغط على أي صلاحية لتفعيلها أو إيقافها' : '* Click any permission to toggle it'}
                                      </p>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Supervisors sub-section ── */}
              <div style={{ marginTop: 36, borderTop: '2px solid var(--border)', paddingTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontWeight: 800, color: '#7c3aed', marginBottom: 4 }}>🧑‍💼 {lang === 'ar' ? 'المرشدون التربويون' : 'Educational Supervisors'}</h2>
                    <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>{lang === 'ar' ? 'لوحة متابعة — للقراءة فقط' : 'Monitoring dashboard — read-only access'}</p>
                  </div>
                  <button onClick={() => { setShowAddSupervisor(true); setSupervisorMsg(null); }} className="btn btn-primary" style={{ background: '#7c3aed' }}>
                    + {lang === 'ar' ? 'إضافة مرشد تربوي' : 'Add Supervisor'}
                  </button>
                </div>

                {supervisorMsg && (
                  <div className={`alert alert-${supervisorMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 18 }}>
                    {supervisorMsg.text}
                    {supervisorMsg.tempPassword && (
                      <div style={{ marginTop: 10, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '10px 14px' }}>
                        <strong>{lang === 'ar' ? 'كلمة المرور المؤقتة:' : 'Temporary Password:'}</strong>
                        <span dir="ltr" style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', marginRight: 8, letterSpacing: '.08em', userSelect: revealedPwds.has('supervisorTempPwd') ? 'all' : 'none', color: '#b56a00' }}>
                          {revealedPwds.has('supervisorTempPwd') ? supervisorMsg.tempPassword : '••••••••••••'}
                        </span>
                        <button onClick={() => togglePwd('supervisorTempPwd')} title={revealedPwds.has('supervisorTempPwd') ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'إظهار' : 'Show')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', marginRight: 6, padding: 2 }}>{revealedPwds.has('supervisorTempPwd') ? '🙈' : '👁️'}</button>
                        <button onClick={() => navigator.clipboard.writeText(supervisorMsg.tempPassword)} title={lang === 'ar' ? 'نسخ' : 'Copy'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 2 }}>📋</button>
                      </div>
                    )}
                  </div>
                )}

                {supervisorsLoading ? (
                  <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" style={{ borderTopColor: '#7c3aed', borderColor: 'var(--border)' }} /></div>
                ) : supervisors.length === 0 ? (
                  <div className="empty-state card"><span className="empty-icon">🧑‍💼</span><p>{lang === 'ar' ? 'لا يوجد مرشدون تربويون بعد' : 'No supervisors yet'}</p></div>
                ) : (
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                          <th>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                          <th>{lang === 'ar' ? 'حالة الحساب' : 'Status'}</th>
                          <th>{lang === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</th>
                          <th>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supervisors.map(s => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 700 }}>{s.name}</td>
                            <td style={{ direction: 'ltr', textAlign: 'right' }}>{s.email}</td>
                            <td>
                              <span style={{
                                padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 700,
                                background: s.status === 'suspended' ? '#fee2e2' : '#ede9fe',
                                color:      s.status === 'suspended' ? '#b91c1c' : '#6d28d9',
                              }}>
                                {s.status === 'suspended' ? (lang === 'ar' ? '🚫 موقوف' : '🚫 Suspended') : (lang === 'ar' ? '✅ مفعَّل' : '✅ Active')}
                              </span>
                            </td>
                            <td style={{ color: 'var(--muted)', fontSize: '.83rem' }}>{new Date(s.created_at).toLocaleDateString(lang === 'ar' ? 'en-GB' : 'en-GB')}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => handleSuspendSupervisor(s.id, s.status ?? 'active')}
                                  disabled={suspendingSupervisorId === s.id}
                                  className="btn btn-sm"
                                  style={{ background: s.status === 'suspended' ? '#1a7c40' : '#f59e0b', color: '#fff', border: 'none' }}
                                >
                                  {suspendingSupervisorId === s.id
                                    ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                    : s.status === 'suspended'
                                      ? (lang === 'ar' ? '✅ تفعيل' : '✅ Activate')
                                      : (lang === 'ar' ? '⏸ إيقاف' : '⏸ Suspend')}
                                </button>
                                <button onClick={() => handleDeleteSupervisor(s.id, s.name)} disabled={deletingSupervisorId === s.id} className="btn btn-sm btn-danger">
                                  {deletingSupervisorId === s.id ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : (lang === 'ar' ? '🗑️ حذف' : '🗑️ Delete')}
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
            </div>
          )}

          {/* ══ Results ═══════════════════════════════════════════ */}
          {activeTab === 'results' && (
            <div>
              {/* Stats */}
              <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', marginBottom: 24 }}>
                {[
                  { icon: '📋', val: resultsStats.total,          lbl: tr('admin.overview.totalAssessments') },
                  { icon: '✅', val: resultsStats.passed,         lbl: lang === 'ar' ? 'ناجحون (≥70%)' : 'Passed (≥70%)' },
                  { icon: '📊', val: (resultsStats.avg ?? 0) + '%', lbl: lang === 'ar' ? 'متوسط النتائج' : 'Average Score' },
                  { icon: '❌', val: (resultsStats.total ?? 0) - (resultsStats.passed ?? 0), lbl: lang === 'ar' ? 'دون 70%' : 'Below 70%' },
                ].map(s => (
                  <div key={s.lbl} className="stat-card">
                    <span className="stat-icon">{s.icon}</span>
                    <div><div className="stat-val">{s.val}</div><div className="stat-lbl">{s.lbl}</div></div>
                  </div>
                ))}
              </div>

              {/* Chart — score distribution */}
              {resultsStats.total > 0 && (() => {
                const dist  = resultsStats.scoreDist ?? {};
                const maxV  = Math.max(...Object.values(dist), 1);
                const bars  = [
                  { label: '0–29%',   key: '0-29',   color: '#dc2626' },
                  { label: '30–49%',  key: '30-49',  color: '#ea580c' },
                  { label: '50–69%',  key: '50-69',  color: '#ca8a04' },
                  { label: '70–89%',  key: '70-89',  color: '#16a34a' },
                  { label: '90–100%', key: '90-100', color: '#15803d' },
                ];
                return (
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 14, color: 'var(--primary)' }}>
                      📊 {lang === 'ar' ? 'توزيع الدرجات' : 'Score Distribution'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {bars.map(b => {
                        const val = dist[b.key] ?? 0;
                        const pct = Math.round((val / maxV) * 100);
                        return (
                          <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 60, fontSize: '.78rem', color: 'var(--muted)', flexShrink: 0, textAlign: 'left' }}>{b.label}</span>
                            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: 20, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, background: b.color, height: '100%', borderRadius: 6, transition: 'width .4s', minWidth: val > 0 ? 4 : 0 }} />
                            </div>
                            <span style={{ width: 28, fontSize: '.82rem', fontWeight: 700, color: b.color, flexShrink: 0 }}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Filters */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>🔍 {lang === 'ar' ? 'بحث بالاسم' : 'Search by name'}</label>
                    <input
                      className="form-input" style={{ margin: 0 }}
                      placeholder={lang === 'ar' ? 'اسم الطالب...' : 'Student name...'}
                      value={resultsSearch}
                      onChange={e => setResultsSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && loadResults(1, resultsSearch, resultsLevel, resultsMin, resultsMax)}
                    />
                  </div>
                  <div style={{ flex: '0 1 130px' }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{lang === 'ar' ? 'المستوى' : 'Level'}</label>
                    <select className="form-input" style={{ margin: 0 }} value={resultsLevel} onChange={e => setResultsLevel(e.target.value)}>
                      <option value="">{lang === 'ar' ? 'كل المستويات' : 'All levels'}</option>
                      {[1,2,3,4,5,6,7].map(l => <option key={l} value={l}>{lang === 'ar' ? `المستوى ${l}` : `Level ${l}`}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: '0 1 110px' }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{lang === 'ar' ? 'الدرجة من' : 'Min score'}</label>
                    <input className="form-input" style={{ margin: 0 }} type="number" min="0" max="100" placeholder="0" value={resultsMin} onChange={e => setResultsMin(e.target.value)} />
                  </div>
                  <div style={{ flex: '0 1 110px' }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{lang === 'ar' ? 'الدرجة إلى' : 'Max score'}</label>
                    <input className="form-input" style={{ margin: 0 }} type="number" min="0" max="100" placeholder="100" value={resultsMax} onChange={e => setResultsMax(e.target.value)} />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => loadResults(1, resultsSearch, resultsLevel, resultsMin, resultsMax)}
                    disabled={resultsLoading}
                  >
                    {resultsLoading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : `🔍 ${lang === 'ar' ? 'بحث' : 'Search'}`}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setResultsSearch(''); setResultsLevel(''); setResultsMin(''); setResultsMax('');
                      loadResults(1, '', '', '', '');
                    }}
                  >
                    {lang === 'ar' ? 'مسح' : 'Clear'}
                  </button>
                  <button className="btn btn-sm" style={{ background: '#166534', color: '#fff' }}
                    onClick={exportCsv} disabled={resultsExporting}>
                    {resultsExporting ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : `⬇ ${lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}`}
                  </button>
                  {sheetsUrl && (
                    <a href={sheetsUrl} target="_blank" rel="noopener noreferrer"
                      className="btn btn-sm"
                      style={{ background: '#1a7c40', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                      {lang === 'ar' ? 'فتح Google Sheet' : 'Open Google Sheet'}
                    </a>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                        {['#', lang === 'ar' ? 'اسم الطالب' : 'Student', lang === 'ar' ? 'المستوى' : 'Level', lang === 'ar' ? 'الدرجة' : 'Score', lang === 'ar' ? 'الحالة' : 'Status', lang === 'ar' ? 'التاريخ' : 'Date', lang === 'ar' ? 'ملاحظات' : 'Notes'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)', fontSize: '.82rem' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultsLoading ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}><span className="spinner" /></td></tr>
                      ) : results.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>{tr('admin.results.noResults')}</td></tr>
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
                                {lang === 'ar' ? 'المستوى' : 'Level'} {r.level ?? '—'}
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
                                {passed ? (lang === 'ar' ? '✅ ناجح' : '✅ Passed') : (lang === 'ar' ? '❌ دون المعدل' : '❌ Below average')}
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: '.85rem' }}>
                              {r.completed_at ? new Date(r.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td style={{ padding: '8px 16px', minWidth: 160 }}>
                              {editingNoteId === r.id ? (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <input
                                    autoFocus
                                    className="form-input"
                                    style={{ margin: 0, fontSize: '.82rem', padding: '4px 8px' }}
                                    value={editNoteText}
                                    onChange={e => setEditNoteText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveNote(r.id, editNoteText); if (e.key === 'Escape') setEditingNoteId(null); }}
                                  />
                                  <button className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: '.78rem' }}
                                    onClick={() => saveNote(r.id, editNoteText)} disabled={noteSaving}>
                                    {noteSaving ? '...' : '✓'}
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                                  onClick={() => { setEditingNoteId(r.id); setEditNoteText(r.notes ?? ''); }}>
                                  <span style={{ fontSize: '.82rem', color: r.notes ? '#374151' : 'var(--muted)', flex: 1 }}>
                                    {r.notes || (lang === 'ar' ? '+ إضافة ملاحظة' : '+ Add note')}
                                  </span>
                                  <span style={{ fontSize: '.75rem', color: 'var(--muted)', opacity: 0.6 }}>✏️</span>
                                </div>
                              )}
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
                      {lang === 'ar'
                        ? `عرض ${(resultsPage - 1) * 50 + 1}–${Math.min(resultsPage * 50, resultsTotal)} من ${resultsTotal}`
                        : `Showing ${(resultsPage - 1) * 50 + 1}–${Math.min(resultsPage * 50, resultsTotal)} of ${resultsTotal}`}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" disabled={resultsPage === 1}
                        onClick={() => loadResults(resultsPage - 1, resultsSearch, resultsLevel, resultsMin, resultsMax)}>
                        {lang === 'ar' ? '← السابق' : '← Previous'}
                      </button>
                      <button className="btn btn-ghost btn-sm" disabled={resultsPage * 50 >= resultsTotal}
                        onClick={() => loadResults(resultsPage + 1, resultsSearch, resultsLevel, resultsMin, resultsMax)}>
                        {lang === 'ar' ? 'التالي →' : 'Next →'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ Users Directory ══════════════════════════════════ */}
          {/* ══ Teachers & Staff Management ══════════════════════════════════ */}
          {activeTab === 'teachers_mgmt' && isSuperAdmin && (() => {
            const ROLE_BADGES = {
              teacher:    { label: tr('admin.users.teacher'),    bg: '#dcfce7', color: '#166534' },
              supervisor: { label: tr('admin.users.supervisor'), bg: '#ede9fe', color: '#6d28d9' },
              admin:      { label: tr('admin.users.admin'),      bg: '#fef3c7', color: '#92400e' },
            };
            const STAFF_ROLES = ['teacher', 'supervisor', 'admin'];
            const filtered = usersList
              .filter(u => STAFF_ROLES.includes(u.role))
              .filter(u => usersRoleFilter === 'all' || u.role === usersRoleFilter)
              .filter(u => {
                const q = usersSearch.trim().toLowerCase();
                return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
              });
            const staffCount = usersList.filter(u => STAFF_ROLES.includes(u.role)).length;

            return (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                    👨‍🏫 {lang === 'ar' ? 'إدارة المعلمين والمشرفين' : 'Teachers & Supervisors'}
                  </h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
                    {lang === 'ar' ? `${staffCount} عضو في الفريق التعليمي` : `${staffCount} staff members`}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input className="form-input" style={{ flex: '1 1 220px', margin: 0 }}
                    placeholder={lang === 'ar' ? 'بحث بالاسم أو البريد…' : 'Search by name or email…'}
                    value={usersSearch} onChange={e => setUsersSearch(e.target.value)} />
                  {['all', 'teacher', 'supervisor', 'admin'].map(r => (
                    <button key={r} onClick={() => setUsersRoleFilter(r)}
                      style={{
                        padding: '7px 16px', borderRadius: 20, border: '1.5px solid var(--border)',
                        fontWeight: 600, fontSize: '.82rem', cursor: 'pointer',
                        background: usersRoleFilter === r ? 'var(--primary)' : '#fff',
                        color:      usersRoleFilter === r ? '#fff' : '#334155',
                        transition: 'all .15s',
                      }}>
                      {r === 'all'          ? (lang === 'ar' ? 'الكل' : 'All')
                       : r === 'teacher'    ? (lang === 'ar' ? 'المعلمون' : 'Teachers')
                       : r === 'supervisor' ? (lang === 'ar' ? 'المرشدون' : 'Supervisors')
                       :                     (lang === 'ar' ? 'المساعدون' : 'Asst. Admins')}
                      {r !== 'all' && (
                        <span style={{ marginRight: 5, opacity: .65 }}>
                          ({usersList.filter(u => u.role === r).length})
                        </span>
                      )}
                    </button>
                  ))}
                  <button onClick={loadUsers} style={{ background: '#eef5ff', color: 'var(--primary)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '7px 14px', fontWeight: 600, fontSize: '.82rem', cursor: 'pointer' }}>
                    🔄 {lang === 'ar' ? 'تحديث' : 'Refresh'}
                  </button>
                  {usersList.filter(u => STAFF_ROLES.includes(u.role) && !u.password).length > 0 && (
                    <button onClick={handleBulkReset} disabled={bulkResetting}
                      title={lang === 'ar' ? 'يعيد ضبط كلمات سر الحسابات التي لم تُعرض كلمة سرها بعد' : 'Resets passwords for accounts without a stored password'}
                      style={{
                        background: bulkResetting ? '#f1f5f9' : '#fffbeb', color: bulkResetting ? '#94a3b8' : '#92400e',
                        border: '1.5px solid #fde68a', borderRadius: 10, padding: '7px 14px',
                        fontWeight: 700, fontSize: '.82rem', cursor: bulkResetting ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                      {bulkResetting
                        ? (lang === 'ar' ? '⏳ جارٍ الكشف…' : '⏳ Processing…')
                        : (lang === 'ar'
                            ? `🔑 كشف كلمات السر (${usersList.filter(u => STAFF_ROLES.includes(u.role) && !u.password).length})`
                            : `🔑 Reveal Passwords (${usersList.filter(u => STAFF_ROLES.includes(u.role) && !u.password).length})`)}
                    </button>
                  )}
                </div>

                {usersLoading ? (
                  <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} /></div>
                ) : filtered.length === 0 ? (
                  <div className="empty-state card"><span className="empty-icon">👨‍🏫</span><p>{lang === 'ar' ? 'لا يوجد معلمون أو مشرفون' : 'No teachers or supervisors found'}</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtered.map(u => {
                      const badge     = ROLE_BADGES[u.role] ?? ROLE_BADGES.teacher;
                      const isEditing = editingUser?.id === u.id;
                      const dateJoined = new Date(u.created_at).toLocaleDateString('en-GB');
                      return (
                        <div key={u.id} style={{ background: '#fff', borderRadius: 16, border: '1.5px solid var(--border)', padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 1px 6px rgba(24,95,165,.05)' }}>
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.name} style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '2px solid var(--border)' }} />
                          ) : (
                            <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: badge.bg, color: badge.color, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                              {(u.name ?? '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                <input className="form-input" style={{ margin: 0, padding: '5px 10px', fontSize: '.9rem', width: 160 }}
                                  value={editingUser.name} onChange={e => setEditingUser(p => ({ ...p, name: e.target.value }))} autoFocus />
                                <button onClick={() => handleUpdateName(u.id)} disabled={savingUserId === u.id} className="btn btn-sm btn-primary" style={{ padding: '5px 12px' }}>
                                  {savingUserId === u.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : (lang === 'ar' ? 'حفظ' : 'Save')}
                                </button>
                                <button onClick={() => setEditingUser(null)} className="btn btn-sm btn-ghost" style={{ padding: '5px 8px' }}>✕</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '.97rem', color: '#1e293b' }}>{u.name}</span>
                                <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, background: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.label}</span>
                              </div>
                            )}
                            <div dir="ltr" style={{ textAlign: lang === 'ar' ? 'right' : 'left', color: '#475569', fontSize: '.85rem', marginBottom: 3 }}>{u.email}</div>
                            <div style={{ color: '#94a3b8', fontSize: '.78rem' }}>
                              📅 {dateJoined}
                              {u.last_sign_in && <span style={{ marginRight: 10 }}>· {lang === 'ar' ? 'آخر دخول:' : 'Last:'} {new Date(u.last_sign_in).toLocaleDateString('en-GB')}</span>}
                            </div>
                          </div>
                          <div style={{ flex: '0 1 220px', minWidth: 160 }}>
                            <div style={{ fontSize: '.72rem', fontWeight: 600, color: '#64748b', marginBottom: 5 }}>🔑 {lang === 'ar' ? 'كلمة السر' : 'Password'}</div>
                            {u.password ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '7px 10px' }}>
                                <span dir="ltr" style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '.92rem', letterSpacing: '.04em', userSelect: revealedPwds.has(u.id) ? 'all' : 'none', color: '#b45309', flex: 1 }}>
                                  {revealedPwds.has(u.id) ? u.password : '••••••••'}
                                </span>
                                <button onClick={() => togglePwd(u.id)} title={revealedPwds.has(u.id) ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'إظهار' : 'Show')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '.95rem', lineHeight: 1, padding: 2 }}>{revealedPwds.has(u.id) ? '🙈' : '👁️'}</button>
                                <button onClick={() => navigator.clipboard.writeText(u.password)} title={lang === 'ar' ? 'نسخ' : 'Copy'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 2 }}>📋</button>
                              </div>
                            ) : (
                              <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 10, padding: '7px 10px', color: '#94a3b8', fontSize: '.82rem', fontStyle: 'italic' }}>
                                {lang === 'ar' ? 'غير متاحة — اضغط إعادة الضبط' : 'Unknown — click Reset'}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
                            <button onClick={() => handleResetPassword(u.id)} disabled={resettingPwdId === u.id}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fffbeb', color: '#92400e', border: '1.5px solid #fde68a', borderRadius: 9, padding: '6px 12px', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              {resettingPwdId === u.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : '🔑'} {lang === 'ar' ? 'إعادة كلمة السر' : 'Reset Password'}
                            </button>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {!isEditing && (
                                <button onClick={() => setEditingUser({ id: u.id, name: u.name })}
                                  style={{ flex: 1, background: '#eef5ff', color: '#185FA5', border: '1.5px solid #bfdbfe', borderRadius: 9, padding: '5px 10px', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  ✏️ {lang === 'ar' ? 'تعديل' : 'Edit'}
                                </button>
                              )}
                              <button onClick={() => handleDeleteUser(u.id, u.name)} disabled={deletingUserId === u.id}
                                style={{ flex: 1, background: '#fee2e2', color: '#b91c1c', border: '1.5px solid #fca5a5', borderRadius: 9, padding: '5px 10px', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {deletingUserId === u.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : `🗑️ ${lang === 'ar' ? 'حذف' : 'Delete'}`}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ══ Students Management ══════════════════════════════════════════════ */}
          {activeTab === 'students_mgmt' && isSuperAdmin && (() => {
            const STUDENT_BADGE = { label: tr('admin.users.student'), bg: '#dbeafe', color: '#1d4ed8' };
            const filtered = usersList
              .filter(u => u.role === 'student')
              .filter(u => {
                const q = usersSearch.trim().toLowerCase();
                return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
              });
            const studentCount = usersList.filter(u => u.role === 'student').length;

            return (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                    🎓 {lang === 'ar' ? 'إدارة الطلاب' : 'Student Management'}
                  </h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
                    {lang === 'ar' ? `${studentCount} طالب مسجّل` : `${studentCount} registered students`}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input className="form-input" style={{ flex: '1 1 220px', margin: 0 }}
                    placeholder={lang === 'ar' ? 'بحث بالاسم أو البريد…' : 'Search by name or email…'}
                    value={usersSearch} onChange={e => setUsersSearch(e.target.value)} />
                  <button onClick={loadUsers} style={{ background: '#eef5ff', color: 'var(--primary)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '7px 14px', fontWeight: 600, fontSize: '.82rem', cursor: 'pointer' }}>
                    🔄 {lang === 'ar' ? 'تحديث' : 'Refresh'}
                  </button>
                  {usersList.filter(u => u.role === 'student' && !u.password).length > 0 && (
                    <button onClick={handleBulkReset} disabled={bulkResetting}
                      title={lang === 'ar' ? 'يعيد ضبط كلمات سر الحسابات التي لم تُعرض كلمة سرها بعد' : 'Resets passwords for accounts without a stored password'}
                      style={{
                        background: bulkResetting ? '#f1f5f9' : '#fffbeb', color: bulkResetting ? '#94a3b8' : '#92400e',
                        border: '1.5px solid #fde68a', borderRadius: 10, padding: '7px 14px',
                        fontWeight: 700, fontSize: '.82rem', cursor: bulkResetting ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                      {bulkResetting
                        ? (lang === 'ar' ? '⏳ جارٍ الكشف…' : '⏳ Processing…')
                        : (lang === 'ar'
                            ? `🔑 كشف كلمات السر (${usersList.filter(u => u.role === 'student' && !u.password).length})`
                            : `🔑 Reveal Passwords (${usersList.filter(u => u.role === 'student' && !u.password).length})`)}
                    </button>
                  )}
                </div>

                {usersLoading ? (
                  <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} /></div>
                ) : filtered.length === 0 ? (
                  <div className="empty-state card"><span className="empty-icon">🎓</span><p>{lang === 'ar' ? 'لا يوجد طلاب مسجّلون' : 'No students found'}</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtered.map(u => {
                      const badge     = STUDENT_BADGE;
                      const isEditing = editingUser?.id === u.id;
                      const dateJoined = new Date(u.created_at).toLocaleDateString('en-GB');
                      return (
                        <div key={u.id} style={{ background: '#fff', borderRadius: 16, border: '1.5px solid var(--border)', padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 1px 6px rgba(24,95,165,.05)' }}>
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.name} style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '2px solid var(--border)' }} />
                          ) : (
                            <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: badge.bg, color: badge.color, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                              {(u.name ?? '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                <input className="form-input" style={{ margin: 0, padding: '5px 10px', fontSize: '.9rem', width: 160 }}
                                  value={editingUser.name} onChange={e => setEditingUser(p => ({ ...p, name: e.target.value }))} autoFocus />
                                <button onClick={() => handleUpdateName(u.id)} disabled={savingUserId === u.id} className="btn btn-sm btn-primary" style={{ padding: '5px 12px' }}>
                                  {savingUserId === u.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : (lang === 'ar' ? 'حفظ' : 'Save')}
                                </button>
                                <button onClick={() => setEditingUser(null)} className="btn btn-sm btn-ghost" style={{ padding: '5px 8px' }}>✕</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '.97rem', color: '#1e293b' }}>{u.name}</span>
                                <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, background: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.label}</span>
                              </div>
                            )}
                            <div dir="ltr" style={{ textAlign: lang === 'ar' ? 'right' : 'left', color: '#475569', fontSize: '.85rem', marginBottom: 3 }}>{u.email}</div>
                            <div style={{ color: '#94a3b8', fontSize: '.78rem' }}>
                              📅 {dateJoined}
                              {u.last_sign_in && <span style={{ marginRight: 10 }}>· {lang === 'ar' ? 'آخر دخول:' : 'Last:'} {new Date(u.last_sign_in).toLocaleDateString('en-GB')}</span>}
                            </div>
                          </div>
                          <div style={{ flex: '0 1 220px', minWidth: 160 }}>
                            <div style={{ fontSize: '.72rem', fontWeight: 600, color: '#64748b', marginBottom: 5 }}>🔑 {lang === 'ar' ? 'كلمة السر' : 'Password'}</div>
                            {u.password ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '7px 10px' }}>
                                <span dir="ltr" style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '.92rem', letterSpacing: '.04em', userSelect: revealedPwds.has(u.id) ? 'all' : 'none', color: '#b45309', flex: 1 }}>
                                  {revealedPwds.has(u.id) ? u.password : '••••••••'}
                                </span>
                                <button onClick={() => togglePwd(u.id)} title={revealedPwds.has(u.id) ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'إظهار' : 'Show')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '.95rem', lineHeight: 1, padding: 2 }}>{revealedPwds.has(u.id) ? '🙈' : '👁️'}</button>
                                <button onClick={() => navigator.clipboard.writeText(u.password)} title={lang === 'ar' ? 'نسخ' : 'Copy'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 2 }}>📋</button>
                              </div>
                            ) : (
                              <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 10, padding: '7px 10px', color: '#94a3b8', fontSize: '.82rem', fontStyle: 'italic' }}>
                                {lang === 'ar' ? 'غير متاحة — اضغط إعادة الضبط' : 'Unknown — click Reset'}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
                            <a href={`/bogga/student-view/${u.id}`} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'linear-gradient(135deg,#eff6ff,#eef2ff)', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: 9, padding: '6px 12px', fontWeight: 700, fontSize: '.8rem', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background .18s' }}
                              onMouseEnter={e => e.currentTarget.style.background='#dbeafe'}
                              onMouseLeave={e => e.currentTarget.style.background='linear-gradient(135deg,#eff6ff,#eef2ff)'}>
                              👁️ {lang === 'ar' ? 'عرض لوحته' : 'View Dashboard'}
                            </a>
                            <button onClick={() => handleResetPassword(u.id)} disabled={resettingPwdId === u.id}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fffbeb', color: '#92400e', border: '1.5px solid #fde68a', borderRadius: 9, padding: '6px 12px', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              {resettingPwdId === u.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : '🔑'} {lang === 'ar' ? 'إعادة كلمة السر' : 'Reset Password'}
                            </button>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {!isEditing && (
                                <button onClick={() => setEditingUser({ id: u.id, name: u.name })}
                                  style={{ flex: 1, background: '#eef5ff', color: '#185FA5', border: '1.5px solid #bfdbfe', borderRadius: 9, padding: '5px 10px', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  ✏️ {lang === 'ar' ? 'تعديل' : 'Edit'}
                                </button>
                              )}
                              <button onClick={() => handleDeleteUser(u.id, u.name)} disabled={deletingUserId === u.id}
                                style={{ flex: 1, background: '#fee2e2', color: '#b91c1c', border: '1.5px solid #fca5a5', borderRadius: 9, padding: '5px 10px', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {deletingUserId === u.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : `🗑️ ${lang === 'ar' ? 'حذف' : 'Delete'}`}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ══ Visitor Q&A — فهيم الزوار ══════════════════════ */}
          {activeTab === 'visitor_qa' && isSuperAdmin && (
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>🤖 {tr('admin.visitor_qa.title')}</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem', lineHeight: 1.6, maxWidth: 560 }}>
                    {lang === 'ar'
                      ? 'الأسئلة والإجابات التي تضيفها هنا يحفظها فهيم ويستخدمها تلقائياً للرد على زوار الموقع. كلما أضفت معلومات أكثر، كانت إجاباته أدق وأكثر إقناعاً.'
                      : 'The Q&A you add here is saved by Faheem and used automatically to answer website visitors. The more information you add, the more accurate and convincing his answers will be.'}
                  </p>
                </div>
                <button
                  onClick={() => { setQaEditing(null); setQaForm({ question: '', answer: '', sort_order: visitorQA.length }); setQaMsg(null); setQaShowModal(true); }}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  + {lang === 'ar' ? 'إضافة سؤال وإجابة' : 'Add Question & Answer'}
                </button>
              </div>

              {/* Info banner */}
              <div style={{ background: '#eef5ff', borderRadius: 12, padding: '14px 18px', marginBottom: 22, display: 'flex', gap: 12, alignItems: 'flex-start', border: '1.5px solid #b3ccee' }}>
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>💡</span>
                <div style={{ fontSize: '.86rem', color: '#1a3a5c', lineHeight: 1.75 }}>
                  {lang === 'ar' ? (
                    <><strong>كيف يعمل:</strong> عند سؤال زائر فهيم، يبحث النظام في هذه القائمة ويُدرج الإجابات المناسبة في سياق الذكاء الاصطناعي.
                    السؤال المُدخَل لا يجب أن يطابق السؤال حرفياً — فهيم يفهم المعنى.
                    <br /><strong>نصيحة:</strong> أضف أسئلة عن الأسعار، الأعمار، المناهج، طريقة الدفع، والنادي الصيفي.</>
                  ) : (
                    <><strong>How it works:</strong> When a visitor asks Faheem, the system searches this list and injects relevant answers into the AI context.
                    The question doesn't need to match exactly — Faheem understands meaning.
                    <br /><strong>Tip:</strong> Add Q&A about pricing, age groups, curriculum, payment, and summer camp.</>
                  )}
                </div>
              </div>

              {/* SQL reminder */}
              <div style={{ background: '#fffbeb', borderRadius: 10, padding: '11px 16px', marginBottom: 22, fontSize: '.82rem', color: '#92400e', border: '1px solid #fde68a' }}>
                ⚠️ {lang === 'ar' ? <>تأكد من تشغيل SQL إنشاء جدول <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4 }}>faheem_visitor_qa</code> في Supabase (موجود في تبويب الإعداد).</> : <>Make sure to run the SQL for the <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4 }}>faheem_visitor_qa</code> table in Supabase (found in the Setup tab).</>}
              </div>

              {qaLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                </div>
              ) : visitorQA.length === 0 ? (
                <div className="empty-state card" style={{ padding: '48px 24px' }}>
                  <span className="empty-icon">🤖</span>
                  <p style={{ fontWeight: 700, marginBottom: 8 }}>{lang === 'ar' ? 'لا توجد أسئلة بعد' : 'No questions yet'}</p>
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>{lang === 'ar' ? 'ابدأ بإضافة أول سؤال وإجابة لتزويد فهيم بمعلومات الأكاديمية' : 'Start by adding the first Q&A to give Faheem academy information'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {visitorQA.map((item, idx) => (
                    <div key={item.id} style={{
                      background: '#fff', borderRadius: 14, border: '1.5px solid var(--border)',
                      padding: '18px 20px', opacity: item.is_active ? 1 : .55,
                      transition: 'opacity .2s',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>

                        {/* Content */}
                        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ background: 'var(--primary-lt)', color: 'var(--primary)', borderRadius: 6, padding: '2px 10px', fontSize: '.75rem', fontWeight: 800 }}>
                              #{idx + 1}
                            </span>
                            {!item.is_active && (
                              <span style={{ background: '#f1f5f9', color: '#94a3b8', borderRadius: 6, padding: '2px 8px', fontSize: '.72rem', fontWeight: 700 }}>
                                {lang === 'ar' ? 'معطّل' : 'Inactive'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 8, fontSize: '.95rem' }}>
                            ❓ {item.question}
                          </div>
                          <div style={{ color: '#475569', fontSize: '.88rem', lineHeight: 1.75, background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
                            💬 {item.answer}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                          <button
                            onClick={() => toggleQAActive(item)}
                            className="btn btn-sm"
                            style={{ background: item.is_active ? '#f0fdf4' : '#f1f5f9', color: item.is_active ? '#16a34a' : '#64748b', border: `1px solid ${item.is_active ? '#86efac' : '#cbd5e1'}` }}
                            title={item.is_active ? (lang === 'ar' ? 'انقر لتعطيل السؤال' : 'Click to deactivate') : (lang === 'ar' ? 'انقر لتفعيل السؤال' : 'Click to activate')}
                          >
                            {item.is_active ? (lang === 'ar' ? '✅ مفعّل' : '✅ Active') : (lang === 'ar' ? '⏸ معطّل' : '⏸ Inactive')}
                          </button>
                          <button
                            onClick={() => {
                              setQaEditing(item);
                              setQaForm({ question: item.question, answer: item.answer, sort_order: item.sort_order ?? idx });
                              setQaMsg(null);
                              setQaShowModal(true);
                            }}
                            className="btn btn-sm btn-outline"
                            style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
                          >
                            ✏️ {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          <button
                            onClick={() => handleDeleteQA(item.id)}
                            disabled={qaDeletingId === item.id}
                            className="btn btn-sm btn-danger"
                          >
                            {qaDeletingId === item.id
                              ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                              : '🗑️'}
                          </button>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ Puzzles ═══════════════════════════════════════════ */}
          {activeTab === 'puzzles' && isSuperAdmin && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', margin: 0 }}>🧩 إدارة الأحاجي</h2>
                <button className="btn btn-primary" onClick={openAddPuzzle}>+ أحجية جديدة</button>
              </div>

              {puzzlesLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
              ) : puzzles.length === 0 ? (
                <div className="alert alert-info">لا توجد أحاجي بعد — أضف أول أحجية!</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
                  {puzzles.map(pz => (
                    <div key={pz.id} className="card" style={{ padding: 0, overflow: 'hidden', border: pz.is_active ? '2px solid #6366F1' : '2px solid #e2e8f0' }}>
                      {/* Image preview — admin sees full image */}
                      <div style={{ position: 'relative', height: 160, background: pz.bg || 'linear-gradient(135deg,#667eea,#764ba2)', overflow: 'hidden' }}>
                        {pz.image_url ? (
                          <img src={pz.image_url} alt={pz.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '3.5rem', opacity: .5 }}>🖼️</span>
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: 8, left: 8 }}>
                          <span style={{ background: pz.is_active ? '#6366F1' : '#94a3b8', color: '#fff', borderRadius: 8, padding: '2px 10px', fontSize: '.72rem', fontWeight: 700 }}>
                            {pz.is_active ? '✅ نشطة' : '⏸️ متوقفة'}
                          </span>
                        </div>
                        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.5)', color: '#fff', borderRadius: 8, padding: '2px 10px', fontSize: '.72rem', fontWeight: 700 }}>
                          {pz.cols}×{pz.rows} = {pz.cols * pz.rows} قطعة
                        </div>
                      </div>
                      <div style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, fontSize: '.95rem', color: '#1F2937', marginBottom: 4 }}>{pz.title || '—'}</div>
                        {pz.badge_name && <div style={{ fontSize: '.78rem', color: '#6B7280' }}>🏅 وسام: {pz.badge_icon} {pz.badge_name}</div>}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button className="btn btn-sm btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEditPuzzle(pz)}>✏️ تعديل</button>
                          <button className="btn btn-sm" style={{ background: pz.is_active ? '#FEF3C7' : '#D1FAE5', color: pz.is_active ? '#92400E' : '#065F46', border: 'none' }} onClick={() => handleTogglePuzzle(pz)}>
                            {pz.is_active ? '⏸️ إيقاف' : '▶️ تفعيل'}
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeletePuzzle(pz.id)}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit Form Modal */}
              {showPuzzleForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: 16 }}
                  onClick={e => e.target === e.currentTarget && setShowPuzzleForm(false)}>
                  <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 480, direction: 'rtl', maxHeight: '90vh', overflowY: 'auto' }}>
                    <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20 }}>{editingPuzzle ? '✏️ تعديل الأحجية' : '+ أحجية جديدة'}</h3>
                    <form onSubmit={handleSavePuzzle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="form-group">
                        <label className="form-label">عنوان الأحجية *</label>
                        <input className="form-input" required value={puzzleForm.title} onChange={e => setPuzzleForm(p => ({ ...p, title: e.target.value }))} placeholder="مثال: فهيم في الغابة" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                          <label className="form-label">أعمدة الشبكة</label>
                          <select className="form-input" value={puzzleForm.cols} onChange={e => setPuzzleForm(p => ({ ...p, cols: Number(e.target.value) }))}>
                            {[2,3,4,5].map(n => <option key={n} value={n}>{n} أعمدة</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">صفوف الشبكة</label>
                          <select className="form-input" value={puzzleForm.rows} onChange={e => setPuzzleForm(p => ({ ...p, rows: Number(e.target.value) }))}>
                            {[2,3,4,5].map(n => <option key={n} value={n}>{n} صفوف</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">صورة الأحجية (يكتشفها الطالب)</label>
                        <div style={{ border: '2px dashed #C7D2FE', borderRadius: 12, padding: 16, textAlign: 'center', cursor: 'pointer', background: '#F8FAFF' }}
                          onClick={() => puzzleFileRef.current?.click()}>
                          {puzzleImgPrev ? (
                            <img src={puzzleImgPrev} alt="preview" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 10, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ color: '#6B7280', fontSize: '.85rem' }}>🖼️ اضغط لرفع صورة<br /><span style={{ fontSize: '.75rem' }}>PNG, JPG (حتى 4MB)</span></div>
                          )}
                        </div>
                        <input ref={puzzleFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setPuzzleImgFile(f);
                          setPuzzleImgPrev(URL.createObjectURL(f));
                        }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                        <div className="form-group">
                          <label className="form-label">اسم وسام الإنجاز</label>
                          <input className="form-input" value={puzzleForm.badge_name} onChange={e => setPuzzleForm(p => ({ ...p, badge_name: e.target.value }))} placeholder="بطل الأحجية" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">رمز الوسام</label>
                          <input className="form-input" value={puzzleForm.badge_icon} onChange={e => setPuzzleForm(p => ({ ...p, badge_icon: e.target.value }))} style={{ width: 70, textAlign: 'center', fontSize: '1.3rem' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="checkbox" id="pz-active" checked={puzzleForm.is_active} onChange={e => setPuzzleForm(p => ({ ...p, is_active: e.target.checked }))} />
                        <label htmlFor="pz-active" style={{ fontWeight: 600, cursor: 'pointer' }}>أحجية نشطة (تظهر للطلاب)</label>
                      </div>
                      {puzzleMsg && <div className={`alert alert-${puzzleMsg.ok ? 'success' : 'error'}`}>{puzzleMsg.text}</div>}
                      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <button type="submit" className="btn btn-primary" disabled={puzzleSaving} style={{ flex: 1, justifyContent: 'center' }}>
                          {puzzleSaving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جارٍ الحفظ...</> : '✅ حفظ'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => setShowPuzzleForm(false)}>إلغاء</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ Setup ═════════════════════════════════════════════ */}
          {activeTab === 'pricing' && isSuperAdmin && (
            <PricingAdmin lang={lang} />
          )}

          {activeTab === 'team' && isSuperAdmin && (
            <TeamAdmin />
          )}

          {activeTab === 'setup' && (
            <div>
              {!isSuperAdmin && (
                <div className="card" style={{ marginBottom: 28, border: '2px solid #F5A623', background: '#fffbf0' }}>
                  <h3 style={{ fontWeight: 800, color: '#b56a00', marginBottom: 10, fontSize: '1.1rem' }}>{tr('admin.setup.promoteTitle')}</h3>
                  <p style={{ color: '#64748b', fontSize: '.9rem', lineHeight: 1.7, marginBottom: 16 }}>{tr('admin.setup.promoteDesc')}</p>
                  {promoMsg && <div className={`alert alert-${promoMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>{promoMsg.text}</div>}
                  <button onClick={handlePromote} disabled={promoting} className="btn btn-accent btn-lg" style={{ gap: 10 }}>
                    {promoting ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#7A3800', borderColor: 'rgba(122,56,0,.2)' }} />{tr('admin.setup.promoting')}</> : tr('admin.setup.promoteBtn')}
                  </button>
                </div>
              )}
              {isSuperAdmin && (
                <>
                  {/* Google Sheet URL */}
                  <div className="card" style={{ marginBottom: 28 }}>
                    <h3 style={{ fontWeight: 800, color: '#1a7c40', marginBottom: 10, fontSize: '1.05rem' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle', marginLeft: 6 }}><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                      {lang === 'ar' ? 'رابط Google Sheet للنتائج' : 'Google Sheet URL for Results'}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '.88rem', marginBottom: 12 }}>
                      {lang === 'ar' ? 'أضف رابط الجدول ليظهر زر الفتح السريع في تبويب النتائج.' : 'Add the sheet URL to show a quick-open button in the Results tab.'}
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input
                        className="form-input" style={{ margin: 0, flex: 1, direction: 'ltr', fontSize: '.88rem' }}
                        type="url"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={sheetsUrlInput}
                        onChange={e => setSheetsUrlInput(e.target.value)}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          localStorage.setItem('admin_sheets_url', sheetsUrlInput);
                          setSheetsUrl(sheetsUrlInput);
                          setSheetsSaved(true);
                          setTimeout(() => setSheetsSaved(false), 2000);
                        }}
                      >
                        {sheetsSaved ? (lang === 'ar' ? '✓ تم الحفظ' : '✓ Saved') : (lang === 'ar' ? 'حفظ' : 'Save')}
                      </button>
                      {sheetsUrl && (
                        <a href={sheetsUrl} target="_blank" rel="noopener noreferrer"
                          className="btn btn-sm"
                          style={{ background: '#1a7c40', color: '#fff', textDecoration: 'none' }}>
                          {lang === 'ar' ? 'فتح' : 'Open'}
                        </a>
                      )}
                    </div>
                  </div>

                  <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 16 }}>{tr('admin.setup.title')}</h2>
                  <div className="alert alert-info" style={{ marginBottom: 20 }}>
                    {tr('admin.setup.hint')}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <pre style={{ background: '#1a1a2e', color: '#e2e8f0', borderRadius: 14, padding: '24px 20px', fontSize: '.82rem', lineHeight: 1.8, overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: "'Courier New', monospace" }}>
                      {SETUP_SQL}
                    </pre>
                    <button onClick={copySetupSql} className="btn btn-sm"
                      style={{ position: 'absolute', top: 12, left: 12, background: copied ? '#1a7c40' : 'rgba(255,255,255,.15)', color: '#fff', border: 'none' }}>
                      {copied ? tr('admin.setup.copied') : tr('admin.setup.copy')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          </div> {/* end content area */}
          </div> {/* end admin-layout */}

            </> /* end of tabs content */
          )}

        </div>
      </main>

      {/* ══ Admin Complete Session Modal ═══════════════════════════════════ */}
      {adminCompleteFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 650, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setAdminCompleteFor(null)}>
          <div style={{ background: '#fff', borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 480, direction: 'rtl', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 6, color: '#1a7c40' }}>{tr('admin.sessions.completeSession')}</h2>
            <p style={{ fontSize: '.88rem', color: 'var(--muted)', marginBottom: 20 }}>
              {adminCompleteFor.subject || tr('admin.sessions.subject')} — {adminCompleteFor.student_name} {lang === 'ar' ? 'مع' : 'with'} {adminCompleteFor.teacher_name}
            </p>
            <div className="form-group">
              <label className="form-label">{tr('admin.sessions.recordingUrl')}</label>
              <input className="form-input" type="url" dir="ltr"
                placeholder={tr('admin.sessions.recordingPlaceholder')}
                value={adminRecordingUrl} onChange={e => setAdminRecordingUrl(e.target.value)} />
              <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 4 }}>{tr('admin.sessions.recordingHint')}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={handleAdminComplete} disabled={adminCompleteSav}
                className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#1a7c40', borderColor: '#1a7c40' }}>
                {adminCompleteSav ? tr('admin.sessions.saving') : tr('admin.sessions.confirmComplete')}
              </button>
              <button onClick={() => setAdminCompleteFor(null)} className="btn btn-outline">{tr('cancel')}</button>
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
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', margin: '0 0 2px' }}>📊 {lang === 'ar' ? 'سجل نشاط المشرف' : 'Admin Activity Log'}</h2>
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
                              ? (lang === 'ar' ? `بدأت الجلسة: ${new Date(now.session_start).toLocaleString('en-GB')} — مدة الجلسة الحالية: ${curDur} دقيقة` : `Session started: ${new Date(now.session_start).toLocaleString('en-GB')} — Current duration: ${curDur} min`)
                              : (lang === 'ar' ? `آخر ظهور: ${new Date(now.last_seen).toLocaleString('en-GB')}` : `Last seen: ${new Date(now.last_seen).toLocaleString('en-GB')}`)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Sessions list */}
                <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--muted)', marginBottom: 12 }}>{lang === 'ar' ? 'سجل الجلسات السابقة' : 'Previous Sessions Log'}</div>
                {activityData.sessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--muted)', fontSize: '.9rem' }}>{lang === 'ar' ? 'لا توجد جلسات مسجّلة بعد' : 'No sessions recorded yet'}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activityData.sessions.map(s => {
                      const dur = s.duration_minutes ?? 0;
                      const durLabel = lang === 'ar'
                        ? (dur >= 60 ? `${Math.floor(dur/60)}س ${dur%60}د` : `${dur} دقيقة`)
                        : (dur >= 60 ? `${Math.floor(dur/60)}h ${dur%60}m` : `${dur} min`);
                      return (
                        <div key={s.id} style={{ background: '#f8faff', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '.88rem' }}>
                              📅 {new Date(s.session_start).toLocaleDateString(lang === 'ar' ? 'en-GB' : 'en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            <div style={{ color: 'var(--muted)', fontSize: '.78rem', marginTop: 3, display: 'flex', gap: 16 }}>
                              <span>🕐 {lang === 'ar' ? 'من:' : 'From:'} {new Date(s.session_start).toLocaleTimeString(lang === 'ar' ? 'en-GB' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span>🕓 {lang === 'ar' ? 'إلى:' : 'To:'} {new Date(s.session_end).toLocaleTimeString(lang === 'ar' ? 'en-GB' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
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
                🔒 {(lang === 'ar' ? TAB_NAMES : TAB_NAMES_EN)[permPopover.tabKey]}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '.75rem', marginTop: 2 }}>{lang === 'ar' ? 'صلاحيات المشرفين المساعدين' : 'Assistant admin permissions'}</div>
            </div>
            <button onClick={() => setPermPopover(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.1rem', padding: 2, lineHeight: 1 }}>✕</button>
          </div>

          {permsLoading ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
            </div>
          ) : admins.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '.85rem', margin: 0 }}>
              {lang === 'ar' ? <>لا يوجد مشرفون مساعدون — أضف مشرفاً من تبويب <strong>إدارة المشرفين</strong> أولاً.</> : <>No assistant admins — add one from the <strong>Admin Management</strong> tab first.</>}
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
            {lang === 'ar' ? <>الوضع الافتراضي لأي تبويب: <strong style={{ color: '#b91c1c' }}>مخفي</strong> — لا يظهر لأي مساعد إلا بعد تفعيله يدوياً</> : <>Default for any tab: <strong style={{ color: '#b91c1c' }}>Hidden</strong> — won't appear for any assistant until manually enabled</>}
          </div>
        </div>
      )}

      {/* ══ Admin Session Scheduling Modal ══════════════════════════════════ */}
      {adminSchedModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.48)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:600, padding:16 }}
          onClick={e => e.target === e.currentTarget && !adminSchedSaving && setAdminSchedModal(false)}>
          <div style={{ background:'#fff', borderRadius:22, padding:'28px 28px 24px', width:'100%', maxWidth:480, direction:'rtl', boxShadow:'0 24px 72px rgba(0,0,0,.28)', maxHeight:'92vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontWeight:800, color:'var(--primary)', fontSize:'1.15rem', margin:0 }}>📅 جدولة حصة جديدة</h2>
              <button onClick={() => !adminSchedSaving && setAdminSchedModal(false)} style={{ background:'none', border:'none', fontSize:'1.3rem', color:'var(--muted)', cursor:'pointer', lineHeight:1 }}>✕</button>
            </div>

            <form onSubmit={handleAdminSchedSubmit}>
              {/* Teacher */}
              <div className="form-group">
                <label className="form-label">👨‍🏫 المعلم *</label>
                {adminTeacherList.length > 0 ? (
                  <select className="form-input" value={adminSchedForm.teacherId}
                    onChange={e => {
                      const t = adminTeacherList.find(x => x.id === e.target.value);
                      setAdminSchedForm(p => ({ ...p, teacherId: t?.id ?? '', teacherName: t?.name ?? '', teacherEmail: t?.email ?? '' }));
                    }}>
                    <option value="">— اختر من القائمة —</option>
                    {adminTeacherList.map(t => <option key={t.id} value={t.id}>👤 {t.name}</option>)}
                  </select>
                ) : null}
                <input className="form-input" type="text" placeholder="أو اكتب اسم المعلم يدوياً"
                  style={{ marginTop: adminTeacherList.length > 0 ? 8 : 0 }}
                  value={adminSchedForm.teacherName}
                  onChange={e => setAdminSchedForm(p => ({ ...p, teacherName: e.target.value }))} required />
              </div>

              {/* Student */}
              <div className="form-group">
                <label className="form-label">👤 اسم الطالب *</label>
                <input className="form-input" type="text" placeholder="اسم الطالب"
                  value={adminSchedForm.studentName}
                  onChange={e => setAdminSchedForm(p => ({ ...p, studentName: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">✉️ بريد الطالب الإلكتروني</label>
                <input className="form-input" type="email" dir="ltr" placeholder="student@example.com"
                  value={adminSchedForm.studentEmail}
                  onChange={e => setAdminSchedForm(p => ({ ...p, studentEmail: e.target.value }))} />
                <div style={{ fontSize:'.75rem', color:'var(--muted)', marginTop:3 }}>مطلوب لكي تظهر الحصة في داشبورد الطالب وإرسال الإشعار</div>
              </div>

              {/* Subject */}
              <div className="form-group">
                <label className="form-label">📚 موضوع الحصة (اختياري)</label>
                <input className="form-input" type="text" placeholder="قواعد النحو، القراءة..."
                  value={adminSchedForm.subject}
                  onChange={e => setAdminSchedForm(p => ({ ...p, subject: e.target.value }))} />
              </div>

              {/* Date + Time */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">📅 التاريخ *</label>
                  <input className="form-input" type="date" min={new Date().toISOString().slice(0,10)}
                    value={adminSchedForm.sessionDate}
                    onChange={e => setAdminSchedForm(p => ({ ...p, sessionDate: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">⏰ الوقت *</label>
                  <select className="form-input" value={adminSchedForm.startTime}
                    onChange={e => setAdminSchedForm(p => ({ ...p, startTime: e.target.value }))} required>
                    <option value="">اختر...</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Duration */}
              <div className="form-group">
                <label className="form-label">⏱️ مدة الحصة</label>
                <select className="form-input" value={adminSchedForm.durationMinutes}
                  onChange={e => setAdminSchedForm(p => ({ ...p, durationMinutes: e.target.value }))}>
                  <option value="30">30 دقيقة</option>
                  <option value="45">45 دقيقة</option>
                  <option value="60">ساعة كاملة</option>
                  <option value="90">ساعة ونصف</option>
                </select>
              </div>

              {adminSchedMsg && (
                <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:14, fontSize:'.88rem', fontWeight:600,
                  background: adminSchedMsg.type === 'error' ? '#fff5f5' : '#f0fdf4',
                  color:      adminSchedMsg.type === 'error' ? '#b91c1c' : '#1a7c40',
                  border:     `1.5px solid ${adminSchedMsg.type === 'error' ? '#fca5a5' : '#6ee7b7'}` }}>
                  {adminSchedMsg.text}
                </div>
              )}

              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="submit" disabled={adminSchedSaving} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
                  {adminSchedSaving ? 'جارٍ الجدولة...' : '📅 جدولة الحصة'}
                </button>
                <button type="button" onClick={() => setAdminSchedModal(false)} className="btn btn-outline">إلغاء</button>
              </div>
            </form>
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
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.15rem', margin: '0 0 4px' }}>📅 {lang === 'ar' ? 'جدولة مقابلة' : 'Schedule Interview'}</h2>
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', margin: 0 }}>{schedModal.name}</p>
              </div>
              <button onClick={() => { if (!schedulingBusy) setSchedModal(null); }} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--muted)', cursor: 'pointer', lineHeight: 1, padding: 2 }}>✕</button>
            </div>

            {schedMsg && <div className={`alert alert-${schedMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 16 }}>{schedMsg.text}</div>}

            <div className="form-group">
              <label className="form-label">👤 {lang === 'ar' ? 'المقابِل' : 'Interviewer'}</label>
              <input className="form-input" value={schedInterviewer} onChange={e => setSchedInterviewer(e.target.value)} placeholder={lang === 'ar' ? 'اسم من سيجري المقابلة' : 'Name of the interviewer'} disabled={schedulingBusy} />
              <p className="form-help">{lang === 'ar' ? 'سيظهر هذا الاسم في بريد الدعوة المرسل للمترشح' : 'This name will appear in the invitation email sent to the candidate'}</p>
            </div>

            <div className="form-group">
              <label className="form-label">📆 {lang === 'ar' ? 'تاريخ المقابلة' : 'Interview Date'}</label>
              <input className="form-input" type="date" value={schedDate} min={new Date().toISOString().split('T')[0]} onChange={e => { setSchedDate(e.target.value); setSchedTime(''); }} disabled={schedulingBusy} dir="ltr" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                ⏰ {lang === 'ar' ? 'ساعة الانطلاق' : 'Start Time'}
                {slotsLoading && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />}
              </label>
              {!schedDate || !schedInterviewer.trim() ? (
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', background: 'var(--bg)', padding: '10px 14px', borderRadius: 8, margin: 0 }}>
                  {lang === 'ar' ? 'حدّد المقابِل والتاريخ أولاً لعرض الأوقات المتاحة' : 'Set the interviewer and date first to see available slots'}
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
                        {booked && <span style={{ fontSize: '.6rem', display: 'block', color: '#e53e3e', textDecoration: 'none' }}>{lang === 'ar' ? 'محجوز' : 'Booked'}</span>}
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
                  ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{lang === 'ar' ? 'جارٍ الحجز وإرسال الدعوة...' : 'Booking and sending invitation...'}</>
                  : (lang === 'ar' ? '✅ تأكيد الموعد وإرسال الدعوة' : '✅ Confirm & Send Invitation')}
              </button>
              <button onClick={() => { if (!schedulingBusy) setSchedModal(null); }} className="btn btn-ghost" disabled={schedulingBusy}>{tr('cancel')}</button>
            </div>

            {schedTime && (
              <div style={{ marginTop: 12, background: '#eef5ff', borderRadius: 9, padding: '10px 14px', fontSize: '.83rem', color: '#1a2d4a' }}>
                {lang === 'ar'
                  ? <>📋 سيُرسَل بريد إلى <strong>{schedModal.email}</strong> بموعد {fmtDate(schedDate, lang)} الساعة {schedTime} مع المقابِل <strong>{schedInterviewer}</strong></>
                  : <>📋 An email will be sent to <strong>{schedModal.email}</strong> for {fmtDate(schedDate, lang)} at {schedTime} with <strong>{schedInterviewer}</strong></>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ Visitor Q&A Modal ══════════════════════════════════════════════ */}
      {qaShowModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setQaShowModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 540, direction: 'rtl', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', margin: 0 }}>
                {qaEditing ? (lang === 'ar' ? '✏️ تعديل سؤال وإجابة' : '✏️ Edit Q&A') : (lang === 'ar' ? '+ إضافة سؤال وإجابة جديد' : '+ Add New Q&A')}
              </h2>
              <button onClick={() => setQaShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--muted)', cursor: 'pointer', padding: 2, lineHeight: 1 }}>✕</button>
            </div>

            {qaMsg && (
              <div className={`alert alert-${qaMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>
                {qaMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveQA}>
              <div className="form-group">
                <label className="form-label">❓ {lang === 'ar' ? 'السؤال *' : 'Question *'}</label>
                <input
                  className="form-input"
                  value={qaForm.question}
                  required
                  onChange={e => setQaForm(p => ({ ...p, question: e.target.value }))}
                  placeholder={lang === 'ar' ? 'مثال: ما هي أسعار الاشتراك في الأكاديمية؟' : 'e.g. What are the subscription prices?'}
                  disabled={qaSaving}
                />
                <p className="form-help">{lang === 'ar' ? 'اكتب السؤال كما قد يسأله ولي الأمر' : 'Write the question as a parent might ask it'}</p>
              </div>

              <div className="form-group">
                <label className="form-label">💬 {lang === 'ar' ? 'الإجابة *' : 'Answer *'}</label>
                <textarea
                  className="form-input"
                  value={qaForm.answer}
                  required
                  rows={4}
                  onChange={e => setQaForm(p => ({ ...p, answer: e.target.value }))}
                  placeholder={lang === 'ar' ? 'اكتب الإجابة الرسمية للأكاديمية...' : 'Write the official academy answer...'}
                  disabled={qaSaving}
                  style={{ resize: 'vertical', minHeight: 100 }}
                />
                <p className="form-help">{lang === 'ar' ? 'فهيم سيستخدم هذه الإجابة كمرجع — كن دقيقاً ومقنعاً' : 'Faheem will use this as a reference — be accurate and convincing'}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">🔢 {lang === 'ar' ? 'الترتيب' : 'Sort Order'}</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  value={qaForm.sort_order}
                  onChange={e => setQaForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                  style={{ maxWidth: 120 }}
                  disabled={qaSaving}
                />
                <p className="form-help">{lang === 'ar' ? 'الأسئلة ذات الرقم الأصغر تُعطى أولوية في السياق' : 'Lower numbers are given priority in the context'}</p>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button type="submit" className="btn btn-primary" disabled={qaSaving} style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
                  {qaSaving
                    ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</>
                    : qaEditing ? (lang === 'ar' ? '✅ حفظ التعديلات' : '✅ Save Changes') : (lang === 'ar' ? '✅ إضافة السؤال' : '✅ Add Question')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setQaShowModal(false)} disabled={qaSaving}>{tr('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Add Admin Modal ═════════════════════════════════════════════════ */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 440, direction: 'rtl', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20, fontSize: '1.15rem' }}>+ {lang === 'ar' ? 'إضافة مشرف مساعد جديد' : 'Add New Assistant Admin'}</h2>
            {adminMsg && <div className={`alert alert-${adminMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>{adminMsg.text}</div>}
            <form onSubmit={handleAddAdmin}>
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'الاسم الكامل *' : 'Full Name *'}</label>
                <input className="form-input" value={adminForm.name} required onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} placeholder={lang === 'ar' ? 'أدخل الاسم الكامل' : 'Enter full name'} />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}</label>
                <input className="form-input" type="email" value={adminForm.email} required onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} placeholder="admin@example.com" dir="ltr" />
              </div>
              <div className="alert alert-info" style={{ fontSize: '.85rem', marginBottom: 4 }}>
                🔑 {lang === 'ar' ? 'ستُنشأ كلمة مرور مؤقتة تلقائياً وتُرسل للمشرف عبر بريده الإلكتروني.' : 'A temporary password will be auto-generated and sent to the admin via email.'}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={addingAdmin} style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
                  {addingAdmin ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{lang === 'ar' ? 'جارٍ الإنشاء...' : 'Creating...'}</> : (lang === 'ar' ? '✅ إنشاء الحساب' : '✅ Create Account')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowAddModal(false); setAdminMsg(null); }}>{tr('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Add Supervisor Modal ═════════════════════════════════════════════ */}
      {showAddSupervisor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddSupervisor(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 440, direction: lang === 'ar' ? 'rtl' : 'ltr', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ fontWeight: 800, color: '#7c3aed', marginBottom: 20, fontSize: '1.15rem' }}>🧑‍💼 {lang === 'ar' ? 'إضافة مرشد تربوي جديد' : 'Add New Educational Supervisor'}</h2>
            {supervisorMsg && <div className={`alert alert-${supervisorMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>{supervisorMsg.text}</div>}
            <form onSubmit={handleAddSupervisor}>
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'الاسم الكامل *' : 'Full Name *'}</label>
                <input className="form-input" value={supervisorForm.name} required onChange={e => setSupervisorForm(p => ({ ...p, name: e.target.value }))} placeholder={lang === 'ar' ? 'أدخل الاسم الكامل' : 'Enter full name'} />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}</label>
                <input className="form-input" type="email" value={supervisorForm.email} required onChange={e => setSupervisorForm(p => ({ ...p, email: e.target.value }))} placeholder="supervisor@example.com" dir="ltr" />
              </div>
              <div className="alert alert-info" style={{ fontSize: '.85rem', marginBottom: 4 }}>
                🔑 {lang === 'ar' ? 'ستُنشأ كلمة مرور مؤقتة تلقائياً وتُرسل للمرشد عبر بريده الإلكتروني.' : 'A temporary password will be auto-generated and sent to the supervisor via email.'}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={addingSupervisor} style={{ flex: 1, justifyContent: 'center', gap: 8, background: '#7c3aed' }}>
                  {addingSupervisor ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{lang === 'ar' ? 'جارٍ الإنشاء...' : 'Creating...'}</> : (lang === 'ar' ? '✅ إنشاء الحساب' : '✅ Create Account')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowAddSupervisor(false); setSupervisorMsg(null); }}>{tr('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}