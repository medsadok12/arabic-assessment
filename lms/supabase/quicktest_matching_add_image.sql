-- ================================================================
-- إضافة عمود image_url لأزواج المطابقة — يسمح برفع صورة حقيقية بدل
-- الإيموجي فقط (بطلب صريح من الأستاذ محمد)، بنفس أولوية
-- image_url على prompt_emoji المعتمدة أصلاً في quicktest_questions.
-- emoji يبقى NOT NULL (يُستخدَم كبديل سريع بلا رفع، ولا حاجة لتخفيف
-- القيد — الصفوف الحالية جميعها تملك إيموجي فعلاً).
-- ================================================================

ALTER TABLE public.quicktest_matching_pairs
  ADD COLUMN IF NOT EXISTS image_url TEXT;

NOTIFY pgrst, 'reload schema';
