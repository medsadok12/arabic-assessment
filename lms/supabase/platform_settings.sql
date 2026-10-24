-- ════════════════════════════════════════════════════════════════
-- إعدادات المنصة العامة التي يتحكم فيها المدير من لوحة bogga (2026-10-20)
-- صف لكل مفتاح: key + قيمة jsonb. الوصول عبر مسارات الخادم فقط (service_role)؛
-- القراءة والكتابة المباشرة محجوبتان.
--
-- signup_codes: هل يُطلب الكود؟ (lms/lib/signup-codes.js)
--   student_code_required    كود الأكاديمية عند تسجيل الطالب (البريد + Google)
--   assessment_code_required كود التقييم التشخيصي (assessment.aarem.net)
--   غياب الصف أو تعذّر قراءته = الكود مطلوب (السلوك الأصلي).
--   القيمة الأولى: الكودان مخفيّان — تجربة فتح الحسابات بلا كود بطلب الأستاذ محمد.
-- هجرة إضافية آمنة لإعادة التشغيل (لا حذف لأي شيء).
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_settings' AND policyname = 'deny_direct_anon') THEN
    CREATE POLICY "deny_direct_anon" ON public.platform_settings AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_settings' AND policyname = 'deny_direct_authenticated') THEN
    CREATE POLICY "deny_direct_authenticated" ON public.platform_settings AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;

INSERT INTO public.platform_settings (key, value)
VALUES ('signup_codes', '{"student_code_required": false, "assessment_code_required": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
