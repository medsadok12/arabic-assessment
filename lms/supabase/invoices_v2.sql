-- مخطط إضافات الحماية المالية v2
-- تشغيل في Supabase SQL Editor

-- 1. حقل حالة تسليم البريد الإلكتروني
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS email_delivery_status TEXT NOT NULL DEFAULT 'idle'
    CONSTRAINT email_status_chk CHECK (email_delivery_status IN ('idle','success','failed'));

-- 2. حقل قفل الفاتورة (يُفعَّل يدوياً أو تلقائياً عند الإرسال)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- 3. ملاحظة بيانات الجلسة التاريخية — حقل تدقيق في sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS snapshot JSONB;

NOTIFY pgrst, 'reload schema';
