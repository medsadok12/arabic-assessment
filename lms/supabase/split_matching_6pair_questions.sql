-- تقسيم أسئلة المطابقة ذات الـ6 أزواج (L1_EX3, L1_VOC1) إلى سؤالين لكل واحد
-- (4 + 2) — بعد اعتماد حد أقصى 4 أزواج لكل سؤال مطابقة في لوحة bogga
-- (QuestionFieldEditor.jsx) وتكبير عناصر العرض في تطبيق التقييم لتلائم
-- 4 أزواج بدل 6 (ImageWordMatching.jsx). فحص مباشر قبل الكتابة أكّد وجود
-- سؤالين متأثرين بـ6 أزواج، لا سؤالاً واحداً كما افتُرض أولياً.

-- 1) إعادة ترقيم order_index لإفساح مكانين مباشرة بعد كل من L1_EX3 وL1_VOC1
UPDATE public.assessment_questions SET order_index = 4  WHERE id = 'L1_VOC1';
UPDATE public.assessment_questions SET order_index = 6  WHERE id = 'L1_EX4';
UPDATE public.assessment_questions SET order_index = 7  WHERE id = 'L1_LR';
UPDATE public.assessment_questions SET order_index = 8  WHERE id = 'L1_VC';
UPDATE public.assessment_questions SET order_index = 9  WHERE id = 'L1_VL';
UPDATE public.assessment_questions SET order_index = 10 WHERE id = 'L1_SK';
UPDATE public.assessment_questions SET order_index = 11 WHERE id = 'L1_TW';
UPDATE public.assessment_questions SET order_index = 12 WHERE id = 'L1_LC';
UPDATE public.assessment_questions SET order_index = 13 WHERE id = 'L1_SO';
UPDATE public.assessment_questions SET order_index = 14 WHERE id = 'L1_WL';
UPDATE public.assessment_questions SET order_index = 15 WHERE id = 'L1_WC';
UPDATE public.assessment_questions SET order_index = 16 WHERE id = 'L1_OA';
UPDATE public.assessment_questions SET order_index = 17 WHERE id = 'L1_WR1';
UPDATE public.assessment_questions SET order_index = 18 WHERE id = 'L1_WR2';
UPDATE public.assessment_questions SET order_index = 19 WHERE id = 'L1_GR1';
UPDATE public.assessment_questions SET order_index = 20 WHERE id = 'L1_GR2';
UPDATE public.assessment_questions SET order_index = 21 WHERE id = 'L1_GR3';

-- 2) تقليص L1_EX3 لأول 4 أزواج (كتاب/كرسي/قلم/سرير)
UPDATE public.assessment_questions
SET payload = jsonb_set(payload, '{pairs}', (payload->'pairs') - 5 - 4)
WHERE id = 'L1_EX3';
-- (- 5 - 4 تحذف العنصرين الأخيرين بترتيب تنازلي للفهرس: يُحذف الفهرس 5
--  (منزل) أولاً فتصبح المصفوفة 5 عناصر، ثم يُحذف الفهرس 4 الجديد (تفاح) —
--  فيتبقى بالضبط أول 4 عناصر: كتاب/كرسي/قلم/سرير)

-- 3) سؤال جديد بالزوجين المتبقيين من L1_EX3 (تفاح/منزل)
INSERT INTO public.assessment_questions (id, level, skill, type, order_index, shuffle_within_level, enabled, weight, payload)
VALUES (
  'L1_EX3_2', 1, 'vocabulary', 'image-matching', 3, false, true, 1,
  jsonb_build_object(
    'text', 'اِرْبِطِ الصُّورَةَ بِالْكَلِمَةِ الْمُنَاسِبَة',
    'pairs', jsonb_build_array(
      jsonb_build_object('id','tuffah','name','تُفَّاح','emoji','🍎'),
      jsonb_build_object('id','manzil','name','مَنْزِل','emoji','🏠')
    )
  )
);

-- 4) تقليص L1_VOC1 لأول 4 أزواج (قطة/كلب/أسد/أرنب)
UPDATE public.assessment_questions
SET payload = jsonb_set(payload, '{pairs}', (payload->'pairs') - 5 - 4)
WHERE id = 'L1_VOC1';

-- 5) سؤال جديد بالزوجين المتبقيين من L1_VOC1 (سمكة/عصفور)
INSERT INTO public.assessment_questions (id, level, skill, type, order_index, shuffle_within_level, enabled, weight, payload)
VALUES (
  'L1_VOC1_2', 1, 'vocabulary', 'image-matching', 5, false, true, 1,
  jsonb_build_object(
    'text', 'اِرْبِطِ صُورَةَ الْحَيَوَانِ بِاسْمِهِ',
    'pairs', jsonb_build_array(
      jsonb_build_object('id','samaka','name','سَمَكَة','emoji','🐟'),
      jsonb_build_object('id','usfour','name','عُصْفُور','emoji','🐦')
    )
  )
);

NOTIFY pgrst, 'reload schema';
