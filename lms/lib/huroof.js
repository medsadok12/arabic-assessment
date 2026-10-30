/* ════════════════════════════════════════════════════════════════
   الحروف الهجائية (/library/huroof) — المحتوى الافتراضي + تعديلات الإدارة
   DEFAULT_LETTERS نسخة احتياطية ثابتة؛ ما يعدّله المعلم/المدير يُحفظ في جدول
   huroof_letters (صف لكل حرف مُعدَّل، lms/supabase/huroof_letters.sql)
   ويُدمج فوقها عند العرض — فإن تعذّر الجلب يرى الطفل المحتوى الافتراضي بصمت.
   الصور والأصوات في Supabase Storage تحت media/huroof/ (لا base64 أبداً).
════════════════════════════════════════════════════════════════ */
import { mediaPathFromUrl } from './story-audio';
import { normalizeArabic, stripHarakat } from './huroof-spell';

export const HUROOF_BUCKET       = 'media';
export const HUROOF_PREFIX       = 'huroof/';
export const HUROOF_IMAGE_MAX_MB = 5;   // قبل التصغير في المتصفح
export const HUROOF_AUDIO_MAX_MB = 10;

export const HUROOF_TEXT_FIELDS  = ['name', 'word', 'emoji', 'sentence', 'riddle', 'answer'];
export const HUROOF_MEDIA_FIELDS = ['image_url', 'letter_audio_url', 'sentence_audio_url', 'riddle_audio_url'];
/* حقول قوائم (jsonb): null = الافتراضي، [] = لا شيء — accept: إجابات مقبولة أخرى، spell_rules: قواعد المعلم */
export const HUROOF_LIST_FIELDS  = ['accept', 'spell_rules'];
export const HUROOF_TEXT_LIMITS  = { name: 40, word: 60, emoji: 16, sentence: 300, riddle: 300, answer: 40 };
export const HUROOF_LIST_LIMITS  = { accept: 8, spell_rules: 12, item: 40, msg: 200 };
/* أعمدة الجدول كلها (للقراءة والكتابة في المسارات) */
export const HUROOF_COLUMNS = ['idx', ...HUROOF_TEXT_FIELDS, ...HUROOF_MEDIA_FIELDS, ...HUROOF_LIST_FIELDS];

/* أنواع الرفع ← بادئة اسم الملف */
export const HUROOF_UPLOAD_KINDS = { image: 'img', letter_audio: 'letter', sentence_audio: 'sentence', riddle_audio: 'riddle' };

export const HUROOF_IMAGE_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

