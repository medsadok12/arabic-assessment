-- إعادة هيكلة قسم "الأسعار والاشتراكات" على الصفحة الرئيسية — جلسة 2026-10-14.
-- يضيف 3 أعمدة اختيارية لدعم 3 بطاقات بأدوار مختلفة ظاهرة معاً دون تبويبات/تبديل
-- شهري-سنوي: حصة تجريبية (لمرة واحدة)، باقة شهرية، باقة سنوية.
--
-- ✅ نُفِّذ فعلياً على القاعدة الحيّة عبر Supabase MCP (apply_migration) أثناء
-- هذه الجلسة — هذا الملف للتوثيق والمرجعية فقط، لا حاجة لإعادة تشغيله.

ALTER TABLE pricing_plans
  ADD COLUMN IF NOT EXISTS billing_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly','yearly','one_time')),
  ADD COLUMN IF NOT EXISTS badge_text TEXT,
  ADD COLUMN IF NOT EXISTS cta_label_ar TEXT,
  ADD COLUMN IF NOT EXISTS cta_label_en TEXT;

NOTIFY pgrst, 'reload schema';
