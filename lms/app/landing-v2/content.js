/* ════════════════════════════════════════════════════════════════
   نصوص الصفحة الرئيسية الجديدة (/landing-v2) — نسخة معاينة قبل الاعتماد.
   الأقسام المشتركة مع الصفحة الحالية (عنوان البداية، الأسعار، الأسئلة
   الشائعة، التذييل) تبقى من translations/index.js؛ هنا الجديد فقط.
   قاعدة الأستاذ محمد: ميزات موجودة فعلاً، بلا أرقام ولا ادعاءات.
════════════════════════════════════════════════════════════════ */

export const V2_CONTENT = {
  ar: {
    previewBanner: '🧪 نسخة معاينة للصفحة الرئيسية الجديدة — الموقع الحالي لم يتغيّر',
    trust: [
      'بيئة آمنة وخالية تماماً من الإعلانات',
      'تغطية شاملة لمهارات اللغة العربية',
      'يعمل مباشرة عبر المتصفح على جميع الأجهزة',
    ],
    features: [
      { title: 'تقييم تشخيصي شامل',     desc: 'قياس المهارات الأساسية (الاستماع، القراءة، القواعد، النطق، والمفردات) لتقديم صورة دقيقة عن مستوى الطالب.' },
      { title: 'مكتبة قصصية تفاعلية',    desc: 'قصص مصورة ومسموعة بأسلوب شائق لتنمية مهارات القراءة والاستماع والفهم.' },
      { title: 'ألعاب تعليمية ممتعة',    desc: 'ألعاب تفاعلية هادفة لترسيخ الحروف والمفردات والمفاهيم الأساسية عبر التعلم باللعب.' },
      { title: 'تقارير تفصيلية (PDF)',   desc: 'تقارير فورية توضح النتيجة الإجمالية ونسبة الإتقان في كل مهارة لمتابعة ولي الأمر والمعلم.' },
      { title: 'تحديد المستوى الفعلي',   desc: 'توجيه الطالب إلى المسار والمحتوى المناسبين لقدراته الحالية بناءً على نتائج التقييم.' },
      { title: 'تغطية المهارات اللغوية', desc: 'العناية بجوانب الفهم القرائي والسمعي، التعبير الشفوي، والتطبيق النحوي لبناء لغوي متكامل.' },
      { title: 'واجهة سهلة وسريعة',      desc: 'تجربة استخدام مرنة وبسيطة تمكّن الطالب والمعلم من التنقل وإجراء التقييمات بكل سهولة.' },
      { title: 'يعمل على جميع الأجهزة',  desc: 'تصميم متجاوب يعمل بسلاسة على الحاسوب، الأجهزة اللوحية، والهواتف الذكية.' },
      { title: 'بيئة آمنة وخاصة',        desc: 'حماية كاملة لبيانات الطلاب وتأمين حساباتهم لضمان بيئة تعلم آمنة وموثوقة.' },
    ],
    howTitle: 'كيف تعمل المنصة؟',
    howSub: 'رحلة طفلك في ثلاث خطوات واضحة',
    steps: [
      { title: 'تقييم تشخيصي ذكي',   desc: 'أجرِ اختباراً تفاعلياً ممتعاً يحدد مستوى طفلك اللغوي في دقائق.' },
      { title: 'تقرير وخطة مخصصة',   desc: 'احصل على تقرير PDF تفصيلي يبرز نقاط القوة والاحتياجات التعليمية.' },
      { title: 'تعلّم ومرح مستمر',   desc: 'انطلق في رحلة التعلم عبر مكتبة القصص والألعاب التعليمية المتناسبة مع مستواه.' },
    ],
    stepLabel: 'الخطوة',
    howCta: 'ابدأ الخطوة الأولى — مجاناً',
    showTitle: 'معاينة من داخل المنصة',
    showSub: 'جرّب بنفسك قبل التسجيل: قصة حقيقية، لعبة تفاعلية، ونموذج من التقرير',
    story: {
      tag: '📖 قصة تفاعلية',
      caption: 'قصص مصورة بصوت حقيقي، يقرؤها الطفل ويستمع إليها صفحةً صفحة.',
      listen: '🔊 استمع', pause: '⏸ إيقاف مؤقت',
      readAll: 'اقرأ القصة كاملة ←',
      fallbackTitle: 'قِطَّتِي الصَّغِيرَة',
      fallbackText: 'عِنْدِي قِطَّةٌ صَغِيرَةٌ،\nتُحِبُّ اللَّعِبَ مَعِي.',
    },
    game: {
      tag: '🎮 لعبة تعليمية',
      caption: 'من لعبة «صيّاد الحروف»: اختر الحرف الناقص لتكتمل الكلمة.',
      prompt: 'ما الحرف الناقص؟',
      right: 'أحسنت! 🎉', wrong: 'قريب! جرّب حرفاً آخر 💪',
      done: 'رائع! أكملت الكلمات الثلاث ⭐', again: 'العب مرة أخرى',
    },
    report: {
      tag: '📄 تقرير PDF',
      caption: 'شكل التقرير الذي يصل بعد التقييم: النتيجة، المستوى، ونسبة الإتقان في كل مهارة.',
      sample: 'نموذج توضيحي — البيانات افتراضية',
      header: 'عارم أكاديمي — تقرير التقييم',
      student: 'الطالب: (مثال)',
      grade: 'جيد جداً', level: 'المستوى: متوسط 📚',
      skillsTitle: 'تفاصيل المهارات',
      recTitle: 'التوصيات',
      rec: 'أداء جيد في المستوى متوسط. يُنصح بمراجعة بعض المهارات مع التركيز على: الكتابة والتعبير.',
    },
    fab: { wa: 'تواصل معنا عبر واتساب', sup: 'راسل المرشد' },
  },

  en: {
    previewBanner: '🧪 Preview of the new homepage — the live site has not changed',
    trust: [
      'A safe environment, completely ad-free',
      'Full coverage of Arabic language skills',
      'Works right in the browser on every device',
    ],
    features: [
      { title: 'Comprehensive Diagnostic Assessment', desc: 'Measures core skills (listening, reading, grammar, pronunciation, and vocabulary) to give an accurate picture of the student\'s level.' },
      { title: 'Interactive Story Library',  desc: 'Illustrated, narrated stories told in an engaging way to build reading, listening, and comprehension.' },
      { title: 'Fun Learning Games',         desc: 'Purposeful interactive games that reinforce letters, vocabulary, and core concepts through learning by play.' },
      { title: 'Detailed Reports (PDF)',     desc: 'Instant reports showing the overall result and the mastery level in each skill for parents and teachers.' },
      { title: 'Finding the Right Level',    desc: 'Guides the student to the path and content that suit their current abilities, based on the assessment results.' },
      { title: 'Covering Language Skills',   desc: 'Attention to reading and listening comprehension, oral expression, and applied grammar for well-rounded language development.' },
      { title: 'Simple, Fast Interface',     desc: 'A flexible, simple experience that lets students and teachers navigate and run assessments with ease.' },
      { title: 'Works on All Devices',       desc: 'Responsive design that runs smoothly on computers, tablets, and smartphones.' },
      { title: 'Safe & Private Environment', desc: 'Full protection of student data and secure accounts for a safe, trustworthy learning environment.' },
    ],
    howTitle: 'How Does It Work?',
    howSub: 'Your child\'s journey in three clear steps',
    steps: [
      { title: 'Smart Diagnostic Assessment', desc: 'Take a fun, interactive test that identifies your child\'s language level in minutes.' },
      { title: 'Report & Personal Plan',      desc: 'Get a detailed PDF report highlighting strengths and learning needs.' },
      { title: 'Ongoing Learning & Fun',      desc: 'Start learning through the story library and educational games suited to their level.' },
    ],
    stepLabel: 'Step',
    howCta: 'Start the first step — Free',
    showTitle: 'A Look Inside the Platform',
    showSub: 'Try it yourself before signing up: a real story, an interactive game, and a sample report',
    story: {
      tag: '📖 Interactive story',
      caption: 'Illustrated stories with real narration that children read and listen to, page by page.',
      listen: '🔊 Listen', pause: '⏸ Pause',
      readAll: 'Read the full story →',
      fallbackTitle: 'قِطَّتِي الصَّغِيرَة',
      fallbackText: 'عِنْدِي قِطَّةٌ صَغِيرَةٌ،\nتُحِبُّ اللَّعِبَ مَعِي.',
    },
    game: {
      tag: '🎮 Learning game',
      caption: 'From the "Letter Catcher" game: choose the missing letter to complete the word.',
      prompt: 'Which letter is missing?',
      right: 'Well done! 🎉', wrong: 'Close! Try another letter 💪',
      done: 'Great! You completed all three words ⭐', again: 'Play again',
    },
    report: {
      tag: '📄 PDF report',
      caption: 'What the report looks like after the assessment: the result, the level, and mastery in each skill.',
      sample: 'Illustrative sample — made-up data',
      header: 'عارم أكاديمي — تقرير التقييم',
      student: 'الطالب: (مثال)',
      grade: 'جيد جداً', level: 'المستوى: متوسط 📚',
      skillsTitle: 'تفاصيل المهارات',
      recTitle: 'التوصيات',
      rec: 'أداء جيد في المستوى متوسط. يُنصح بمراجعة بعض المهارات مع التركيز على: الكتابة والتعبير.',
    },
    fab: { wa: 'Contact us on WhatsApp', sup: 'Message the advisor' },
  },
};