export const DEFAULT_LETTERS = [
  { l: 'أ',  name: 'أَلِفْ',  word: 'أَسَدٌ',     emoji: '🦁', sentence: 'الأَسَدُ مَلِكُ الغَابَةْ' },
  { l: 'ب',  name: 'بَاءْ',   word: 'بَيْتٌ',     emoji: '🏠', sentence: 'البَيْتُ دَافِئٌ وَجَمِيلْ' },
  { l: 'ت',  name: 'تَاءْ',   word: 'تُفَّاحَةٌ', emoji: '🍎', sentence: 'التُّفَّاحَةُ حَمْرَاءُ وَحُلْوَةْ' },
  { l: 'ث',  name: 'ثَاءْ',   word: 'ثَعْلَبٌ',   emoji: '🦊', sentence: 'الثَّعْلَبُ حَيَوَانٌ ذَكِيٌّ وَسَرِيعْ' },
  { l: 'ج',  name: 'جِيمْ',   word: 'جَمَلٌ',     emoji: '🐫', sentence: 'الجَمَلُ سَفِينَةُ الصَّحْرَاءْ' },
  { l: 'ح',  name: 'حَاءْ',   word: 'حِصَانٌ',    emoji: '🐴', sentence: 'الحِصَانُ يَرْكُضُ بِسُرْعَةْ' },
  { l: 'خ',  name: 'خَاءْ',   word: 'خُبْزٌ',     emoji: '🍞', sentence: 'الخُبْزُ طَعَامٌ لَذِيذٌ وَمُفِيدْ' },
  { l: 'د',  name: 'دَالْ',   word: 'دَجَاجَةٌ',  emoji: '🐔', sentence: 'الدَّجَاجَةُ تَبِيضُ كُلَّ يَوْمْ' },
  { l: 'ذ',  name: 'ذَالْ',   word: 'ذِئْبٌ',     emoji: '🐺', sentence: 'الذِّئْبُ يَعِيشُ فِي الغَابَةِ البَعِيدَةْ' },
  { l: 'ر',  name: 'رَاءْ',   word: 'رُمَّانٌ',   emoji: '🌺', sentence: 'الرُّمَّانُ فَاكِهَةٌ حُلْوَةٌ وَمُفِيدَةْ' },
  { l: 'ز',  name: 'زَايْ',   word: 'زَرَافَةٌ',  emoji: '🦒', sentence: 'الزَّرَافَةُ أَطْوَلُ الحَيَوَانَاتِ عُنُقًاْ' },
  { l: 'س',  name: 'سِينْ',   word: 'سَمَكَةٌ',   emoji: '🐟', sentence: 'السَّمَكَةُ تَسْبَحُ فِي المَاءْ' },
  { l: 'ش',  name: 'شِينْ',   word: 'شَمْسٌ',     emoji: '☀️', sentence: 'الشَّمْسُ تُضِيءُ النَّهَارَ الجَمِيلْ' },
  { l: 'ص',  name: 'صَادْ',   word: 'صَقْرٌ',     emoji: '🦅', sentence: 'الصَّقْرُ يَطِيرُ عَالِيًا فِي السَّمَاءْ' },
  { l: 'ض',  name: 'ضَادْ',   word: 'ضِفْدَعٌ',   emoji: '🐸', sentence: 'الضِّفْدَعُ يَقْفِزُ بَيْنَ الأَشْجَارْ' },
  { l: 'ط',  name: 'طَاءْ',   word: 'طَائِرٌ',    emoji: '🐦', sentence: 'الطَّائِرُ يُغَنِّي فَوْقَ الشَّجَرَةْ' },
  { l: 'ظ',  name: 'ظَاءْ',   word: 'ظَبْيٌ',     emoji: '🦌', sentence: 'الظَّبْيُ يَرْعَى فِي السَّهْلِ الأَخْضَرْ' },
  { l: 'ع',  name: 'عَيْنْ',  word: 'عِنَبٌ',     emoji: '🍇', sentence: 'العِنَبُ فَاكِهَةٌ لَذِيذَةٌ وَغَنِيَّةْ' },
  { l: 'غ',  name: 'غَيْنْ',  word: 'غَزَالٌ',    emoji: '🦌', sentence: 'الغَزَالُ يَرْكُضُ بِخِفَّةٍ وَرَشَاقَةْ' },
  { l: 'ف',  name: 'فَاءْ',   word: 'فَرَسٌ',     emoji: '🐎', sentence: 'الفَرَسُ حَيَوَانٌ أَصِيلٌ وَجَمِيلْ' },
  { l: 'ق',  name: 'قَافْ',   word: 'قِطَّةٌ',    emoji: '🐱', sentence: 'القِطَّةُ تَلْعَبُ وَتَقْفِزُ بِمَرَحْ' },
  { l: 'ك',  name: 'كَافْ',   word: 'كِتَابٌ',    emoji: '📚', sentence: 'الكِتَابُ خَيْرُ صَدِيقٍ وَرَفِيقْ' },
  { l: 'ل',  name: 'لَامْ',   word: 'لَيْمُونٌ',  emoji: '🍋', sentence: 'اللَّيْمُونُ حَامِضٌ وَمُفِيدٌ لِلصِّحَّةْ' },
  { l: 'م',  name: 'مِيمْ',   word: 'مَوْزَةٌ',   emoji: '🍌', sentence: 'المَوْزَةُ صَفْرَاءُ وَطَعْمُهَا حُلْوْ' },
  { l: 'ن',  name: 'نُونْ',   word: 'نَمِرٌ',     emoji: '🐯', sentence: 'النَّمِرُ حَيَوَانٌ سَرِيعٌ وَشَجَاعْ' },
  { l: 'هـ', name: 'هَاءْ',   word: 'هِلَالٌ',    emoji: '🌙', sentence: 'الهِلَالُ يُضِيءُ اللَّيْلَ الهَادِئَ الجَمِيلْ' },
  { l: 'و',  name: 'وَاوْ',   word: 'وَرْدَةٌ',   emoji: '🌹', sentence: 'الوَرْدَةُ جَمِيلَةٌ وَعَطِرَةٌ وَرَقِيقَةْ' },
  { l: 'ي',  name: 'يَاءْ',   word: 'يَمَامَةٌ',  emoji: '🕊️', sentence: 'اليَمَامَةُ تُغَنِّي بِصَوْتٍ عَذْبٍ جَمِيلْ' },
];

