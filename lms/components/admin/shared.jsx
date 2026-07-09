'use client';

/*
  ثوابت ومساعدات مشتركة للوحة الإدارة (/bogga) ومكوّنات تبويباتها.
  نُقلت حرفياً من lms/app/bogga/page.jsx أثناء تفكيكه — لا تغيير في أي قيمة.
*/

// ── Time slots 00:00 → 23:55, 5-min increments (288 slots) ─────────────────
export const TIME_SLOTS = Array.from({ length: 288 }, (_, i) => {
  const mins = i * 5;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

// ── Tabs that assistant admins can be granted access to ─────────────────────
export const CONTROLLABLE = ['overview', 'codes', 'groups', 'sessions', 'results', 'lexicon', 'recruitment', 'simulator', 'setup'];
export const TAB_NAMES = {
  overview: 'نظرة عامة', codes: 'الأكواد', groups: 'إدارة الطلاب',
  sessions: 'الحصص', results: 'نتائج الطلاب', lexicon: 'بنك الكلمات',
  recruitment: 'طلبات التوظيف', simulator: 'مسرح التعبير', setup: 'الإعداد',
};
export const TAB_NAMES_EN = {
  overview: 'Overview', codes: 'Codes', groups: 'Students',
  sessions: 'Sessions', results: 'Results', lexicon: 'Word Bank',
  recruitment: 'Job Applications', simulator: 'Expression Theater', setup: 'Setup',
};

// ── Arabic month names ──────────────────────────────────────────────────────
export const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                          'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
export function fmtDate(iso, langCode) {
  if (!iso) return '';
  if (langCode !== 'ar') {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS_AR[parseInt(m) - 1]} ${y}`;
}

// ── Quick contact helpers ───────────────────────────────────────────────────
export function waLink(phone) {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

// ── Toggle Switch component ─────────────────────────────────────────────────
export function ToggleSwitch({ checked, onChange, disabled }) {
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

export const STATUS_COLORS = { pending: '#b56a00', reviewed: '#185FA5', accepted: '#1a7c40', rejected: '#e53e3e' };
export const IV_COLORS = {
  pending: '#b56a00', confirmed: '#1a7c40',
  reschedule_requested: '#185FA5', rejected: '#e53e3e',
};

export const EMPTY_ADMIN_FORM = { name: '', email: '' };

export const SETUP_SQL = `-- تشغيل هذا SQL في Supabase SQL Editor لتهيئة جميع الجداول:

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
