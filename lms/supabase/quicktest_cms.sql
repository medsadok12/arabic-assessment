-- ================================================================
-- quicktest_cms — لوحة إدارة "اختبار تحديد المستوى" التسويقي
-- ================================================================
-- يحوّل بنك أسئلة القمع التسويقي (src/quicktest/blueprint.js في مستودع
-- arabic-assessment) من محتوى ثابت في الكود إلى جداول يديرها الأستاذ محمد
-- عبر لوحة bogga، بنفس فلسفة assessment_questions.sql (CMS التقييم
-- الحقيقي) — لكن بمخطط أبسط عمداً: نوع سؤال واحد فقط (اختيار من متعدد
-- بوسائط اختيارية)، فلا حاجة لعمود `type`/`payload` متعدد الأشكال — عمود
-- `options` (jsonb) وحده يكفي بدل جدولين منفصلين questions/options، لأن
-- الخيارات تُجلب وتُعرَض معاً دائماً (لا فائدة من التطبيع الكامل هنا).
-- blueprint.js يبقى **نسخة احتياطية ثابتة** (لا يُحذف) — يُستخدَم تلقائياً
-- عند أي فشل في القراءة من هذا الجدول، تماماً كما يفعل buildLevelDataStatic
-- لبنك التقييم الحقيقي.
--
-- ملاحظة أمنية: RLS تُمنَع بالكامل عن anon/authenticated — القراءة العامة
-- (من الزوار بلا تسجيل دخول) تمر حصراً عبر api/quicktest-questions.js
-- (دالة خادم بـservice_role، بلا كاش)، والكتابة عبر مسارات bogga الإدارية
-- المحمية بـ`requireAdmin`.
-- ================================================================

-- 1) الأسئلة
CREATE TABLE IF NOT EXISTS public.quicktest_questions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index      INTEGER      NOT NULL DEFAULT 0,
  question_text    TEXT         NOT NULL,
  image_url        TEXT,                    -- صورة مرفوعة فعلياً (Supabase Storage) — أولوية على prompt_emoji
  audio_url        TEXT,                    -- ملف صوتي مرفوع فعلياً — أولوية على audio_prompt (TTS)
  prompt_emoji     TEXT,                    -- "صورة" سريعة بلا رفع (إيموجي) — نفس نمط image-matching الموجود أصلاً في المنصة
  audio_prompt     TEXT,                    -- نص يُنطَق عبر TTS إن لم يوجد audio_url
  reading_text     TEXT,                    -- فقرة قراءة تُعرض أعلى السؤال (أسئلة الاستيعاب القرائي)
  parent_read_hint BOOLEAN      NOT NULL DEFAULT false,
  skill_tag        TEXT,                    -- تصنيف تنظيمي فقط (تمييز بصري/استيعاب قرائي/...) — لا يدخل في منطق الاحتساب
  options          JSONB        NOT NULL DEFAULT '[]'::jsonb,  -- [{ text, emoji?, correct }]
  enabled          BOOLEAN      NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quicktest_questions_order_idx
  ON public.quicktest_questions (order_index) WHERE enabled = true;

ALTER TABLE public.quicktest_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_anon"          ON public.quicktest_questions;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.quicktest_questions;
CREATE POLICY "deny_direct_anon"          ON public.quicktest_questions AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.quicktest_questions AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 2) المستويات — حدود نقاط قابلة للتعديل (لا مواضع أسئلة ثابتة، فالأسئلة
--    نفسها قابلة للإضافة/الحذف/إعادة الترتيب من نفس اللوحة، فأي منطق
--    مبني على "السؤال رقم 6 إلى 10" كان سينكسر فوراً مع أول تعديل).
CREATE TABLE IF NOT EXISTS public.quicktest_levels (
  id               TEXT         PRIMARY KEY,   -- 'buds' | 'explorers' | 'creators' (أو أي مستوى جديد يُضاف)
  sort_order       INTEGER      NOT NULL DEFAULT 0,
  icon             TEXT         NOT NULL DEFAULT '⭐',
  label            TEXT         NOT NULL,
  min_correct      INTEGER      NOT NULL,
  max_correct      INTEGER      NOT NULL,
  strengths_text   TEXT         NOT NULL DEFAULT '',
  recommendation   TEXT         NOT NULL DEFAULT '',
  program_name     TEXT         NOT NULL DEFAULT '',
  program_pitch    TEXT         NOT NULL DEFAULT '',
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT quicktest_levels_range_valid CHECK (min_correct <= max_correct)
);

