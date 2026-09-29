-- ================================================================
-- rollback لـ quicktest_word_completion.sql — يحذف جدول عناصر التدريب
-- وأعمدة الإعدادات الثلاثة المضافة. آمن للتشغيل في أي وقت.
--
-- ⚠️ لا يُعيد سؤال "شمس" المحذوف من quicktest_questions تلقائياً — إن
-- أُريد ذلك، يُعاد إدخاله يدوياً (نص السؤال، skill_tag='تهجئة'،
-- options=[{"text":"م","correct":true},{"text":"ر","correct":false},
-- {"text":"ل","correct":false}]).
-- ================================================================

DROP TABLE IF EXISTS public.quicktest_word_completion_items;

ALTER TABLE public.quicktest_settings
  DROP COLUMN IF EXISTS word_completion_enabled,
  DROP COLUMN IF EXISTS word_completion_title,
  DROP COLUMN IF EXISTS word_completion_subtitle;

NOTIFY pgrst, 'reload schema';