/* إضافات قسم الأسئلة الشائعة ومساعد فهيم في المعاينة — بالعربية دائماً
   مثل بقية أسئلة SmartFAQ */
export const V2_FAQ_EXTRA = [
  {
    q: 'هل التقييم التشخيصي مجاني بالكامل؟',
    a: 'نعم، يمكن لطفلك إجراء التقييم الأول مجاناً والحصول على التقرير التفصيلي فوراً دون أي التزام.',
  },
];
export const V2_FAQ_MOBILE_PLACEHOLDER = 'مثال: كيف أبدأ التقييم؟';

/* نموذج التقرير: نفس المهارات الخمس وأسمائها كما في التقرير الحقيقي
   (SKILLS في src/data/questions.js) ونفس ألوان أشرطته — أرقام توضيحية فقط */
export const SAMPLE_REPORT_SKILLS = [
  { name: 'الاستماع والفهم السمعي', pct: 85 },
  { name: 'المفردات والمعاني',       pct: 80 },
  { name: 'القراءة والفهم',          pct: 76 },
  { name: 'القواعد النحوية',         pct: 72 },
  { name: 'الكتابة والتعبير',        pct: 62 },
];

/* كلمات لعبة المعاينة بنمط صيّاد الحروف: الحروف بأشكالها المتصلة (ZWJ) */
const ZWJ = '‍';
export const SAMPLE_GAME_WORDS = [
  { emoji: '🐘', word: 'فيل', before: `ف${ZWJ}`, after: `${ZWJ}ل`, answer: 'ي', options: ['ب', 'ي', 'ن'] },
  { emoji: '🌙', word: 'قمر', before: `ق${ZWJ}`, after: `${ZWJ}ر`, answer: 'م', options: ['م', 'ك', 'ت'] },
  { emoji: '✏️', word: 'قلم', before: `ق${ZWJ}`, after: `${ZWJ}م`, answer: 'ل', options: ['ف', 'ج', 'ل'] },
];
export const MEDIAL = (letter) => `${ZWJ}${letter}${ZWJ}`;