ALTER TABLE public.quicktest_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_anon"          ON public.quicktest_levels;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.quicktest_levels;
CREATE POLICY "deny_direct_anon"          ON public.quicktest_levels AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.quicktest_levels AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 3) إعدادات عامة (صف واحد ثابت) — قالب رسالة واتساب القابل للتعديل
CREATE TABLE IF NOT EXISTS public.quicktest_settings (
  id                 SMALLINT     PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- صف وحيد دائماً
  whatsapp_template  TEXT         NOT NULL DEFAULT 'مرحباً أستاذ، أكمل طفلي {childName} التقييم وأود الاستفسار عن {program}',
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.quicktest_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_anon"          ON public.quicktest_settings;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.quicktest_settings;
CREATE POLICY "deny_direct_anon"          ON public.quicktest_settings AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.quicktest_settings AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 4) بذور — نفس محتوى blueprint.js الحالي حرفياً، وحدود النقاط كما حدَّدها
--    الأستاذ محمد (0-5 / 6-10 / 11-15)، حتى تبدأ اللوحة من نفس التجربة
--    الحيّة المنشورة اليوم لا من صفر.
INSERT INTO public.quicktest_levels (id, sort_order, icon, label, min_correct, max_correct, strengths_text, recommendation, program_name, program_pitch) VALUES
  ('buds',      1, '🌱', 'مستوى البراعم',      0,  5,  'مهارات الاستماع والتمييز البصري جيدة',
   'يحتاج إلى التركيز على التأسيس القرائي، معرفة الحروف، وربطها لتكوين الكلمات الأولى.',
   'برنامج البراعم للتأسيس القرائي', 'ليتمكن من قراءة كلماته الأولى بطلاقة خلال أسابيع قليلة'),
  ('explorers', 2, '🔍', 'مستوى المستكشفين',  6,  10, 'قدرة جيدة على قراءة الكلمات والجمل القصيرة',
   'يحتاج إلى تطوير مهارات الاستيعاب القرائي، التدريب على التراكيب النحوية البسيطة، وإغناء الرصيد اللغوي.',
   'برنامج المستكشفين لبناء الطلاقة القرائية', 'ليقرأ كلمات وجملاً كاملة بثقة ووضوح'),
  ('creators',  3, '✍️', 'مستوى المبدعين',    11, 15, 'مستوى متقدم في القراءة والفهم والاستنتاج',
   'جاهز لتطوير مهارات التعبير الكتابي والشفهي، دراسة القواعد اللغوية المتقدمة، وقراءة نصوص أطول وأكثر تعقيداً.',
   'برنامج المبدعين لتعزيز الاستيعاب والتعبير', 'ليقرأ نصوصاً أطول بفهم عميق ويعبّر عن أفكاره بلغة عربية سليمة')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quicktest_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ملاحظة تقنية: id هذا الجدول UUID عشوائي بلا عمود آخر فريد، فـ