export const HUROOF_COUNT = DEFAULT_LETTERS.length;

/* ── تحدّي الحروف: لغز فهيم لكل كلمة (فهيم يتكلم بلسان الشيء: «من أنا؟»)، وإجابات أخرى
   مقبولة، وقواعد جاهزة لأشهر الإجابات القريبة (مرادف أو حيوان شبيه) تعيد الطفل للكلمة
   المطلوبة بلطف. تُستعمل فقط ما دامت كلمة الحرف هي الأصلية — إن غيّرها المعلم ولم يكتب
   لغزاً يرى الطفل صورة الكلمة ويُسأل «ما اسم هذه الصورة؟» ── */
const R = (wrong, msg) => ({ wrong, msg });
export const DEFAULT_RIDDLES = [
  { riddle: 'أَنَا مَلِكُ الْغَابَةِ، وَصَوْتِي زَئِيرٌ عَالٍ. مَنْ أَنَا؟', rules: [R('ليث', 'صحيح! هذا اسم آخر للأسد 🦁 لكن اكتب اسمه المشهور الذي يبدأ بحرف الألف'), R('سبع', 'صحيح! هذا اسم آخر للأسد 🦁 لكن اكتب اسمه المشهور الذي يبدأ بحرف الألف')] },
  { riddle: 'أَسْكُنُ فِيهِ مَعَ عَائِلَتِي، لَهُ بَابٌ وَنَوَافِذُ وَسَقْفٌ. مَا هُوَ؟', rules: [R('منزل', 'صحيح! وله اسم آخر قصير يبدأ بحرف الباء 🏠'), R('دار', 'صحيح! وله اسم آخر يبدأ بحرف الباء 🏠')] },
  { riddle: 'فَاكِهَةٌ حَمْرَاءُ أَوْ خَضْرَاءُ، مُسْتَدِيرَةٌ وَمُقَرْمِشَةٌ. مَا هِيَ؟', accept: ['تفاح'] },
  { riddle: 'حَيَوَانٌ ذَكِيٌّ مَاكِرٌ، ذَيْلُهُ كَثِيفٌ وَلَوْنُهُ بُرْتُقَالِيٌّ. مَنْ أَنَا؟' },
  { riddle: 'أَنَا سَفِينَةُ الصَّحْرَاءِ، وَعَلَى ظَهْرِي سَنَامٌ. مَنْ أَنَا؟', rules: [R('ناقة', 'صحيح! واكتب اسمه المشهور الذي يبدأ بحرف الجيم 🐫'), R('بعير', 'صحيح! واكتب اسمه المشهور الذي يبدأ بحرف الجيم 🐫')] },
  { riddle: 'أَرْكُضُ بِسُرْعَةٍ، وَلِي ذَيْلٌ طَوِيلٌ، وَيَرْكَبُنِي الْفَارِسُ. مَنْ أَنَا؟', rules: [R('فرس', 'صحيح! الفرس والحصان متشابهان 🐴 لكن اكتب الاسم الذي يبدأ بحرف الحاء')] },
  { riddle: 'آكُلُهُ كُلَّ يَوْمٍ، يَصْنَعُهُ الْخَبَّازُ مِنَ الدَّقِيقِ فِي الْفُرْنِ. مَا هُوَ؟' },
  { riddle: 'أَبِيضُ كُلَّ يَوْمٍ، وَأَقُولُ: كَاكْ كَاكْ! مَنْ أَنَا؟', accept: ['دجاج'] },
  { riddle: 'أَعْوِي فِي اللَّيْلِ، وَأَعِيشُ فِي الْغَابَةِ، وَأُشْبِهُ الْكَلْبَ. مَنْ أَنَا؟', rules: [R('كلب', 'أشبه الكلب، لكني أعيش في الغابة واسمي يبدأ بحرف الذال 🐺')] },
  { riddle: 'فَاكِهَةٌ حَمْرَاءُ، فِي دَاخِلِهَا حَبَّاتٌ صَغِيرَةٌ كَثِيرَةٌ كَالْيَاقُوتِ. مَا هِيَ؟', accept: ['رمانة'] },
  { riddle: 'أَنَا أَطْوَلُ الْحَيَوَانَاتِ، وَعُنُقِي طَوِيلٌ جِدًّا. مَنْ أَنَا؟' },
  { riddle: 'أَعِيشُ فِي الْمَاءِ، وَأَسْبَحُ بِزَعَانِفِي. مَنْ أَنَا؟', accept: ['سمك'], rules: [R('حوت', 'الحوت يعيش في البحر أيضاً 🐳 لكني أصغر منه، واسمي يبدأ بحرف السين')] },
  { riddle: 'أُضِيءُ النَّهَارَ وَأُدْفِئُ الْأَرْضَ، وَأَغِيبُ فِي الْمَسَاءِ. مَنْ أَنَا؟' },
  { riddle: 'طَائِرٌ قَوِيٌّ، عَيْنَايَ حَادَّتَانِ، وَأَصْطَادُ مِنَ السَّمَاءِ. مَنْ أَنَا؟', rules: [R('نسر', 'قريب! النسر طائر قوي أيضاً 🦅 لكن اسمي يبدأ بحرف الصاد')] },
  { riddle: 'أَقْفِزُ قُرْبَ الْبِرْكَةِ، وَأَقُولُ: نَقْ نَقْ! مَنْ أَنَا؟' },
  { riddle: 'لِي جَنَاحَانِ وَرِيشٌ، أَطِيرُ فِي السَّمَاءِ وَأُغَرِّدُ. مَنْ أَنَا؟', accept: ['طير'], rules: [R('عصفور', 'العصفور نوع من الطيور 🐦 اكتب الاسم العامّ الذي يبدأ بحرف الطاء'), R('طيور', 'أحسنت! اكتبها لواحدٍ فقط 🐦')] },
  { riddle: 'حَيَوَانٌ رَشِيقٌ يُشْبِهُ الْغَزَالَ، لِي قَرْنَانِ، وَأَعِيشُ فِي الْبَرِّيَّةِ. مَنْ أَنَا؟', rules: [R('غزال', 'الظبي يشبه الغزال كثيراً 🦌 لكن اسمي يبدأ بحرف الظاء')] },
  { riddle: 'عَنَاقِيدُ حُلْوَةٌ، خَضْرَاءُ أَوْ بَنَفْسَجِيَّةٌ، يُصْنَعُ مِنِّي الزَّبِيبُ. مَا أَنَا؟', rules: [R('زبيب', 'الزبيب يُصنع مني! 🍇 فما اسمي؟ يبدأ بحرف العين')] },
  { riddle: 'حَيَوَانٌ جَمِيلٌ، عَيْنَايَ وَاسِعَتَانِ، وَأَرْكُضُ بِخِفَّةٍ فِي الصَّحْرَاءِ. مَنْ أَنَا؟', rules: [R('ظبي', 'الظبي يشبهني كثيراً 🦌 لكن اسمي يبدأ بحرف الغين')] },
  { riddle: 'أَنَا أُنْثَى الْحِصَانِ، وَأَرْكُضُ فِي السِّبَاقِ. مَنْ أَنَا؟', rules: [R('حصان', 'صحيح، أشبه الحصان 🐎 لكن اسمي يبدأ بحرف الفاء')] },
  { riddle: 'حَيَوَانٌ أَلِيفٌ فِي الْبَيْتِ، أَقُولُ: مِيَاوْ! مَنْ أَنَا؟', accept: ['قط'], rules: [R('هرة', 'صحيح! ولها اسم آخر يبدأ بحرف القاف 🐱'), R('هر', 'صحيح! وله اسم آخر يبدأ بحرف القاف 🐱'), R('بسة', 'صحيح! ولها اسم آخر يبدأ بحرف القاف 🐱')] },
  { riddle: 'لِي صَفَحَاتٌ كَثِيرَةٌ، فِيَّ قِصَصٌ وَعِلْمٌ، وَتَقْرَؤُنِي. مَا أَنَا؟', rules: [R('قصة', 'القصة تكون في داخلي 📚 فما اسمي؟ يبدأ بحرف الكاف'), R('دفتر', 'الدفتر نكتب فيه، أمّا أنا فنقرؤني 📚 اسمي يبدأ بحرف الكاف')] },
  { riddle: 'فَاكِهَةٌ صَفْرَاءُ، طَعْمُهَا حَامِضٌ جِدًّا. مَا هِيَ؟', accept: ['ليمونة'] },
  { riddle: 'فَاكِهَةٌ صَفْرَاءُ طَوِيلَةٌ، يُحِبُّهَا الْقِرْدُ، وَنُقَشِّرُهَا قَبْلَ الْأَكْلِ. مَا هِيَ؟', accept: ['موز'] },
  { riddle: 'قِطٌّ كَبِيرٌ قَوِيٌّ، جِلْدِي مُخَطَّطٌ بِالْأَسْوَدِ وَالْبُرْتُقَالِيِّ. مَنْ أَنَا؟', rules: [R('فهد', 'الفهد يشبهني، لكني مخطَّط واسمي يبدأ بحرف النون 🐯')] },
  { riddle: 'أَظْهَرُ فِي السَّمَاءِ أَوَّلَ الشَّهْرِ، رَقِيقًا كَالْقَوْسِ. مَنْ أَنَا؟', rules: [R('قمر', 'أنا القمر في أول الشهر! ولي اسم خاص يبدأ بحرف الهاء 🌙')] },
  { riddle: 'زَهْرَةٌ جَمِيلَةٌ، رَائِحَتِي عَطِرَةٌ، وَعَلَى سَاقِي أَشْوَاكٌ. مَنْ أَنَا؟', accept: ['ورد'], rules: [R('زهرة', 'صحيح، أنا زهرة! واسمي الخاص يبدأ بحرف الواو 🌹')] },
  { riddle: 'طَائِرٌ وَدِيعٌ يُشْبِهُ الْحَمَامَةَ، أَقُولُ: كُو كُو. مَنْ أَنَا؟', rules: [R('حمامة', 'أشبه الحمامة! لكن اسمي يبدأ بحرف الياء 🕊️')] },
];

