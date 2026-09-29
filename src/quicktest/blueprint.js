// ================================================================
// الاختبار التقييمي المتدرج لأكاديمية عارم — نسخة احتياطية ثابتة
// ================================================================
// هذا الملف لم يعد المصدر الحيّ — الأسئلة/المستويات أصبحت قابلة للتعديل
// من لوحة bogga (تبويب "إدارة الاختبار الترويجي") وتُخزَّن في Supabase
// (quicktest_questions/quicktest_levels/quicktest_settings). هذا الملف
// يبقى **نسخة احتياطية ثابتة فقط** — يُستخدَم تلقائياً وبصمت عند أي فشل
// في القراءة من قاعدة البيانات (راجع fetchQuicktestData.js)، تماماً كما
// يفعل questionsBank الثابت لبنك التقييم الحقيقي عند فشل مماثل.
//
// شكل البيانات هنا مطابق تماماً لما يُعيده api/quicktest-questions.js بعد
// التطبيع (camelCase) — أي تحديث هنا يجب أن يبقى بنفس الشكل حتى يعمل
// QuickQuestion.jsx/QuickTestApp.jsx بلا فرق بين المصدرين.

export const QUESTIONS = [
  // ── 🟢 المرحلة الأولى: البراعم (١-٥) ──────────────────────────────
  {
    id: 'q1',
    skillTag: 'تمييز سمعي',
    audioPrompt: 'بَ',
    text: 'استمعْ جيداً، ثم اختر الصورة التي تبدأ بهذا الصوت',
    options: [
      { emoji: '🦆', text: 'بطة',    correct: true  },
      { emoji: '🍎', text: 'تفاحة',  correct: false },
      { emoji: '🐘', text: 'فيل',    correct: false },
    ],
  },
  {
    id: 'q2',
    skillTag: 'فهم مسموع',
    audioPrompt: 'أين القطة؟',
    text: 'استمعْ للسؤال، ثم اختر الصورة الصحيحة',
    options: [
      { emoji: '🐱', text: 'قطة',     correct: true  },
      { emoji: '🐶', text: 'كلب',     correct: false },
      { emoji: '🐦', text: 'عصفور',   correct: false },
    ],
  },
  {
    id: 'q3',
    skillTag: 'تمييز بصري',
    parentReadHint: true,
    text: 'أيُّ حرف من هذه الحروف هو (م)؟',
    options: [
      { text: 'مـ', correct: true  },
      { text: 'بـ', correct: false },
      { text: 'سـ', correct: false },
    ],
  },
  {
    id: 'q4',
    skillTag: 'فهم بصري',
    promptEmoji: '🧒💧',
    text: 'ماذا يفعل الطفل في الصورة؟',
    options: [
      { emoji: '💧', text: 'يشرب', correct: true  },
      { emoji: '💤', text: 'ينام', correct: false },
      { emoji: '🏃', text: 'يركض', correct: false },
    ],
  },
  {
    id: 'q5',
    skillTag: 'استخلاص معلومة',
    audioPrompt: 'ذهبت مريم إلى الحديقة ولعبت بالكرة',
    text: 'أين ذهبت مريم؟',
    options: [
      { emoji: '🌳', text: 'إلى الحديقة', correct: true  },
      { emoji: '🏫', text: 'إلى المدرسة', correct: false },
      { emoji: '🏠', text: 'إلى البيت',   correct: false },
    ],
  },

  // ── 🟡 المرحلة الثانية: المستكشفون (٦-١٠) ─────────────────────────
  // ملاحظة: سؤال "اختر الحرف الناقص" (شمس) كان هنا سابقاً بمعرّف q6 —
  // اسُتبدل بتدريب مستقل أغنى من 3 كلمات (WORD_COMPLETION_ITEMS أدناه)
  // بطلب صريح من الأستاذ محمد، فحُذف من هذا البنك (وحُذف مقابله فعلياً من
  // quicktest_questions الحيّة) تفادياً لتكرار المحتوى.
  {
    id: 'q7',
    skillTag: 'قراءة وربط',
    promptEmoji: '👧🎨🌸',
    text: 'اختر الجملة التي تعبّر عن الصورة',
    options: [
      { text: 'ترسمُ البنتُ زهرةً',   correct: true  },
      { text: 'تأكلُ البنتُ تفاحةً',  correct: false },
      { text: 'تلعبُ البنتُ بالكرةِ', correct: false },
    ],
  },
  {
    id: 'q8',
    skillTag: 'تراكيب أساسية',
    text: 'أكمل الجملة: أحمدُ .......... الحليبَ كلَّ صباحٍ.',
    options: [
      { text: 'يشربُ',   correct: true  },
      { text: 'تشربُ',   correct: false },
      { text: 'يشربون',  correct: false },
    ],
  },
  {
    id: 'q9',
    skillTag: 'رصيد لغوي',
    text: 'ما الكلمة التي تعني مكاناً نزرع فيه الأشجار والزهور؟',
    options: [
      { text: 'حديقة', correct: true  },
      { text: 'مطبخ',  correct: false },
      { text: 'فصل',   correct: false },
    ],
  },
  {
    id: 'q10',
    skillTag: 'بناء الجملة',
    text: 'رتّب الكلمات التالية لتكوين جملة صحيحة: (في / يلعبُ / الأطفالُ / الحديقةِ)',
    options: [
      { text: 'يلعبُ الأطفالُ في الحديقةِ', correct: true  },
      { text: 'الأطفالُ يلعبُ في الحديقةِ', correct: false },
      { text: 'الحديقةِ يلعبُ الأطفالُ',   correct: false },
    ],
  },

  // ── 🔴 المرحلة الثالثة: المبدعون (١١-١٥) ──────────────────────────
  {
    id: 'q11',
    skillTag: 'فهم قرائي',
    readingText: 'عاد عمر من المدرسة مسروراً؛ لأنه حصل على وسام التفوق في اللغة العربية.',
    text: 'لماذا كان عمر مسروراً؟',
    options: [
      { text: 'لأنه حصل على وسام التفوق',   correct: true  },
      { text: 'لأنه ذهب مع أصدقائه',         correct: false },
      { text: 'لأنه تناول طعامه المفضل',     correct: false },
    ],
  },
  {
    id: 'q12',
    skillTag: 'مترادفات',
    readingText: 'عاد عمر من المدرسة مسروراً؛ لأنه حصل على وسام التفوق في اللغة العربية.',
    text: 'من النص السابق، ما الكلمة الأقرب في المعنى لكلمة «مسروراً»؟',
    options: [
      { text: 'سعيداً', correct: true  },
      { text: 'حزيناً', correct: false },
      { text: 'غاضباً', correct: false },
    ],
  },
  {
    id: 'q13',
    skillTag: 'سبب ونتيجة',
    readingText: 'كان الجو بارداً جداً، لذلك ارتدى خالد معطفه السميك قبل الخروج.',
    text: 'لماذا ارتدى خالد معطفه؟',
    options: [
      { text: 'لأن الجو كان بارداً',        correct: true  },
      { text: 'لأنه اشترى معطفاً جديداً',   correct: false },
      { text: 'لأنه ذاهب إلى المدرسة',       correct: false },
    ],
  },
  {
    id: 'q14',
    skillTag: 'تراكيب متقدمة',
    text: 'اختر الجملة الصحيحة لغوياً',
    options: [
      { text: 'الطالباتُ يكتبنَ الدرسَ', correct: true  },
      { text: 'الطالباتُ يكتبونَ الدرسَ', correct: false },
      { text: 'الطالباتُ يكتبُ الدرسَ',   correct: false },
    ],
  },
  {
    id: 'q15',
    skillTag: 'فهم شامل',
    text: 'أيُّ جملة تعبّر بصورة صحيحة عن المحافظة على البيئة؟',
    options: [
      { text: 'نحافظ على نظافة المكان ولا نرمي النفايات', correct: true  },
      { text: 'نرمي النفايات في الشارع',                   correct: false },
      { text: 'نترك النفايات في الحديقة',                  correct: false },
    ],
  },
];

