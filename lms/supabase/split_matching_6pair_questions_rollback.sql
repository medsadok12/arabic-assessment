-- يعكس split_matching_6pair_questions.sql بالكامل: يعيد الزوجين المحذوفين
-- إلى L1_EX3/L1_VOC1، يحذف السؤالين الجديدين، ويعيد order_index الأصلي.
-- آمن للتشغيل ما لم يُعدَّل L1_EX3_2/L1_VOC1_2 يدوياً بعد التقسيم.

DELETE FROM public.assessment_questions WHERE id IN ('L1_EX3_2', 'L1_VOC1_2');

UPDATE public.assessment_questions
SET payload = jsonb_set(payload, '{pairs}', (payload->'pairs') || jsonb_build_array(
  jsonb_build_object('id','tuffah','name','تُفَّاح','emoji','🍎'),
  jsonb_build_object('id','manzil','name','مَنْزِل','emoji','🏠')
))
WHERE id = 'L1_EX3';

UPDATE public.assessment_questions
SET payload = jsonb_set(payload, '{pairs}', (payload->'pairs') || jsonb_build_array(
  jsonb_build_object('id','samaka','name','سَمَكَة','emoji','🐟'),
  jsonb_build_object('id','usfour','name','عُصْفُور','emoji','🐦')
))
WHERE id = 'L1_VOC1';

UPDATE public.assessment_questions SET order_index = 3  WHERE id = 'L1_VOC1';
UPDATE public.assessment_questions SET order_index = 4  WHERE id = 'L1_EX4';
UPDATE public.assessment_questions SET order_index = 5  WHERE id = 'L1_LR';
UPDATE public.assessment_questions SET order_index = 6  WHERE id = 'L1_VC';
UPDATE public.assessment_questions SET order_index = 7  WHERE id = 'L1_VL';
UPDATE public.assessment_questions SET order_index = 8  WHERE id = 'L1_SK';
UPDATE public.assessment_questions SET order_index = 9  WHERE id = 'L1_TW';
UPDATE public.assessment_questions SET order_index = 10 WHERE id = 'L1_LC';
UPDATE public.assessment_questions SET order_index = 11 WHERE id = 'L1_SO';
UPDATE public.assessment_questions SET order_index = 12 WHERE id = 'L1_WL';
UPDATE public.assessment_questions SET order_index = 13 WHERE id = 'L1_WC';
UPDATE public.assessment_questions SET order_index = 14 WHERE id = 'L1_OA';
UPDATE public.assessment_questions SET order_index = 15 WHERE id = 'L1_WR1';
UPDATE public.assessment_questions SET order_index = 16 WHERE id = 'L1_WR2';
UPDATE public.assessment_questions SET order_index = 17 WHERE id = 'L1_GR1';
UPDATE public.assessment_questions SET order_index = 18 WHERE id = 'L1_GR2';
UPDATE public.assessment_questions SET order_index = 19 WHERE id = 'L1_GR3';

NOTIFY pgrst, 'reload schema';
