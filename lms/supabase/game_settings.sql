-- إعدادات الألعاب التي يضبطها المعلم/المدير وتُطبَّق على الطلاب (صف لكل لعبة)
-- أول استخدام: صيّاد الحروف — عدد كلمات الجولة وعدد الخيارات (2026-10-15)
-- الوصول عبر مسارات الخادم فقط (service_role)؛ القراءة والكتابة المباشرة محجوبتان.

CREATE TABLE IF NOT EXISTS public.game_settings (
  game_id    text PRIMARY KEY,
  settings   jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_direct_anon ON public.game_settings;
CREATE POLICY deny_direct_anon ON public.game_settings
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_direct_authenticated ON public.game_settings;
CREATE POLICY deny_direct_authenticated ON public.game_settings
  AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