// نفس بذور quicktest_levels.sql حرفياً — حدود نقاط قابلة للتعديل من لوحة
// الإدارة، لا مواضع أسئلة ثابتة (راجع تعليق الجدول في quicktest_cms.sql).
export const LEVELS = [
  {
    id: 'buds', icon: '🌱', label: 'مستوى البراعم', minCorrect: 0, maxCorrect: 5,
    strengths: 'مهارات الاستماع والتمييز البصري جيدة',
    recommendation: 'يحتاج إلى التركيز على التأسيس القرائي، معرفة الحروف، وربطها لتكوين الكلمات الأولى.',
    program: 'برنامج البراعم للتأسيس القرائي',
    programPitch: 'ليتمكن من قراءة كلماته الأولى بطلاقة خلال أسابيع قليلة',
  },
  {
    id: 'explorers', icon: '🔍', label: 'مستوى المستكشفين', minCorrect: 6, maxCorrect: 10,
    strengths: 'قدرة جيدة على قراءة الكلمات والجمل القصيرة',
    recommendation: 'يحتاج إلى تطوير مهارات الاستيعاب القرائي، التدريب على التراكيب النحوية البسيطة، وإغناء الرصيد اللغوي.',
    program: 'برنامج المستكشفين لبناء الطلاقة القرائية',
    programPitch: 'ليقرأ كلمات وجملاً كاملة بثقة ووضوح',
  },
  {
    id: 'creators', icon: '✍️', label: 'مستوى المبدعين', minCorrect: 11, maxCorrect: 15,
    strengths: 'مستوى متقدم في القراءة والفهم والاستنتاج',
    recommendation: 'جاهز لتطوير مهارات التعبير الكتابي والشفهي، دراسة القواعد اللغوية المتقدمة، وقراءة نصوص أطول وأكثر تعقيداً.',
    program: 'برنامج المبدعين لتعزيز الاستيعاب والتعبير',
    programPitch: 'ليقرأ نصوصاً أطول بفهم عميق ويعبّر عن أفكاره بلغة عربية سليمة',
  },
];

