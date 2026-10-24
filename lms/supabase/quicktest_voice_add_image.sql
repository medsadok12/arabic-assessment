-- ================================================================
-- إضافة عمود image_url لجمل القراءة الجهرية — يسمح برفع صورة حقيقية بدل
-- الإيموجي فقط (بنفس أولوية image_url على emoji المعتمدة أصلاً في
-- quicktest_matching_pairs/quicktest_questions). emoji يبقى NOT NULL
-- (يُستخدَم كبديل سريع بلا رفع، ولا حاجة لتخفيف القيد).
-- ================================================================

ALTER TABLE public.quicktest_voice_sentences
  ADD COLUMN IF NOT EXISTS image_url TEXT;

NOTIFY pgrst, 'reload schema';