/* ألغاز جاهزة لكلمات اختارها المعلم بدل الأصلية (بالإجابة بلا تشكيل) — كلمات المنصة الحية 2026-10-25:
   طاووس للطاء، غراب للغين، فيل للفاء، قط للقاف، موز للميم، هدية للهاء، يقطين للياء */
export const WORD_RIDDLES = {
  'طاووس': { riddle: 'طَائِرٌ جَمِيلٌ، أَفْتَحُ ذَيْلِي الْمُلَوَّنَ كَالْمِرْوَحَةِ. مَنْ أَنَا؟', accept: ['طاوس'], rules: [R('طائر', 'صحيح، أنا طائر! 🦚 لكن ما اسمي الخاص؟ ذيلي ملوّن كالمروحة'), R('طير', 'صحيح، أنا طير! 🦚 لكن ما اسمي الخاص؟ ذيلي ملوّن كالمروحة')] },
  'غراب':  { riddle: 'طَائِرٌ أَسْوَدُ اللَّوْنِ، أَقُولُ: قَاقْ قَاقْ! مَنْ أَنَا؟', rules: [R('طائر', 'صحيح، أنا طائر! لكن ما اسمي؟ لوني أسود واسمي يبدأ بحرف الغين 🐦‍⬛')] },
  'فيل':   { riddle: 'أَنَا أَضْخَمُ حَيَوَانٍ عَلَى الْيَابِسَةِ، لِي خُرْطُومٌ طَوِيلٌ، وَصَدِيقُكَ فَهِيمٌ يُشْبِهُنِي! مَنْ أَنَا؟', rules: [R('فهيم', 'هههه! فهيم فيل صغير 🐘 لكن ما اسم هذا الحيوان؟ يبدأ بحرف الفاء')] },
  'قط':    { riddle: DEFAULT_RIDDLES[20].riddle, accept: ['قطة'], rules: DEFAULT_RIDDLES[20].rules },
  'موز':   { riddle: DEFAULT_RIDDLES[23].riddle, accept: ['موزة'] },
  'هدية':  { riddle: 'أَكُونُ مُغَلَّفَةً بِوَرَقٍ مُلَوَّنٍ وَشَرِيطٍ جَمِيلٍ، وَتَفْرَحُ بِي فِي عِيدِ مِيلَادِكَ. مَا أَنَا؟', rules: [R('لعبة', 'قد تكون في داخلي لعبة 🎁 لكن ما اسمي؟ يبدأ بحرف الهاء')] },
  'يقطين': { riddle: 'خُضَارٌ كَبِيرَةٌ مُسْتَدِيرَةٌ بُرْتُقَالِيَّةُ اللَّوْنِ، يُصْنَعُ مِنِّي الْحَسَاءُ. مَا أَنَا؟', accept: ['يقطينة'], rules: [R('قرع', 'صحيح! ولي اسم آخر يبدأ بحرف الياء 🎃'), R('قرعة', 'صحيح! ولي اسم آخر يبدأ بحرف الياء 🎃')] },
};