export const DEFAULT_WHATSAPP_TEMPLATE = 'مرحباً أستاذ، أكمل طفلي {childName} التقييم وأود الاستفسار عن {program}';

// نفس بذور quicktest_alphabet.sql حرفياً — السؤال الافتتاحي الثابت
// "التعرف على الحروف الأبجدية" (AlphabetGridAssessment.jsx)، قابل الآن
// للتعديل من نفس اللوحة (حروف/تفعيل/عنوان)، وهذه القيم تبقى النسخة
// الاحتياطية الثابتة فقط عند أي فشل في القراءة من Supabase.
export const ALPHABET_LETTERS = ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];
export const DEFAULT_ALPHABET_ENABLED  = true;
export const DEFAULT_ALPHABET_TITLE    = '🔤 هل يعرف طفلك هذه الحروف؟';
export const DEFAULT_ALPHABET_SUBTITLE = 'اطلب من طفلك قراءة كل حرف بصوت عالٍ، ثم اضغط على الحرف حسب إجابته. اضغط مرة أخرى لتغيير التقييم، ومرة ثالثة للعودة للوضع الافتراضي.';

// نفس بذور quicktest_voice.sql حرفياً — الجمل الأربع الثابتة لتقييم "القراءة
// الجهرية والتسجيل الصوتي" (VoiceReadingAssessment.jsx)، قابلة الآن للتعديل
// الكامل من نفس اللوحة (تفعيل/عنوان/جمل)، وهذه القيم تبقى النسخة الاحتياطية
// الثابتة فقط عند أي فشل في القراءة من Supabase.
export const VOICE_SENTENCES = [
  { id: 'sentence-1', text: 'هَذَا أَبِي',             emoji: '👨' },
  { id: 'sentence-2', text: 'هَذِهِ أُمِّي',            emoji: '👩' },
  { id: 'sentence-3', text: 'هَذَا أَخِي',              emoji: '👦' },
  { id: 'sentence-4', text: 'أَنَا أُحِبُّ مَدْرَسَتِي', emoji: '🏫' },
];
export const DEFAULT_VOICE_ENABLED  = true;
export const DEFAULT_VOICE_TITLE    = '🎙️ اقرأ هذه الجمل بصوتك';
export const DEFAULT_VOICE_SUBTITLE = 'اضغط "ابدأ التسجيل"، واقرأ كل جملة بصوت عالٍ وواضح. يمكنك الاستماع لصوتك أو حذفه وإعادة التسجيل قبل المتابعة.';

// نفس بذور quicktest_word_completion.sql حرفياً — تدريب "إكمال الكلمة
// الناقصة" (WordCompletionAssessment.jsx)، يحلّ محل سؤال "شمس" المفرد
// الذي كان ضمن بنك الـ15 أعلاه (حُذف من هناك تفادياً للتكرار). الحرف
// الصحيح دائماً wordText[missingIndex] — لا يُخزَّن مكرراً في الخيارات.
export const WORD_COMPLETION_ITEMS = [
  { id: 'wc-1', wordText: 'شمس',   missingIndex: 1, distractorOptions: ['ر', 'ل'], emoji: '☀️' },
  { id: 'wc-2', wordText: 'طاولة', missingIndex: 2, distractorOptions: ['ب', 'س'], emoji: '🪑' },
  { id: 'wc-3', wordText: 'سيارة', missingIndex: 3, distractorOptions: ['ن', 'ت'], emoji: '🚗' },
];
export const DEFAULT_WORD_COMPLETION_ENABLED  = true;
export const DEFAULT_WORD_COMPLETION_TITLE    = '🔤 أكمل الكلمة الناقصة';
export const DEFAULT_WORD_COMPLETION_SUBTITLE = 'انظر إلى الصورة، واختر الحرف الناقص لتكتمل الكلمة بشكل صحيح.';