-- ON CONFLICT DO NOTHING لا يمنع تكراراً حقيقياً عند إعادة تشغيل هذا
-- الملف (كل صف يولّد UUID جديداً دائماً). الحارس الفعلي هو شرط
-- WHERE NOT EXISTS أدناه — يُدرِج البذور مرة واحدة فقط إن كان الجدول
-- فارغاً بالكامل وقت التنفيذ.
INSERT INTO public.quicktest_questions (order_index, question_text, prompt_emoji, audio_prompt, reading_text, parent_read_hint, skill_tag, options)
SELECT * FROM (VALUES
  (1,  'استمعْ جيداً، ثم اختر الصورة التي تبدأ بهذا الصوت', NULL, 'بَ', NULL, false, 'تمييز سمعي',
   '[{"emoji":"🦆","text":"بطة","correct":true},{"emoji":"🍎","text":"تفاحة","correct":false},{"emoji":"🐘","text":"فيل","correct":false}]'::jsonb),
  (2,  'استمعْ للسؤال، ثم اختر الصورة الصحيحة', NULL, 'أين القطة؟', NULL, false, 'فهم مسموع',
   '[{"emoji":"🐱","text":"قطة","correct":true},{"emoji":"🐶","text":"كلب","correct":false},{"emoji":"🐦","text":"عصفور","correct":false}]'::jsonb),
  (3,  'أيُّ حرف من هذه الحروف هو (م)؟', NULL, NULL, NULL, true, 'تمييز بصري',
   '[{"text":"مـ","correct":true},{"text":"بـ","correct":false},{"text":"سـ","correct":false}]'::jsonb),
  (4,  'ماذا يفعل الطفل في الصورة؟', '🧒💧', NULL, NULL, false, 'فهم بصري',
   '[{"emoji":"💧","text":"يشرب","correct":true},{"emoji":"💤","text":"ينام","correct":false},{"emoji":"🏃","text":"يركض","correct":false}]'::jsonb),
  (5,  'أين ذهبت مريم؟', NULL, 'ذهبت مريم إلى الحديقة ولعبت بالكرة', NULL, false, 'استخلاص معلومة',
   '[{"emoji":"🌳","text":"إلى الحديقة","correct":true},{"emoji":"🏫","text":"إلى المدرسة","correct":false},{"emoji":"🏠","text":"إلى البيت","correct":false}]'::jsonb),
  (6,  'اختر الحرف الناقص لتكتمل الكلمة: شـ ... ـس', '☀️', NULL, NULL, false, 'تهجئة',
   '[{"text":"م","correct":true},{"text":"ر","correct":false},{"text":"ل","correct":false}]'::jsonb),
  (7,  'اختر الجملة التي تعبّر عن الصورة', '👧🎨🌸', NULL, NULL, false, 'قراءة وربط',
   '[{"text":"ترسمُ البنتُ زهرةً","correct":true},{"text":"تأكلُ البنتُ تفاحةً","correct":false},{"text":"تلعبُ البنتُ بالكرةِ","correct":false}]'::jsonb),
  (8,  'أكمل الجملة: أحمدُ .......... الحليبَ كلَّ صباحٍ.', NULL, NULL, NULL, false, 'تراكيب أساسية',
   '[{"text":"يشربُ","correct":true},{"text":"تشربُ","correct":false},{"text":"يشربون","correct":false}]'::jsonb),
  (9,  'ما الكلمة التي تعني مكاناً نزرع فيه الأشجار والزهور؟', NULL, NULL, NULL, false, 'رصيد لغوي',
   '[{"text":"حديقة","correct":true},{"text":"مطبخ","correct":false},{"text":"فصل","correct":false}]'::jsonb),
  (10, 'رتّب الكلمات التالية لتكوين جملة صحيحة: (في / يلعبُ / الأطفالُ / الحديقةِ)', NULL, NULL, NULL, false, 'بناء الجملة',
   '[{"text":"يلعبُ الأطفالُ في الحديقةِ","correct":true},{"text":"الأطفالُ يلعبُ في الحديقةِ","correct":false},{"text":"الحديقةِ يلعبُ الأطفالُ","correct":false}]'::jsonb),
  (11, 'لماذا كان عمر مسروراً؟', NULL, NULL, 'عاد عمر من المدرسة مسروراً؛ لأنه حصل على وسام التفوق في اللغة العربية.', false, 'فهم قرائي',
   '[{"text":"لأنه حصل على وسام التفوق","correct":true},{"text":"لأنه ذهب مع أصدقائه","correct":false},{"text":"لأنه تناول طعامه المفضل","correct":false}]'::jsonb),
  (12, 'من النص السابق، ما الكلمة الأقرب في المعنى لكلمة «مسروراً»؟', NULL, NULL, 'عاد عمر من المدرسة مسروراً؛ لأنه حصل على وسام التفوق في اللغة العربية.', false, 'مترادفات',
   '[{"text":"سعيداً","correct":true},{"text":"حزيناً","correct":false},{"text":"غاضباً","correct":false}]'::jsonb),
  (13, 'لماذا ارتدى خالد معطفه؟', NULL, NULL, 'كان الجو بارداً جداً، لذلك ارتدى خالد معطفه السميك قبل الخروج.', false, 'سبب ونتيجة',
   '[{"text":"لأن الجو كان بارداً","correct":true},{"text":"لأنه اشترى معطفاً جديداً","correct":false},{"text":"لأنه ذاهب إلى المدرسة","correct":false}]'::jsonb),
  (14, 'اختر الجملة الصحيحة لغوياً', NULL, NULL, NULL, false, 'تراكيب متقدمة',
   '[{"text":"الطالباتُ يكتبنَ الدرسَ","correct":true},{"text":"الطالباتُ يكتبونَ الدرسَ","correct":false},{"text":"الطالباتُ يكتبُ الدرسَ","correct":false}]'::jsonb),
  (15, 'أيُّ جملة تعبّر بصورة صحيحة عن المحافظة على البيئة؟', NULL, NULL, NULL, false, 'فهم شامل',
   '[{"text":"نحافظ على نظافة المكان ولا نرمي النفايات","correct":true},{"text":"نرمي النفايات في الشارع","correct":false},{"text":"نترك النفايات في الحديقة","correct":false}]'::jsonb)
) AS seed(order_index, question_text, prompt_emoji, audio_prompt, reading_text, parent_read_hint, skill_tag, options)
WHERE NOT EXISTS (SELECT 1 FROM public.quicktest_questions);

NOTIFY pgrst, 'reload schema';