/* اللغز الافتراضي لكلمة الحرف: الكلمة الأصلية (ولو اختلف تشكيلها) ← لغز الحرف؛
   كلمة جديدة معروفة ← لغزها من WORD_RIDDLES؛ وإلا لا لغز (يُسأل الطفل عن الصورة) */
function defaultsForWord(idx, word) {
  const a = answerFromWord(cleanText(word) ?? DEFAULT_LETTERS[idx]?.word ?? '');
  if (!a || a === answerFromWord(DEFAULT_LETTERS[idx]?.word ?? '')) return DEFAULT_RIDDLES[idx] || {};
  return WORD_RIDDLES[a] || {};
}

/* الافتراضي لحرف (لغز، إجابات مقبولة، قواعد) لكلمته الحالية — للمحرر */
export function riddleDefaults(idx, word) {
  const d = defaultsForWord(idx, word);
  return { riddle: d.riddle ?? '', accept: d.accept ?? [], rules: d.rules ?? [] };
}

/* الإجابة المطلوبة إملاءً من كلمة البطاقة: بلا تشكيل (الطفل لا يُحاسَب على الحركات) */
export const answerFromWord = (word) => normalizeArabic(stripHarakat(word));

/* هدف المدقق لحرف بعد الدمج (lib/huroof-spell.js → checkSpelling) */
export const huroofTarget = (letter) => ({
  word: letter.word, answer: letter.answer, accept: letter.accept, rules: letter.rules,
});

