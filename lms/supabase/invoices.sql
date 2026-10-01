-- جدول الفواتير والمستحقات المالية
CREATE TABLE IF NOT EXISTS invoices (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID,                          -- teacher auth id (null for student bills)
  user_name        TEXT        NOT NULL,
  user_email       TEXT        NOT NULL,
  type             TEXT        NOT NULL
    CONSTRAINT invoice_type CHECK (type IN ('teacher_payout','student_bill')),
  total_hours      NUMERIC(8,2) NOT NULL DEFAULT 0,
  sessions_count   INT          NOT NULL DEFAULT 0,
  rate_per_hour    NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'draft'
    CONSTRAINT invoice_status CHECK (status IN ('draft','sent')),
  billing_period   TEXT        NOT NULL,          -- 'YYYY-MM'
  items            JSONB,                         -- [{date, subject, student/teacher, minutes}]
  sent_at          TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_email, type, billing_period)
);
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS invoices_period_idx ON invoices (billing_period, type);
CREATE INDEX IF NOT EXISTS invoices_user_idx   ON invoices (user_email, billing_period);

NOTIFY pgrst, 'reload schema';
