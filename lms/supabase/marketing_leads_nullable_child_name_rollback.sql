-- ⚠️ تحذير: هذا الرول-باك يفشل عمداً إن وُجدت صفوف بلا child_name (أي صفوف
-- consultation_survey فعلية) — لا يُعيد NOT NULL بصمت فوق بيانات ناقصة.
-- عالِج تلك الصفوف يدوياً أولاً (حذف أو تعبئة قيمة) قبل تشغيل هذا الملف.

ALTER TABLE public.marketing_leads ALTER COLUMN child_name SET NOT NULL;

NOTIFY pgrst, 'reload schema';