/* ── إعدادات التحدّي (game_settings، game_id = 'huroof') يحفظها المعلم/المدير ── */
export const HUROOF_GAME_ID = 'huroof';
export const HUROOF_POINTS = { letter: 2, all: 10 };   // مطابقة لـPOINT_EVENTS في /api/points
export const HUROOF_DEFAULT_SETTINGS = {
  mode: 'challenge',     // challenge: بطاقات مغلقة مخلوطة + لغز + إملاء | explore: الحروف مكشوفة مرتبة (القديم)
  show_path: true,       // مسار فهيم (28 محطة) على يسار الشاشة
  shuffle: true,         // خلط البطاقات (ثابت لكل طالب في الجولة)
  lock_current: true,    // لا يفتح بطاقة أخرى قبل حلّ اللغز المفتوح
  hints: true,           // زر «ساعدني»: الصورة ← أول حرف وعدد الحروف ← الكلمة كاملة
  accept_al: true,       // «الأسد» تُقبل لِـ«أسد»
  reveal_after: 3,       // بعد كم محاولة خاطئة تظهر الكلمة لينسخها (0 = أبداً)
  epoch: 0,              // رقم الجولة — «إعادة ضبط مسار الجميع» تزيده فيبدأ الكل من جديد
};
export function normalizeHuroofSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const d = HUROOF_DEFAULT_SETTINGS;
  const bool = (k) => (typeof r[k] === 'boolean' ? r[k] : d[k]);
  const int = (k, lo, hi) => (Number.isInteger(r[k]) && r[k] >= lo && r[k] <= hi ? r[k] : d[k]);
  return {
    mode: r.mode === 'explore' ? 'explore' : 'challenge',
    show_path: bool('show_path'), shuffle: bool('shuffle'), lock_current: bool('lock_current'),
    hints: bool('hints'), accept_al: bool('accept_al'),
    reveal_after: int('reveal_after', 0, 10), epoch: int('epoch', 0, 1e6),
  };
}
/* ما يرسله المعلم ← إعدادات صالحة (الجولة epoch لا تُعدَّل من هنا) أو null */
export function validateHuroofSettings(body, current) {
  if (!body || typeof body !== 'object') return null;
  const keys = ['mode', 'show_path', 'shuffle', 'lock_current', 'hints', 'accept_al', 'reveal_after'];
  for (const k of keys) {
    if (!(k in body)) continue;
    const v = body[k];
    if (k === 'mode' ? !['challenge', 'explore'].includes(v)
      : k === 'reveal_after' ? !(Number.isInteger(v) && v >= 0 && v <= 10)
        : typeof v !== 'boolean') return null;
  }
  const base = normalizeHuroofSettings(current);
  return normalizeHuroofSettings({ ...base, ...Object.fromEntries(keys.filter(k => k in body).map(k => [k, body[k]])), epoch: base.epoch });
}

