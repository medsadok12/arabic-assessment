-- ════════════════════════════════════════════════════════════════
-- عجلة الكلمات v2 — محتوى البداية (بعد word_wheel_v2.sql، وبعد نشر الكود الجديد)
--
-- 1) عجلات التحدي العشرون الموجودة (عجلات المنصة، كلماتها فارغة) تأخذ مرحلتها
--    وترتيبها وكلماتها من DEFAULT_CATALOG — فقط إن بقيت فارغة (لا تمسّ تعديل معلم).
-- 2) ست عجلات للنمطين الجديدين: «اكتشف الكلمة من الصورة» و«أكمل الكلمة الناقصة».
-- 3) 54 بطاقة تعلّم (الكلمة مشكولة + رمز + شرح + تلميح) — لا تُستبدل بطاقة موجودة.
-- آمن لإعادة التشغيل. يُولَّد من محتوى البداية المتحقَّق منه (كل كلمة تُكوَّن من حروف عجلتها).
-- ════════════════════════════════════════════════════════════════

-- 1) عجلات التحدي الموجودة
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 1, sort_order = 0, valid_words = '["تمر","سمك","نمر","رمل","سلم","مدرس","مكتب","مسكن"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'م' AND outer_letters = '["ك","ت","ب","ر","س","ن","ل","د"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 1, sort_order = 1, valid_words = '["لعب","ملك","علم","نمل","رمل","لبن","ملعب","تعلم"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ل' AND outer_letters = '["ع","ب","م","ك","ت","ر","ف","ن"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 1, sort_order = 2, valid_words = '["نسر","برد","كرم","درس","رمل","سكر","ركب","مدرس","منبر"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ر' AND outer_letters = '["د","م","س","ب","ن","ك","ت","ل"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 1, sort_order = 3, valid_words = '["نمر","نسر","نبت","لبن","سمن","فرن","نبل","منبر","تمرن"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ن' AND outer_letters = '["م","ل","ر","س","ب","ع","ت","ف"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 1, sort_order = 4, valid_words = '["سمك","نسر","سلم","مسكن","ملبس","سبع","سكن","كنس","تسمع"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'س' AND outer_letters = '["م","ر","ل","ن","ت","ب","ع","ك"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 2, sort_order = 0, valid_words = '["لعب","علم","عمل","فعل","شعر","عقل","ملعب","مربع","تعلم"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ع' AND outer_letters = '["ل","م","ب","ر","ق","ش","ف","ت"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 2, sort_order = 1, valid_words = '["قمر","قلب","عقل","نقل","بقل","سبق","قرن"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ق' AND outer_letters = '["ر","ل","م","ب","س","ن","ت","ع"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 2, sort_order = 2, valid_words = '["فرن","فكر","فلك","ملف","كتف","فعل","فرع","تفكر","تفرع"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ف' AND outer_letters = '["ر","م","ع","ل","ت","ن","ك","ب"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 2, sort_order = 3, valid_words = '["بحر","محل","ملح","لحم","سبح","حبل","حمل","مسبح","حلب"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ح' AND outer_letters = '["م","ب","ر","ل","س","ن","ت","ك"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 2, sort_order = 4, valid_words = '["شمس","شبل","شعر","نشر","بشر","شمع","شعب","شرق","قشر","مشرق","منشر"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ش' AND outer_letters = '["ر","م","س","ع","ق","ل","ب","ن"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 3, sort_order = 0, valid_words = '["خبر","بخل","خلق","خشب","خلع","بخر","مخبر","تخلق"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'خ' AND outer_letters = '["ر","م","ب","ل","ع","ش","ق","ت"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 3, sort_order = 1, valid_words = '["ذكر","بذل","نبذ","مذكر","تذكر","منذر"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ذ' AND outer_letters = '["ر","م","ك","ب","ل","ع","ت","ن"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 3, sort_order = 2, valid_words = '["غنم","نغم","بلغ","فرغ","شغل","غمر","مغرب","شغف","مشغل"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'غ' AND outer_letters = '["ر","م","ب","ل","ع","ش","ف","ن"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 3, sort_order = 3, valid_words = '["ضرب","عرض","ضمن","بعض","تضمن","ضلع","مضرب"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ض' AND outer_letters = '["ر","م","ب","ل","ع","ك","ن","ت"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 3, sort_order = 4, valid_words = '["طبل","طيب","طير","بطل","طلب","طلع","مطلع","طمر"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ط' AND outer_letters = '["ر","م","ب","ل","ع","ك","ن","ي"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 4, sort_order = 0, valid_words = '["ظفر","ظلم","عظم","نظر","ظرف","لفظ","منظر"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ظ' AND outer_letters = '["ر","م","ب","ل","ع","ك","ن","ف"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 4, sort_order = 1, valid_words = '["ثعلب","ثمر","ثمن","لبث","بعث"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ث' AND outer_letters = '["ر","م","ب","ل","ع","ك","ف","ن"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 4, sort_order = 2, valid_words = '["جمل","جبل","نجم","فجر","برج","عجل","رجل","منجل"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ج' AND outer_letters = '["ر","م","ب","ل","ع","ك","ف","ن"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 4, sort_order = 3, valid_words = '["صبر","نصر","صفر","صلب","صنف","نصل","فصل","عصر","مصنع","منصب"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ص' AND outer_letters = '["ر","م","ب","ل","ع","ك","ف","ن"]'::jsonb AND valid_words = '[]'::jsonb;
UPDATE public.word_wheel_configs SET mode = 'challenge', level = 4, sort_order = 4, valid_words = '["رمز","كنز","زمن","نزل","فرز","برز","ركز","منزل","مركز"]'::jsonb, updated_at = now()
  WHERE created_by IS NULL AND center_letter = 'ز' AND outer_letters = '["ر","م","ب","ل","ع","ك","ف","ن"]'::jsonb AND valid_words = '[]'::jsonb;

-- 2) عجلات النمطين الجديدين (عجلات منصة: يعدّلها المعلمون، ويحذفها المدير)
INSERT INTO public.word_wheel_configs (name, mode, level, sort_order, center_letter, outer_letters, valid_words, time_seconds, is_active, settings)
SELECT '🐾 حيوانات الغابة', 'picture', 1, 1, 'م', '["س","ك","ن","ر","ج","ل"]'::jsonb, '["سمك","نمر","جمل","نسر"]'::jsonb, 0, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.word_wheel_configs WHERE name = '🐾 حيوانات الغابة' AND mode = 'picture');
INSERT INTO public.word_wheel_configs (name, mode, level, sort_order, center_letter, outer_letters, valid_words, time_seconds, is_active, settings)
SELECT '🌞 من الطبيعة حولنا', 'picture', 1, 2, 'م', '["ش","س","ق","ر","ب","ح","ن","ج"]'::jsonb, '["شمس","قمر","بحر","نجم"]'::jsonb, 0, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.word_wheel_configs WHERE name = '🌞 من الطبيعة حولنا' AND mode = 'picture');
INSERT INTO public.word_wheel_configs (name, mode, level, sort_order, center_letter, outer_letters, valid_words, time_seconds, is_active, settings)
SELECT '✏️ أشياء نحبها', 'picture', 1, 3, 'ل', '["ق","م","ع","ك","ح","ب"]'::jsonb, '["قلم","علم","ملك","حبل"]'::jsonb, 0, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.word_wheel_configs WHERE name = '✏️ أشياء نحبها' AND mode = 'picture');
INSERT INTO public.word_wheel_configs (name, mode, level, sort_order, center_letter, outer_letters, valid_words, time_seconds, is_active, settings)
SELECT '🍞 على المائدة', 'picture', 1, 4, 'ل', '["ب","ن","م","ح","خ","ز"]'::jsonb, '["لبن","ملح","خبز","لحم"]'::jsonb, 0, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.word_wheel_configs WHERE name = '🍞 على المائدة' AND mode = 'picture');
INSERT INTO public.word_wheel_configs (name, mode, level, sort_order, center_letter, outer_letters, valid_words, time_seconds, is_active, settings)
SELECT '🧩 أكمل الحرف الناقص', 'complete', 1, 1, 'ر', '["أ","ن","ب","ق","ط","ا","ش","ج","ة","ل"]'::jsonb, '["أرنب","قطار","شجرة","جبل"]'::jsonb, 0, true, '{"complete_style":"missing"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.word_wheel_configs WHERE name = '🧩 أكمل الحرف الناقص' AND mode = 'complete');
INSERT INTO public.word_wheel_configs (name, mode, level, sort_order, center_letter, outer_letters, valid_words, time_seconds, is_active, settings)
SELECT '🦆 خمّن من التلميح', 'complete', 1, 2, 'ط', '["ق","ة","ب","ف","ي","ل","د","ك"]'::jsonb, '["قطة","بطة","فيل","ديك"]'::jsonb, 0, true, '{"complete_style":"hint"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.word_wheel_configs WHERE name = '🦆 خمّن من التلميح' AND mode = 'complete');

-- 3) بطاقات التعلّم
INSERT INTO public.word_wheel_words (word, vocalized, emoji, definition, hint) VALUES
  ('سمك', 'سَمَك', '🐟', 'حيوانٌ يعيشُ في الماءِ ويسبحُ بزعانفِهِ الصغيرة.', 'يعيشُ في الماءِ ويسبح'),
  ('نمر', 'نَمِر', '🐯', 'قطٌّ كبيرٌ وقويٌّ، فروُهُ مخطَّطٌ بالأسودِ والبرتقالي.', 'حيوانٌ قويٌّ مخطَّطُ الفرو'),
  ('جمل', 'جَمَل', '🐫', 'سفينةُ الصحراء! يمشي طويلاً ويصبرُ على العطش.', 'سفينةُ الصحراء'),
  ('نسر', 'نَسْر', '🦅', 'طائرٌ قويٌّ يطيرُ عالياً في السماءِ، ونظرُهُ حادٌّ جداً.', 'طائرٌ قويٌّ يطيرُ عالياً'),
  ('شمس', 'شَمْس', '☀️', 'نجمٌ كبيرٌ يُضيءُ لنا النهارَ ويُدفِئُ الأرض.', 'تُضيءُ لنا النهار'),
  ('قمر', 'قَمَر', '🌙', 'يُنيرُ السماءَ ليلاً، ويتغيّرُ شكلُهُ من ليلةٍ إلى أخرى.', 'يُنيرُ السماءَ ليلاً'),
  ('بحر', 'بَحْر', '🌊', 'ماءٌ كثيرٌ مالحٌ تعيشُ فيه الأسماكُ والحيتان.', 'ماءٌ كثيرٌ مالح'),
  ('نجم', 'نَجْم', '⭐', 'نقطةٌ لامعةٌ نراها في السماءِ ليلاً.', 'يلمعُ في السماءِ ليلاً'),
  ('قلم', 'قَلَم', '✏️', 'نكتبُ به ونرسمُ على الورق.', 'نكتبُ به على الورق'),
  ('علم', 'عَلَم', '🚩', 'قطعةُ قماشٍ ملوّنةٌ ترمزُ إلى الوطن، نرفعُها عالياً.', 'نرفعُهُ عالياً ويرمزُ إلى الوطن'),
  ('ملك', 'مَلِك', '👑', 'يحكمُ البلادَ ويلبسُ التاجَ على رأسِه.', 'يلبسُ التاجَ على رأسِه'),
  ('حبل', 'حَبْل', '🪢', 'خيطٌ طويلٌ وقويٌّ، نربطُ به الأشياءَ ونقفزُ عليه.', 'نقفزُ عليه ونربطُ به'),
  ('لبن', 'لَبَن', '🥛', 'شرابٌ أبيضُ لذيذٌ يجعلُ عظامَنا قويّة.', 'شرابٌ أبيضُ لذيذ'),
  ('ملح', 'مِلْح', '🧂', 'حبيباتٌ بيضاءُ صغيرةٌ تجعلُ الطعامَ لذيذاً.', 'حبيباتٌ بيضاءُ نضعُها في الطعام'),
  ('خبز', 'خُبْز', '🍞', 'نصنعُهُ من الدقيقِ في الفرن، ونأكلُهُ كلَّ يوم.', 'نصنعُهُ في الفرنِ كلَّ يوم'),
  ('لحم', 'لَحْم', '🍖', 'طعامٌ مفيدٌ يمنحُنا القوّةَ لننموَ ونلعب.', 'طعامٌ يمنحُنا القوّة'),
  ('أرنب', 'أَرْنَب', '🐰', 'حيوانٌ لطيفٌ بأذنينِ طويلتين، يحبُّ الجزرَ ويقفزُ بسرعة.', 'يحبُّ الجزرَ ويقفزُ بسرعة'),
  ('قطار', 'قِطَار', '🚂', 'عرباتٌ طويلةٌ متّصلةٌ تسيرُ على سكّةِ الحديد.', 'يسيرُ على سكّةِ الحديد'),
  ('شجرة', 'شَجَرَة', '🌳', 'تنمو من بذرةٍ صغيرة، وتعطينا الظلَّ والثمارَ والهواءَ النقي.', 'تعطينا الظلَّ والثمار'),
  ('جبل', 'جَبَل', '⛰️', 'أرضٌ عاليةٌ جداً، نصعدُ إليها فنرى كلَّ شيءٍ صغيراً.', 'أرضٌ عاليةٌ جداً'),
  ('قطة', 'قِطَّة', '🐱', 'حيوانٌ أليفٌ ناعمُ الفرو، تقولُ: مياو!', 'حيوانٌ أليفٌ يقولُ «مياو» — من 3 حروف'),
  ('بطة', 'بَطَّة', '🦆', 'طائرٌ يسبحُ في البركةِ ويقولُ: كواك كواك!', 'طائرٌ يسبحُ في البركة — من 3 حروف'),
  ('فيل', 'فِيل', '🐘', 'أكبرُ حيوانٍ على اليابسة، وله خرطومٌ طويل — مثلُ صديقِنا فهيم!', 'حيوانٌ كبيرٌ له خرطومٌ طويل — من 3 حروف'),
  ('ديك', 'دِيك', '🐓', 'يصيحُ في الصباحِ الباكر: كوكوكوكو!', 'يصيحُ في الصباحِ الباكر — من 3 حروف'),
  ('تمر', 'تَمْر', '🌴', 'ثمرُ النخلةِ الحلوُ اللذيذ.', 'ثمرُ النخلةِ الحلو'),
  ('رمل', 'رَمْل', '🏖️', 'حبيباتٌ صغيرةٌ ناعمةٌ على الشاطئِ وفي الصحراء.', 'حبيباتٌ ناعمةٌ على الشاطئ'),
  ('سلم', 'سُلَّم', '🪜', 'درجاتٌ نصعدُ عليها إلى الأعلى.', 'نصعدُ عليه إلى الأعلى'),
  ('نمل', 'نَمْل', '🐜', 'حشراتٌ صغيرةٌ نشيطةٌ تعملُ معاً كفريقٍ واحد.', 'حشراتٌ صغيرةٌ نشيطة'),
  ('قلب', 'قَلْب', '❤️', 'يضخُّ الدمَ في أجسامِنا، ويخفقُ دائماً.', 'يخفقُ في صدورِنا'),
  ('كنز', 'كَنْز', '💎', 'صندوقٌ مليءٌ بالأشياءِ الثمينة!', 'صندوقٌ مليءٌ بالأشياءِ الثمينة'),
  ('طبل', 'طَبْل', '🥁', 'آلةٌ موسيقيةٌ نقرعُ عليها: دُم دُم!', 'آلةٌ نقرعُ عليها'),
  ('طير', 'طَيْر', '🐦', 'يطيرُ بجناحيهِ ويغرّدُ على الأشجار.', 'يطيرُ ويغرّد'),
  ('درس', 'دَرْس', '📚', 'ما نتعلّمُهُ مع المعلّمِ في الصف.', 'نتعلّمُهُ في الصف'),
  ('مدرس', 'مُدَرِّس', '👨‍🏫', 'يعلّمُنا في المدرسةِ ويشرحُ لنا الدروس.', 'يعلّمُنا في الصف'),
  ('مكتب', 'مَكْتَب', '🪑', 'طاولةٌ نجلسُ إليها لنكتبَ ونقرأ.', 'نجلسُ إليه لنكتب'),
  ('مسكن', 'مَسْكَن', '🏠', 'البيتُ الذي نسكنُ فيه مع عائلتِنا.', 'البيتُ الذي نعيشُ فيه'),
  ('لعب', 'لَعِبَ', '⚽', 'مرحَ ولها: لَعِبَ الطفلُ بالكرةِ مع أصدقائِه.', 'ما نفعلُهُ في وقتِ المرح'),
  ('ملعب', 'مَلْعَب', '🏟️', 'مكانٌ واسعٌ نلعبُ فيه الكرةَ ونجري.', 'مكانٌ واسعٌ نلعبُ فيه الكرة'),
  ('تعلم', 'تَعَلَّمَ', '📖', 'عرفَ شيئاً جديداً: تَعَلَّمَ الطفلُ القراءة.', 'عرفَ شيئاً جديداً'),
  ('برد', 'بَرْد', '🥶', 'ما نشعرُ به في الشتاءِ فنلبسُ المعطف.', 'نشعرُ به في الشتاء'),
  ('كرم', 'كَرَم', '🤲', 'أن نعطيَ الآخرينَ ونشاركَهم بحبّ.', 'العطاءُ ومشاركةُ الآخرين'),
  ('سكر', 'سُكَّر', '🍬', 'حبيباتٌ بيضاءُ حلوةٌ نضعُها في العصيرِ والحلوى.', 'حبيباتٌ حلوةُ الطعم'),
  ('ركب', 'رَكِبَ', '🚲', 'صعدَ ليسيرَ بها: رَكِبَ الولدُ دراجتَه.', 'صعدَ على الدراجةِ ليسير'),
  ('منبر', 'مِنْبَر', '🕌', 'مكانٌ مرتفعٌ يقفُ عليه الخطيبُ ليتحدّثَ إلى الناس.', 'يقفُ عليه الخطيب'),
  ('نبت', 'نَبْت', '🌱', 'زرعٌ صغيرٌ أخضرُ يخرجُ من الأرض.', 'زرعٌ صغيرٌ أخضر'),
  ('سمن', 'سَمْن', '🧈', 'دهنٌ لذيذٌ نطبخُ به الطعام.', 'دهنٌ نطبخُ به الطعام'),
  ('فرن', 'فُرْن', '🔥', 'مكانٌ ساخنٌ نخبزُ فيه الخبزَ والكعك.', 'نخبزُ فيه الخبز'),
  ('نبل', 'نُبْل', '🌟', 'أخلاقٌ عاليةٌ وطيبةٌ في معاملةِ الناس.', 'أخلاقٌ عاليةٌ كريمة'),
  ('تمرن', 'تَمَرَّنَ', '🏋️', 'تدرّبَ مرّاتٍ كثيرةً حتى صارَ ماهراً.', 'تدرّبَ ليصيرَ ماهراً'),
  ('ملبس', 'مَلْبَس', '👕', 'ما نلبسُهُ من ثيابٍ جميلة.', 'ما نلبسُهُ من ثياب'),
  ('سبع', 'سَبْع', '7️⃣', 'عددٌ يأتي بعدَ ستّة: ٧.', 'العددُ الذي بعدَ ستّة'),
  ('سكن', 'سَكَنَ', '🏡', 'عاشَ في بيت: سَكَنَ الأرنبُ في جُحرِه.', 'عاشَ في بيت'),
  ('كنس', 'كَنَسَ', '🧹', 'نظّفَ الأرضَ بالمِكنسة.', 'نظّفَ الأرضَ بالمكنسة'),
  ('تسمع', 'تَسْمَع', '👂', 'تُصغي إلى الأصواتِ بأذنيك.', 'نفعلُها بالأذنين')
ON CONFLICT (word) DO NOTHING;