/* ترتيب البطاقات المخلوط: ثابت لكل طالب في الجولة نفسها (لا يتبدّل كل زيارة) */
export function shuffledOrder(seed, n = HUROOF_COUNT) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const cleanText = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/* الحروف الـ28 بعد دمج تعديلات الإدارة: النص المعدَّل يحل محل الافتراضي،
   والصورة/الأصوات null حين لا توجد. صف بفهرس خارج 0..27 يُتجاهل. */
export function mergeLetters(rows) {
  const byIdx = new Map();
  (Array.isArray(rows) ? rows : []).forEach(r => {
    if (Number.isInteger(r?.idx) && r.idx >= 0 && r.idx < HUROOF_COUNT) byIdx.set(r.idx, r);
  });
  return DEFAULT_LETTERS.map((d, idx) => {
    const r = byIdx.get(idx) || {};
    const out = { ...d, idx, customized: byIdx.has(idx) };
    ['name', 'word', 'emoji', 'sentence'].forEach(f => { out[f] = cleanText(r[f]) ?? d[f]; });
    HUROOF_MEDIA_FIELDS.forEach(f => { out[f] = (typeof r[f] === 'string' && r[f]) ? r[f] : null; });
    // اللغز وقواعد الإملاء الجاهزة تتبع كلمة الحرف (الأصلية أو كلمة جديدة لها لغز جاهز)
    const def = defaultsForWord(idx, out.word);
    out.riddle = cleanText(r.riddle) ?? def.riddle ?? null;
    out.answer = cleanText(r.answer) ?? answerFromWord(out.word);
    out.accept = cleanList(r.accept) ?? def.accept ?? [];
    out.rules  = cleanRules(r.spell_rules) ?? def.rules ?? [];
    // للمحرر: أي حقول اللغز كتبها المعلم بنفسه (والباقي افتراضي)
    out.custom = { riddle: !!cleanText(r.riddle), answer: !!cleanText(r.answer), accept: Array.isArray(r.accept), rules: Array.isArray(r.spell_rules) };
    return out;
  });
}
const cleanList = (v) => (Array.isArray(v) ? v.map(cleanText).filter(Boolean) : null);
const cleanRules = (v) => (Array.isArray(v)
  ? v.filter(x => x && typeof x === 'object').map(x => ({ wrong: cleanText(x.wrong), msg: cleanText(x.msg) })).filter(x => x.wrong && x.msg)
  : null);

/* مسار التخزين من رابط عام — ويرفض أي رابط خارج مجلد الحروف */
export function huroofMediaPathFromUrl(url) {
  return mediaPathFromUrl(url, HUROOF_PREFIX);
}

/* يتحقق من تعديل وارد من العميل ويحوّله لصف قاعدة بيانات:
   { fields } أو { error }. الحقول الغائبة لا تُعاد (تحديث جزئي)،
   والنص المطابق للافتراضي أو الفارغ يُحفظ null (يبقى افتراضياً). */
export function sanitizeHuroofPatch(idx, body) {
  if (!body || typeof body !== 'object') return { error: 'بيانات غير صالحة' };
  const def = { ...DEFAULT_LETTERS[idx], riddle: DEFAULT_RIDDLES[idx]?.riddle, answer: answerFromWord(DEFAULT_LETTERS[idx].word) };
  const fields = {};
  for (const f of HUROOF_TEXT_FIELDS) {
    if (!(f in body)) continue;
    const v = body[f];
    if (v !== null && typeof v !== 'string') return { error: 'بيانات غير صالحة' };
    const t = cleanText(v);
    if (t && t.length > HUROOF_TEXT_LIMITS[f]) return { error: `النص أطول من المسموح (${HUROOF_TEXT_LIMITS[f]} حرفاً)` };
    fields[f] = t && t !== def[f] ? t : null;
  }
  // الإجابات المقبولة: قائمة كلمات — null يعني «الافتراضي»، و[] يعني «لا شيء غير الإجابة»
  if ('accept' in body) {
    const v = body.accept;
    if (v !== null && !Array.isArray(v)) return { error: 'بيانات غير صالحة' };
    if (v) {
      if (v.length > HUROOF_LIST_LIMITS.accept) return { error: `الإجابات المقبولة ${HUROOF_LIST_LIMITS.accept} على الأكثر` };
      if (v.some(x => typeof x !== 'string' || x.trim().length > HUROOF_LIST_LIMITS.item)) return { error: 'إجابة مقبولة غير صالحة' };
    }
    fields.accept = v ? [...new Set(v.map(cleanText).filter(Boolean))] : null;
  }
  // قواعد المعلم: [{ wrong: ما قد يكتبه الطفل، msg: ما يقوله فهيم }]
  if ('spell_rules' in body) {
    const v = body.spell_rules;
    if (v !== null && !Array.isArray(v)) return { error: 'بيانات غير صالحة' };
    if (v) {
      if (v.length > HUROOF_LIST_LIMITS.spell_rules) return { error: `القواعد ${HUROOF_LIST_LIMITS.spell_rules} على الأكثر` };
      for (const x of v) {
        if (!x || typeof x !== 'object' || typeof x.wrong !== 'string' || typeof x.msg !== 'string') return { error: 'قاعدة غير صالحة' };
        if (x.wrong.trim().length > HUROOF_LIST_LIMITS.item || x.msg.trim().length > HUROOF_LIST_LIMITS.msg) return { error: 'نص القاعدة أطول من المسموح' };
      }
    }
    fields.spell_rules = v ? cleanRules(v) : null;
  }
  for (const f of HUROOF_MEDIA_FIELDS) {
    if (!(f in body)) continue;
    const v = body[f];
    if (v === null || v === '') { fields[f] = null; continue; }
    if (!huroofMediaPathFromUrl(v)) return { error: 'رابط ملف غير صالح' };
    fields[f] = v;
  }
  return { fields };
}

/* بطاقة الحرف: الحرف ملوّن داخل الكلمة والجملة ليجده الطفل بعينه — يقسم النص إلى
   مقاطع { t, hl } فيُلوَّن الحرف مع حركاته. لا يُلوَّن نصف «لا» (لام+ألف تُرسمان شكلاً
   واحداً، وتلوين أحدهما يكسر الشكل) */
const HF_MARKS = /[ً-ٰٟ]/;
const HF_ALEFS = 'اأإآ';
export function highlightLetter(text, letter) {
  const s = typeof text === 'string' ? text : '';
  const target = (letter || '').replace(/[ـ]/g, '').replace(new RegExp(HF_MARKS.source, 'g'), '');
  if (!s || target.length !== 1) return s ? [{ t: s, hl: false }] : [];
  const out = [];
  const push = (t, hl) => {
    if (!t) return;
    const last = out[out.length - 1];
    if (last && last.hl === hl) last.t += t; else out.push({ t, hl });
  };
  const base = (i) => { let j = i; while (j >= 0 && HF_MARKS.test(s[j])) j--; return j; };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    let j = i + 1;
    while (j < s.length && HF_MARKS.test(s[j])) j++;
    const unit = s.slice(i, j);
    let hl = ch === target;
    if (hl && ch === 'ل' && j < s.length && HF_ALEFS.includes(s[j])) hl = false;  // لام قبل ألف
    if (hl && HF_ALEFS.includes(ch) && s[base(i - 1)] === 'ل') hl = false;          // ألف بعد لام
    push(unit, hl);
    i = j - 1;
  }
  return out;
}
