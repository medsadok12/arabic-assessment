// بنك أسئلة التقييم الشامل - أكاديمية عارم (العدد الدقيق متغيّر بتطور
// المحتوى؛ احسب getLevelQuestions(level).length بدل الاعتماد على رقم ثابت
// هنا). وسّع بشكل كبير 2026-10-01 بدمج محتوى الاختبار الترويجي المجاني
// (?quick=1) واختبار المهارات للمبتدئين (?skills=beginner) بعد حذفهما
// كمسارين منفصلين — راجع معرّفات الأسئلة المنتهية بـ`_MRG` في كل مستوى.

export const SKILLS = [
  { id: 'listening',  name: 'الاستماع والفهم السمعي', weight: 1 / 6 },
  { id: 'vocabulary', name: 'المفردات والمعاني',       weight: 1 / 6 },
  { id: 'reading',    name: 'القراءة والفهم',          weight: 1 / 6 },
  { id: 'grammar',    name: 'القواعد النحوية',         weight: 1 / 6 },
  { id: 'writing',    name: 'الكتابة والتعبير',        weight: 1 / 6 },
  // كانت أسئلة النطق الشفهي (listen-speak, oral-assessment) مُصنَّفة في
  // بياناتها الأصلية skill:'speaking'، لكن `getLevelQuestions` أدناه
  // يفرض `skill` كل سؤال ليطابق اسم المصفوفة التي يقع تحتها (listening/
  // reading/...) — فكانت هذه الأسئلة تُحتسب فعلياً ضمن الاستماع أو
  // القراءة (بحسب مكانها)، لا تُستبعَد ولا تُحتسب كنطق مستقل، رغم أن
  // بياناتها الأصلية توثّق نيّة واضحة بأنها "speaking". أُدرجت المهارة
  // رسمياً هنا، **ونُقلت الأسئلة نفسها إلى مصفوفة `speaking` مستقلة أدناه**
  // ليتطابق مكانها مع الوسم الذي كُتب لها أصلاً — الإدراج في القائمة وحده
  // لا يكفي دون هذا النقل.
  { id: 'speaking',   name: 'النطق والتعبير الشفهي',   weight: 1 / 6 },
];

export const LEVELS = [
  { id: 1, name: 'مبتدئ',  icon: '🌱' },
  { id: 2, name: 'متوسط', icon: '📚' },
  { id: 3, name: 'متقدم', icon: '🎓' },
];

export const JUMP_THRESHOLD      = 85;
export const REGRESSION_THRESHOLD = 70;

// نقطة تحقق منتصف الطريق (القسم 13 — الترقية/الإنزال المبكر في App.jsx):
// مصدر الحقيقة الوحيد لرقم السؤال العاشر، يستورده أيضاً api/assessment-meta.js
// لتغذية المساعد الذكي "فهيم" بمعلومة دقيقة بدل رقم ثابت قديم في نصّه.
export const CHECKPOINT_QUESTION = 10;

export const questionsBank = {
  level1: {
    listening: [
      {
        id:    'L1_EX1',
        type:  'letter-listen-choose',
        text:  'اسْتَمِعْ وَاخْتَرِ الحَرْفَ الصَّحِيح',
        skill: 'listening',
        items: [
          { letter: 'ب', choices: ['ب', 'ن', 'ت'] },
          { letter: 'ك', choices: ['ك', 'ق', 'ف'] },
          { letter: 'ت', choices: ['ث', 'ت', 'ن'] },
          { letter: 'ص', choices: ['ص', 'س', 'ض'] },
          { letter: 'ط', choices: ['ظ', 'ط', 'ت'] },
          { letter: 'خ', choices: ['ح', 'خ', 'ج'] },
        ],
      },
      // ── مُدمَج من "اختبار المهارات للمبتدئين" (القسم ٥ — تمييز صوتي متقدم
      // بالتشكيل/المقاطع) — دُمج 2026-10-01، حُذف المكوّن المنفصل بعدها.
      {
        id:    'L1_MRG_LC5',
        type:  'letter-listen-choose',
        text:  'اسْتَمِعْ وَاخْتَرِ المَقْطَعَ الصَّحِيح',
        skill: 'listening',
        items: [
          { letter: 'آ',  choices: ['كا', 'آ', 'ها'] },
          { letter: 'قي', choices: ['كي', 'في', 'قي'] },
          { letter: 'صو', choices: ['صو', 'ضو', 'سو'] },
          { letter: 'تٌ',  choices: ['تُنْ', 'طٌ', 'تٌ'] },
          { letter: 'بٍ',  choices: ['بِن', 'بٍ', 'بان'] },
        ],
      },
      // ── مُدمَج من بنك الـ15 سؤالاً لـ"اختبار تحديد المستوى" (كان q1/q2/q5
      // بلا كود، حُذف القمع التسويقي كاملاً بعد هذا الدمج) ──
      {
        id:        'L1_MRG_Q1',
        type:      'listening-comprehension',
        audioText: 'بَ',
        text:      'اسْتَمِعْ جَيِّداً، ثُمَّ اخْتَرِ الكَلِمَةَ الَّتِي تَبْدَأُ بِهَذَا الصَّوْت',
        skill:     'listening',
        options: [
          { text: '🦆 بَطَّة',   correct: true  },
          { text: '🍎 تُفَّاحَة', correct: false },
          { text: '🐘 فِيل',     correct: false },
        ],
      },
      {
        id:        'L1_MRG_Q2',
        type:      'listening-comprehension',
        audioText: 'أَيْنَ القِطَّة؟',
        text:      'اسْتَمِعْ لِلسُّؤَالِ، ثُمَّ اخْتَرِ الإِجَابَةَ الصَّحِيحَة',
        skill:     'listening',
        options: [
          { text: '🐱 قِطَّة',   correct: true  },
          { text: '🐶 كَلْب',    correct: false },
          { text: '🐦 عُصْفُور', correct: false },
        ],
      },
      {
        id:    'L1_MRG_Q3',
        skill: 'listening',
        text:  'أَيُّ حَرْفٍ مِنْ هَذِهِ الحُرُوفِ هُوَ (م)؟',
        options: [
          { text: 'مـ', correct: true  },
          { text: 'بـ', correct: false },
          { text: 'سـ', correct: false },
        ],
      },
      {
        id:        'L1_MRG_Q5',
        type:      'listening-comprehension',
        audioText: 'ذَهَبَتْ مَرْيَمُ إِلَى الْحَدِيقَةِ وَلَعِبَتْ بِالْكُرَة',
        text:      'أَيْنَ ذَهَبَتْ مَرْيَم؟',
        skill:     'listening',
        options: [
          { text: '🌳 إِلَى الْحَدِيقَة', correct: true  },
          { text: '🏫 إِلَى الْمَدْرَسَة', correct: false },
          { text: '🏠 إِلَى الْبَيْت',     correct: false },
        ],
      },
    ],
    vocabulary: [
      {
        id:   'L1_EX3',
        type: 'image-matching',
        text: 'اِرْبِطِ الصُّورَةَ بِالْكَلِمَةِ الْمُنَاسِبَة',
        skill: 'vocabulary',
        pairs: [
          { id: 'kitab',   emoji: '📚', name: 'كِتَاب'  },
          { id: 'kursi',   emoji: '🪑', name: 'كُرْسِي' },
          { id: 'qalam',   emoji: '✏️', name: 'قَلَم'   },
          { id: 'sarir',   emoji: '🛏️', name: 'سَرِير'  },
          { id: 'tuffah',  emoji: '🍎', name: 'تُفَّاح' },
          { id: 'manzil',  emoji: '🏠', name: 'مَنْزِل' },
        ],
      },
      {
        id:   'L1_VOC1',
        type: 'image-matching',
        text: 'اِرْبِطِ صُورَةَ الْحَيَوَانِ بِاسْمِهِ',
        skill: 'vocabulary',
        pairs: [
          { id: 'qitta',  emoji: '🐱', name: 'قِطَّة'    },
          { id: 'kalb',   emoji: '🐶', name: 'كَلْب'     },
          { id: 'asad',   emoji: '🦁', name: 'أَسَد'     },
          { id: 'arnab',  emoji: '🐰', name: 'أَرْنَب'   },
          { id: 'samaka', emoji: '🐟', name: 'سَمَكَة'   },
          { id: 'usfour', emoji: '🐦', name: 'عُصْفُور'  },
        ],
      },
      // ── مُدمَج من تدريبَي المطابقة في الاختبار الترويجي المحذوف ──
      {
        id:   'L1_MRG_MATCH1',
        type: 'image-matching',
        text: 'اِرْبِطِ الصُّورَةَ بِالْكَلِمَةِ الْمُنَاسِبَة',
        skill: 'vocabulary',
        pairs: [
          { id: 'halib',    emoji: '🥛', name: 'حَلِيب'   },
          { id: 'maa',      emoji: '💧', name: 'مَاء'     },
          { id: 'bayt',     emoji: '🏠', name: 'بَيْت'    },
          { id: 'madrasa',  emoji: '🏫', name: 'مَدْرَسَة' },
          { id: 'qalam2',   emoji: '✏️', name: 'قَلَم'    },
        ],
      },
      {
        id:   'L1_MRG_MATCH2',
        type: 'image-matching',
        text: 'اِرْبِطِ الصُّورَةَ بِالْكَلِمَةِ الْمُنَاسِبَة',
        skill: 'vocabulary',
        pairs: [
          { id: 'korsi2', emoji: '🪑', name: 'كُرْسِي' },
          { id: 'kalb2',  emoji: '🐶', name: 'كَلْب'   },
          { id: 'qitta2', emoji: '🐱', name: 'قِطّ'    },
          { id: 'bab',    emoji: '🚪', name: 'بَاب'    },
          { id: 'walad',  emoji: '👦', name: 'وَلَد'   },
          { id: 'bint',   emoji: '👧', name: 'بِنْت'   },
        ],
      },
      // ── مُدمَج من بنك الـ15 سؤالاً (q4 — فهم بصري) ──
      {
        id:    'L1_MRG_Q4',
        skill: 'vocabulary',
        text:  '🧒💧 مَاذَا يَفْعَلُ الطِّفْلُ فِي الصُّورَة؟',
        options: [
          { text: '💧 يَشْرَب', correct: true  },
          { text: '💤 يَنَام',  correct: false },
          { text: '🏃 يَرْكُض', correct: false },
        ],
      },
      // ── مُدمَج من تدريب "إكمال الكلمة الناقصة" في الاختبار الترويجي المحذوف
      // — الحرف الصحيح مُشتَقّ من الكلمة الكاملة نفسها، لا مُخزَّناً مكرراً ──
      {
        id:    'L1_MRG_WC1',
        skill: 'vocabulary',
        text:  '☀️ اخْتَرِ الحَرْفَ النَّاقِصَ لِتَكْتَمِلَ الكَلِمَة: شـ...ـس',
        options: [
          { text: 'م', correct: true  },
          { text: 'ر', correct: false },
          { text: 'ل', correct: false },
        ],
      },
      {
        id:    'L1_MRG_WC2',
        skill: 'vocabulary',
        text:  '🪑 اخْتَرِ الحَرْفَ النَّاقِصَ لِتَكْتَمِلَ الكَلِمَة: طا...لة',
        options: [
          { text: 'و', correct: true  },
          { text: 'ب', correct: false },
          { text: 'س', correct: false },
        ],
      },
      {
        id:    'L1_MRG_WC3',
        skill: 'vocabulary',
        text:  '🚗 اخْتَرِ الحَرْفَ النَّاقِصَ لِتَكْتَمِلَ الكَلِمَة: سيا...ة',
        options: [
          { text: 'ر', correct: true  },
          { text: 'ن', correct: false },
          { text: 'ت', correct: false },
        ],
      },
    ],
    reading: [
      {
        id:        'L1_EX2',
        type:      'syllable-reading',
        text:      'اقْرَأِ المَقَاطِعَ التَّالِيَة',
        skill:     'reading',
        syllables: ['غَ', 'عُ', 'قُ', 'طِ', 'ظُ', 'صَ'],
      },
      {
        id:   'L1_LR',
        type: 'letter-recognition',
        text: 'اقْرَأِ الْحُرُوفَ',
      },
      {
        id:   'L1_VC',
        type: 'vowel-cards',
        text: 'اقْرَأِ الْحُرُوفَ بِالْحَرَكَاتِ',
      },
      {
        id:   'L1_VL',
        type: 'vowel-long',
        text: 'اقْرَأْ ثُمَّ صَنِّفْ',
      },
      {
        id:   'L1_SK',
        type: 'sukun-cards',
        text: 'قِرَاءَةُ المَقْطَعِ السَّاكِنِ',
      },
      {
        id:   'L1_TW',
        type: 'tanween-cards',
        text: 'أَصْوَاتُ التَّنْوِينِ',
      },
      {
        id:        'L1_LC',
        type:      'listen-choose',
        text:      'اسْتَمِعْ وَاخْتَرْ',
        word:      'كُتُبٌ',
        audioText: 'كُتُبٌ',
        options:   ['كَتَبَ', 'كُتِبَ', 'كُتُبٌ'],
        correct:   2,
      },
      {
        id:        'L1_SO',
        type:      'syllable-order',
        text:      'رَتِّبْ مَقَاطِعَ الكَلِمَةِ',
        word:      'كُتُبٌ',
        syllables: ['كُ', 'تُ', 'بٌ'],
      },
      {
        id:    'L1_WL',
        type:  'letter-position',
        text:  'أَيْنَ مَكَانُ الحَرْفِ؟',
        skill: 'reading',
      },
      {
        id:    'L1_WC',
        type:  'word-construct',
        text:  'رَكِّبِ الكَلِمَةَ',
        skill: 'reading',
      },
      // ── مُدمَج من "اختبار المهارات للمبتدئين" (القسم ٨ — فهم مقروء، فقرة
      // واحدة + 5 أسئلة؛ صُحِّح خطأ مطبعي واحد: "مَنْ أيْنَ"←"مِنْ أيْنَ") ──
      {
        id:        'L1_MRG_RC1',
        type:      'listening-comprehension',
        audioText: 'سَامِي وَلَدٌ لَطِيفٌ يَعِيشُ فِي قَطَرَ، هُوَ مِصْرِيٌّ، عُمْرُهُ سِتُّ سَنَوَاتٍ. هُوَ يَدْرُسُ فِي الصَّفِّ الْأَوَّلِ. يُحِبُّ سَامِي كُرَةَ الْقَدَمِ، وَيَلْعَبُهَا فِي الْحَدِيقَةِ كُلَّ يَوْمٍ مَعَ أَصْدِقَائِهِ.',
        text:      'مِنْ أَيْنَ سَامِي؟',
        skill:     'reading',
        options: [
          { text: 'مِصْر',       correct: true  },
          { text: 'قَطَر',       correct: false },
          { text: 'السُّعُودِيَّة', correct: false },
        ],
      },
      {
        id:        'L1_MRG_RC2',
        type:      'listening-comprehension',
        audioText: 'سَامِي وَلَدٌ لَطِيفٌ يَعِيشُ فِي قَطَرَ، هُوَ مِصْرِيٌّ، عُمْرُهُ سِتُّ سَنَوَاتٍ. هُوَ يَدْرُسُ فِي الصَّفِّ الْأَوَّلِ. يُحِبُّ سَامِي كُرَةَ الْقَدَمِ، وَيَلْعَبُهَا فِي الْحَدِيقَةِ كُلَّ يَوْمٍ مَعَ أَصْدِقَائِهِ.',
        text:      'أَيْنَ يَعِيشُ سَامِي؟',
        skill:     'reading',
        options: [
          { text: 'قَطَر',    correct: true  },
          { text: 'مِصْر',    correct: false },
          { text: 'الإِمَارَات', correct: false },
        ],
      },
      {
        id:        'L1_MRG_RC3',
        type:      'listening-comprehension',
        audioText: 'سَامِي وَلَدٌ لَطِيفٌ يَعِيشُ فِي قَطَرَ، هُوَ مِصْرِيٌّ، عُمْرُهُ سِتُّ سَنَوَاتٍ. هُوَ يَدْرُسُ فِي الصَّفِّ الْأَوَّلِ. يُحِبُّ سَامِي كُرَةَ الْقَدَمِ، وَيَلْعَبُهَا فِي الْحَدِيقَةِ كُلَّ يَوْمٍ مَعَ أَصْدِقَائِهِ.',
        text:      'كَمْ عُمْرُ سَامِي؟',
        skill:     'reading',
        options: [
          { text: 'سِتُّ سَنَوَات',  correct: true  },
          { text: 'خَمْسُ سَنَوَات', correct: false },
          { text: 'سَبْعُ سَنَوَات', correct: false },
        ],
      },
      {
        id:        'L1_MRG_RC4',
        type:      'listening-comprehension',
        audioText: 'سَامِي وَلَدٌ لَطِيفٌ يَعِيشُ فِي قَطَرَ، هُوَ مِصْرِيٌّ، عُمْرُهُ سِتُّ سَنَوَاتٍ. هُوَ يَدْرُسُ فِي الصَّفِّ الْأَوَّلِ. يُحِبُّ سَامِي كُرَةَ الْقَدَمِ، وَيَلْعَبُهَا فِي الْحَدِيقَةِ كُلَّ يَوْمٍ مَعَ أَصْدِقَائِهِ.',
        text:      'فِي أَيِّ صَفٍّ يَدْرُسُ سَامِي؟',
        skill:     'reading',
        options: [
          { text: 'الصَّفُّ الْأَوَّل', correct: true  },
          { text: 'الصَّفُّ الثَّانِي', correct: false },
          { text: 'الصَّفُّ الثَّالِث', correct: false },
        ],
      },
      {
        id:        'L1_MRG_RC5',
        type:      'listening-comprehension',
        audioText: 'سَامِي وَلَدٌ لَطِيفٌ يَعِيشُ فِي قَطَرَ، هُوَ مِصْرِيٌّ، عُمْرُهُ سِتُّ سَنَوَاتٍ. هُوَ يَدْرُسُ فِي الصَّفِّ الْأَوَّلِ. يُحِبُّ سَامِي كُرَةَ الْقَدَمِ، وَيَلْعَبُهَا فِي الْحَدِيقَةِ كُلَّ يَوْمٍ مَعَ أَصْدِقَائِهِ.',
        text:      'مَاذَا يُحِبُّ سَامِي؟',
        skill:     'reading',
        options: [
          { text: 'كُرَةُ الْقَدَم', correct: true  },
          { text: 'السِّبَاحَة',      correct: false },
          { text: 'الرَّسْم',        correct: false },
        ],
      },
    ],
    grammar: [
      {
        id:    'L1_GR1',
        skill: 'grammar',
        text:  '👦 هَذَا وَلَدٌ. مَا الْكَلِمَةُ الصَّحِيحَة؟ ___ وَلَدٌ.',
        options: [
          { text: 'هَذَا',  correct: true  },
          { text: 'هَذِهِ', correct: false },
        ],
      },
      {
        id:    'L1_GR2',
        skill: 'grammar',
        text:  '👧 هَذِهِ بِنْتٌ. مَا الْكَلِمَةُ الصَّحِيحَة؟ ___ بِنْتٌ.',
        options: [
          { text: 'هَذِهِ', correct: true  },
          { text: 'هَذَا',  correct: false },
        ],
      },
      {
        id:    'L1_GR3',
        skill: 'grammar',
        text:  '👩 هِيَ مُعَلِّمَة. مَاذَا نَقُولُ عَنِ الْوَلَدِ؟ ___ طَالِبٌ.',
        options: [
          { text: 'هُوَ', correct: true  },
          { text: 'هِيَ', correct: false },
        ],
      },
      // ── مُدمَج من "اختبار المهارات للمبتدئين" (القسم ٧ — إكمال الجملة
      // بالضمير المناسب؛ المُشتِّتات من تصميمنا، النص الأصلي لم يُعطِها) ──
      {
        id:    'L1_MRG_GR1',
        skill: 'grammar',
        text:  '........ يَسْبَحانِ',
        options: [
          { text: 'هما',   correct: true  },
          { text: 'هم',    correct: false },
          { text: 'أنتما', correct: false },
        ],
      },
      {
        id:    'L1_MRG_GR2',
        skill: 'grammar',
        text:  '........ أُراجِعُ دُرُوسِي',
        options: [
          { text: 'أنا', correct: true  },
          { text: 'أنتَ', correct: false },
          { text: 'هو',   correct: false },
        ],
      },
      {
        id:    'L1_MRG_GR3',
        skill: 'grammar',
        text:  '........ تُعِدُّ الطَّعَامَ',
        options: [
          { text: 'هي',   correct: true  },
          { text: 'هو',   correct: false },
          { text: 'أنتِ', correct: false },
        ],
      },
      {
        id:    'L1_MRG_GR4',
        skill: 'grammar',
        text:  '....... يَلْعَبُونَ فِي الْحَدِيقَةِ',
        options: [
          { text: 'هم',   correct: true  },
          { text: 'هما',  correct: false },
          { text: 'نحن',  correct: false },
        ],
      },
      {
        id:    'L1_MRG_GR5',
        skill: 'grammar',
        text:  '....... ذَهَبْنَ إِلَى الْمَتْجَر',
        options: [
          { text: 'هنّ',   correct: true  },
          { text: 'هم',    correct: false },
          { text: 'أنتنّ', correct: false },
        ],
      },
      {
        id:    'L1_MRG_GR6',
        skill: 'grammar',
        text:  '....... نَلْعَبُ كُرَةَ الْقَدَمِ',
        options: [
          { text: 'نحن', correct: true  },
          { text: 'أنا',  correct: false },
          { text: 'أنتم', correct: false },
        ],
      },
      {
        id:    'L1_MRG_GR7',
        skill: 'grammar',
        text:  '....... تُسَاعِدُ أُمَّهَا',
        options: [
          { text: 'هي',   correct: true  },
          { text: 'هو',   correct: false },
          { text: 'أنتِ', correct: false },
        ],
      },
    ],
    writing: [
      {
        id:    'L1_WR1',
        type:  'photo-writing',
        skill: 'writing',
        text:  '✍️ انْظُرْ إِلَى الصُّورَةِ، ثُمَّ اكْتُبِ اسْمَهَا عَلَى وَرَقَةٍ وَصَوِّرْهَا: 🐱',
      },
      {
        id:    'L1_WR2',
        type:  'photo-writing',
        skill: 'writing',
        text:  '✍️ انْظُرْ إِلَى الصُّورَةِ، ثُمَّ اكْتُبِ اسْمَهَا عَلَى وَرَقَةٍ وَصَوِّرْهَا: ☀️',
      },
      // ── مُدمَج من "اختبار المهارات للمبتدئين" (القسم ٦ — إملاء، اختيار
      // الرسم الصحيح للكلمة). العنصر الثالث (طاولة) استُبعِد عمداً — لا رسمٌ
      // من الخيارات الأصلية الثلاثة يطابق الكلمة الصحيحة فعلياً، فلا يصلح
      // سؤالاً مُصحَّحاً آلياً. راجع ملاحظة الأستاذ محمد الأصلية في جلسة البناء. ──
      {
        id:    'L1_MRG_WR1',
        skill: 'writing',
        text:  'اخْتَرِ الرَّسْمَ الصَّحِيحَ لِلْكَلِمَة',
        options: [
          { text: 'هَذا',  correct: true  },
          { text: 'هاذا',  correct: false },
          { text: 'هاذَ',  correct: false },
        ],
      },
      {
        id:    'L1_MRG_WR2',
        skill: 'writing',
        text:  'اخْتَرِ الرَّسْمَ الصَّحِيحَ لِلْكَلِمَة',
        options: [
          { text: 'ذَلِكَ',  correct: true  },
          { text: 'ذالكَ',   correct: false },
          { text: 'ذالِكا',  correct: false },
        ],
      },
      {
        id:    'L1_MRG_WR3',
        skill: 'writing',
        text:  'اخْتَرِ الرَّسْمَ الصَّحِيحَ لِلْكَلِمَة',
        options: [
          { text: 'كِتابٌ',  correct: true  },
          { text: 'كَتَبٌ',  correct: false },
          { text: 'كِتابُنْ', correct: false },
        ],
      },
      {
        id:    'L1_MRG_WR4',
        skill: 'writing',
        text:  'اخْتَرِ الرَّسْمَ الصَّحِيحَ لِلْكَلِمَة',
        options: [
          { text: 'بِئْرٌ', correct: true  },
          { text: 'بِؤْرٌ', correct: false },
          { text: 'بِأرٌ',  correct: false },
        ],
      },
      {
        id:    'L1_MRG_WR5',
        skill: 'writing',
        text:  'اخْتَرِ الرَّسْمَ الصَّحِيحَ لِلْكَلِمَة',
        options: [
          { text: 'شَيْءٌ', correct: true  },
          { text: 'شَيْئٌ', correct: false },
          { text: 'شَيْؤٌ', correct: false },
        ],
      },
      {
        id:    'L1_MRG_WR6',
        skill: 'writing',
        text:  'اخْتَرِ الرَّسْمَ الصَّحِيحَ لِلْكَلِمَة',
        options: [
          { text: 'رَأيْتُ',  correct: true  },
          { text: 'رَءَيْتُ', correct: false },
          { text: 'رَئَيْتُ', correct: false },
        ],
      },
      {
        id:    'L1_MRG_WR7',
        skill: 'writing',
        text:  'اخْتَرِ الرَّسْمَ الصَّحِيحَ لِلْكَلِمَة',
        options: [
          { text: 'سَماءً',   correct: true  },
          { text: 'سَماءًا',  correct: false },
          { text: 'سَماأً',   correct: false },
        ],
      },
    ],
    speaking: [
      {
        id:    'L1_EX4',
        type:  'listen-speak',
        text:  'اسْتَمِعْ وَأَجِبْ شَفَهِيًّا',
        skill: 'speaking',
        items: [
          { text: 'مَا اسْمُك؟' },
          { text: 'كَمْ عُمْرُك؟' },
          { text: 'أَيْنَ تَسْكُن؟' },
          { text: 'فِي أَيِّ صَفٍّ تَدْرُس؟' },
          { text: 'كَيْفَ حَالُك؟' },
          { text: 'مَاذَا تُحِبّ؟' },
        ],
      },
      {
        id:    'L1_OA',
        type:  'oral-assessment',
        text:  'أَسْمِعْنِي صَوْتَكَ',
        skill: 'speaking',
      },
      // ── مُدمَج من "تقييم القراءة الجهرية" في الاختبار الترويجي المحذوف ──
      {
        id:    'L1_MRG_VOICE',
        type:  'listen-speak',
        text:  'اقْرَأْ هَذِهِ الجُمَلَ بِصَوْتِكَ',
        skill: 'speaking',
        items: [
          { text: 'هَذَا أَبِي' },
          { text: 'هَذِهِ أُمِّي' },
          { text: 'هَذَا أَخِي' },
          { text: 'أَنَا أُحِبُّ مَدْرَسَتِي' },
        ],
      },
    ],
  },

  level2: {
    listening: [
      {
        id:        'L2_1',
        type:      'listening-comprehension',
        audioText: 'سارة تلميذة مجتهدة، تراجع دروسها كل يوم بعد المدرسة.',
        text:      'ما الفكرة الرئيسية؟',
        options: [
          { text: 'أهمية المراجعة اليومية', correct: true  },
          { text: 'المدرسة صعبة جداً',       correct: false },
          { text: 'سارة تكره الدراسة',       correct: false },
          { text: 'الامتحانات كثيرة',        correct: false },
        ],
      },
      {
        id:        'L2_2',
        type:      'listening-comprehension',
        audioText: 'والد سارة يبني المباني الكبيرة في المدينة.',
        text:      'ما مهنته؟',
        options: [
          { text: 'مهندس',  correct: true  },
          { text: 'طبيب',   correct: false },
          { text: 'معلم',   correct: false },
          { text: 'محاسب',  correct: false },
        ],
      },
      {
        id:        'L2_3',
        type:      'listening-comprehension',
        audioText: 'قال يوسف: انظري يا سارة! السماء مليئة بغيوم داكنة.',
        text:      'ما توقعك للطقس؟',
        options: [
          { text: 'سيمطر قريباً',   correct: true  },
          { text: 'الطقس مشمس',     correct: false },
          { text: 'سيثلج غداً',      correct: false },
          { text: 'الجو حار جداً',   correct: false },
        ],
      },
      {
        id:        'L2_4',
        type:      'listening-comprehension',
        audioText: 'معلمة سارة تشرح الدرس بابتسامة وتساعد كل طالب.',
        text:      'ما مهنتها؟',
        options: [
          { text: 'معلمة',   correct: true  },
          { text: 'طبيبة',   correct: false },
          { text: 'مهندسة',  correct: false },
          { text: 'تاجرة',   correct: false },
        ],
      },
    ],
    vocabulary: [
      {
        id: 'V2_MATCH',
        type: 'matching',
        text: 'صِل كل مكان باسمه الصحيح',
        pairs: [
          { id: 'school',   emoji: '🏫', name: 'مَدْرَسَة'   },
          { id: 'hospital', emoji: '🏥', name: 'مُسْتَشْفَى' },
          { id: 'market',   emoji: '🏪', name: 'سُوق'        },
        ],
      },
      {
        id: 'V2_1',
        text: 'قالت سارة: "البحر عميق جداً!" ماذا تقصد؟',
        options: [
          { text: 'بعيد القاع',      correct: true  },
          { text: 'كثير الألوان',    correct: false },
          { text: 'مليء بالأسماك',  correct: false },
          { text: 'واسع جداً',       correct: false },
        ],
      },
      {
        id: 'V2_2',
        text: 'قال يوسف بعد الرحلة: "كانت رائعة!" ماذا يقصد؟',
        options: [
          { text: 'جميلة ومبهجة', correct: true  },
          { text: 'طويلة ومملة',  correct: false },
          { text: 'سريعة جداً',    correct: false },
          { text: 'قصيرة جداً',    correct: false },
        ],
      },
      {
        id: 'V2_3',
        text: 'أكمل الجملة: "الزهرة في حديقتنا _____ كل يوم لأننا نسقيها"',
        options: [
          { text: 'تنمو',   correct: true  },
          { text: 'تذبل',   correct: false },
          { text: 'تسبح',   correct: false },
          { text: 'تطير',   correct: false },
        ],
      },
      {
        id: 'V2_4',
        text: 'في سلة فاكهة سارة: تفاح، برتقال، موز، ______. أيّ كلمة لا تنتمي؟',
        options: [
          { text: 'دراجة',    correct: true  },
          { text: 'تفاح',     correct: false },
          { text: 'برتقال',   correct: false },
          { text: 'موز',      correct: false },
        ],
      },
      // ── مُدمَج من بنك الـ15 سؤالاً (q9 — رصيد لغوي) ──
      {
        id: 'L2_MRG_Q9',
        text: 'ما الكلمة التي تعني مكاناً نزرع فيه الأشجار والزهور؟',
        options: [
          { text: 'حديقة', correct: true  },
          { text: 'مطبخ',  correct: false },
          { text: 'فصل',   correct: false },
        ],
      },
    ],
    reading: [
      {
        id: 'R2_1',
        text: 'اقرأ: يذهب يوسف وسارة إلى المدرسة كل صباح مشياً مع صديقهما خالد. ما الفكرة الرئيسية؟',
        options: [
          { text: 'يذهبون إلى المدرسة معاً كل يوم', correct: true  },
          { text: 'خالد لا يحب المدرسة',             correct: false },
          { text: 'المدرسة بعيدة جداً',               correct: false },
          { text: 'يذهبون بالسيارة',                  correct: false },
        ],
      },
      {
        id: 'R2_2',
        text: 'اقرأ: تحب سارة القراءة كثيراً، وتقرأ قصة جديدة كل مساء قبل النوم. ما هوايتها؟',
        options: [
          { text: 'القراءة',   correct: true  },
          { text: 'الرياضة',   correct: false },
          { text: 'الرسم',     correct: false },
          { text: 'الطبخ',     correct: false },
        ],
      },
      {
        id: 'R2_3',
        text: 'اقرأ: في نزهة العائلة، ظهرت فجأة غيوم داكنة وهبّت رياح قوية. ما الذي يمكن استنتاجه؟',
        options: [
          { text: 'من المرجح أن يمطر',   correct: true  },
          { text: 'الطقس مشمس وجميل',    correct: false },
          { text: 'الجو حار جداً',        correct: false },
          { text: 'ستخرج الشمس بقوة',    correct: false },
        ],
      },
      {
        id: 'R2_4',
        text: 'اقرأ: قبل النزهة، جهّزت الأم سلة الطعام بسرعة لأن الجو كان يسخن والطعام قد يفسد. لماذا أسرعت الأم؟',
        options: [
          { text: 'لأن الحرارة قد تُفسد الطعام', correct: true  },
          { text: 'لأنها تريد الراحة',            correct: false },
          { text: 'لأنها كانت متعبة',             correct: false },
          { text: 'لأن الوقت متأخر',              correct: false },
        ],
      },
      {
        id:   'D2_1',
        type: 'dialogue-order',
        text: 'رتّب جمل هذا الحوار بين سارة ويوسف بالترتيب الصحيح',
        lines: [
          { id: 'a', speaker: 'سارة', text: 'مرحباً يا يوسف، كيف حالك؟' },
          { id: 'b', speaker: 'يوسف', text: 'أنا بخير، شكراً! وأنتِ؟' },
          { id: 'c', speaker: 'سارة', text: 'أنا بخير أيضاً. هل أنهيت واجبك؟' },
          { id: 'd', speaker: 'يوسف', text: 'نعم، أنهيته قبل قليل.' },
        ],
      },
      // ── مُدمَج من بنك الـ15 سؤالاً (q7 — قراءة وربط صورة بجملة) ──
      {
        id: 'L2_MRG_Q7',
        text: '👧🎨🌸 اختر الجملة التي تعبّر عن الصورة',
        options: [
          { text: 'ترسمُ البنتُ زهرةً',   correct: true  },
          { text: 'تأكلُ البنتُ تفاحةً',  correct: false },
          { text: 'تلعبُ البنتُ بالكرةِ', correct: false },
        ],
      },
    ],
    grammar: [
      {
        id: 'G2_1',
        text: 'اختر الجملة الصحيحة عن رحلة سارة:',
        options: [
          { text: 'ذهبت سارة وأخوها إلى الحديقة يوم الجمعة', correct: true  },
          { text: 'ذهبت سارة وأخوها يذهبوا الحديقة',          correct: false },
          { text: 'سارة وأخوها الحديقة ذهبوا يوم',            correct: false },
          { text: 'يوم الجمعة ذهبت الحديقة سارة',             correct: false },
        ],
      },
      {
        id: 'G2_2',
        text: 'أكمل الجملة: "سارة ويوسف _____ إلى الحديقة كل جمعة"',
        options: [
          { text: 'يذهبان',  correct: true  },
          { text: 'يذهبون',  correct: false },
          { text: 'تذهب',    correct: false },
          { text: 'أذهب',    correct: false },
        ],
      },
      {
        id: 'G2_3',
        text: 'اختر الجملة المركبة الصحيحة:',
        options: [
          { text: 'عندما وصلت سارة إلى المدرسة، رأت صديقتها عند الباب', correct: true  },
          { text: 'وصلت سارة وجدت صديقتها الباب',                        correct: false },
          { text: 'أنا سارة وصلت وجدت صديقتها',                          correct: false },
          { text: 'صديقتها سارة وصلت وجدتها',                            correct: false },
        ],
      },
      {
        id: 'G2_4',
        text: 'هل هذه الجملة صحيحة نحوياً؟ "الأصدقاء الذين لعبوا في الحديقة عادوا مبتسمين"',
        options: [
          { text: 'نعم، صحيحة نحوياً بالكامل',    correct: true  },
          { text: 'خطأ في ترتيب الجملة',           correct: false },
          { text: 'خطأ في تصريف الفعل',            correct: false },
          { text: 'خطأ في استخدام "الذين"',        correct: false },
        ],
      },
      // ── مُدمَج من بنك الـ15 سؤالاً (q8/q10 — تراكيب أساسية وبناء الجملة) ──
      {
        id: 'L2_MRG_Q8',
        text: 'أكمل الجملة: أحمدُ .......... الحليبَ كلَّ صباحٍ.',
        options: [
          { text: 'يشربُ',   correct: true  },
          { text: 'تشربُ',   correct: false },
          { text: 'يشربون',  correct: false },
        ],
      },
      {
        id: 'L2_MRG_Q10',
        text: 'رتّب الكلمات التالية لتكوين جملة صحيحة: (في / يلعبُ / الأطفالُ / الحديقةِ)',
        options: [
          { text: 'يلعبُ الأطفالُ في الحديقةِ', correct: true  },
          { text: 'الأطفالُ يلعبُ في الحديقةِ', correct: false },
          { text: 'الحديقةِ يلعبُ الأطفالُ',   correct: false },
        ],
      },
    ],
    writing: [
      {
        id: 'W2_1',
        text: 'اختر الفقرة الأنسب لوصف يوم دراسي في المدرسة:',
        options: [
          { text: 'أذهب للمدرسة صباحاً حيث أتعلم وألعب مع أصدقائي', correct: true  },
          { text: 'لا أحب المدرسة ولا أريد الذهاب إليها',              correct: false },
          { text: 'البيت أفضل من المدرسة دائماً',                        correct: false },
          { text: 'المدرسة مكان ممل وغير مريح',                          correct: false },
        ],
      },
      {
        id: 'W2_2',
        text: 'اختر الحوار المناسب عن الطقس بين سارة ويوسف:',
        options: [
          { text: '- كيف الطقس اليوم يا يوسف؟ - جميل ومشمس، مناسب للنزهة!', correct: true  },
          { text: '- ما اسمك؟ - اسمي محمد وأنا من القاهرة',                  correct: false },
          { text: '- أين المدرسة؟ - هي في وسط المدينة',                       correct: false },
          { text: '- متى يبدأ الدرس؟ - يبدأ في الثامنة',                      correct: false },
        ],
      },
      {
        id: 'W2_3',
        text: 'اختر الجملة الأنسب لشرح لماذا تحب سارة القراءة:',
        options: [
          { text: 'القراءة ممتعة وتعلّمني أشياء جديدة كل يوم', correct: true  },
          { text: 'القراءة تسبب الملل وتضيع الوقت',              correct: false },
          { text: 'القراءة ليست مهمة أبداً',                       correct: false },
          { text: 'القراءة مفيدة للكبار فقط',                      correct: false },
        ],
      },
      {
        id: 'W2_4',
        text: 'اكتب عن يوم مميز مع عائلتك. اختر التعبير الأفضل:',
        options: [
          { text: 'كان يوماً جميلاً أمضيته مع عائلتي في رحلة ممتعة إلى الشاطئ', correct: true  },
          { text: 'كان يوماً عادياً لم يحدث فيه شيء',                                correct: false },
          { text: 'لا أتذكر أي شيء عن ذلك اليوم',                                    correct: false },
          { text: 'كان يوماً سيئاً لا أريد تذكره',                                    correct: false },
        ],
      },
    ],
  },

  level3: {
    listening: [
      {
        id:        'L3_1',
        type:      'listening-comprehension',
        audioText: 'زارت سارة ويوسف مع مدرستهما مزرعة في الريف، وشاهدا كيف تُحلَب الأبقار وتُجمَع البيوض.',
        text:      'ما الوصف الأنسب لهذه الرحلة؟',
        options: [
          { text: 'رحلة تعليمية ممتعة عن الحياة في الريف', correct: true  },
          { text: 'رحلة صعبة ومملة',                          correct: false },
          { text: 'رحلة قصيرة بلا فائدة',                      correct: false },
          { text: 'رحلة إلى مدينة كبيرة',                       correct: false },
        ],
      },
      {
        id:        'L3_2',
        type:      'listening-comprehension',
        audioText: 'قال المعلم إن النجاح في المسابقة العلمية يحتاج تدرّباً يومياً لا حفظ المعلومات ليلة الاختبار فقط.',
        text:      'ماذا يحتاج النجاح وفق كلامه؟',
        options: [
          { text: 'التدرّب المستمر لا الحفظ في اللحظة الأخيرة', correct: true  },
          { text: 'الحفظ والاستذكار وحدهما',                      correct: false },
          { text: 'الدراسة ليلة الاختبار فقط',                     correct: false },
          { text: 'الاعتماد على الحظ',                              correct: false },
        ],
      },
      {
        id:        'L3_3',
        type:      'listening-comprehension',
        audioText: 'في نقاش بين سارة وصديقتها حول الألعاب الإلكترونية، قالت سارة: ممتعة، لكن يجب ألا تُلهينا عن اللعب في الخارج مع الأصدقاء.',
        text:      'ما موقف سارة؟',
        options: [
          { text: 'إيجابي مع تحفّظ على الإفراط فيها', correct: true  },
          { text: 'رافضة لها تماماً',                    correct: false },
          { text: 'لا رأي لها في الموضوع',              correct: false },
          { text: 'مؤيدة بلا أي تحفظ',                   correct: false },
        ],
      },
      {
        id:        'L3_4',
        type:      'listening-comprehension',
        audioText: 'بعد المباراة، قال أحد اللاعبين إن فريقه خسر بسبب خطأ الحكم، وقال آخر إن فريقه يحتاج تدريباً أكثر.',
        text:      'أيّهما أقرب للصواب؟',
        options: [
          { text: 'الثاني، لأنه يعترف بنقاط الضعف ويسعى لتحسينها', correct: true  },
          { text: 'الأول، لأن الحكم مسؤول دائماً',                    correct: false },
          { text: 'كلاهما مخطئ',                                        correct: false },
          { text: 'لا يمكن معرفة ذلك',                                   correct: false },
        ],
      },
    ],
    vocabulary: [
      {
        id: 'V3_MATCH',
        type: 'matching',
        text: 'صِل كل مهنة برمزها الصحيح',
        pairs: [
          { id: 'doctor',   emoji: '🩺', name: 'طَبِيب'   },
          { id: 'teacher',  emoji: '📖', name: 'مُعَلِّم' },
          { id: 'engineer', emoji: '⚙️', name: 'مُهَنْدِس' },
        ],
      },
      {
        id: 'V3_1',
        text: 'ما معنى "الشجاعة" في جملة: "واجه خالد خوفه بشجاعة وشارك في المسابقة"؟',
        options: [
          { text: 'مواجهة الخوف بقوة وثقة', correct: true  },
          { text: 'الفوز بالمسابقة',          correct: false },
          { text: 'حب المسابقات',             correct: false },
          { text: 'الخجل من المشاركة',        correct: false },
        ],
      },
      {
        id: 'V3_2',
        text: 'ما الفرق بين "مشى" و"ركض"؟',
        options: [
          { text: '"مشى": بخطى عادية، "ركض": بسرعة كبيرة', correct: true  },
          { text: 'كلاهما بنفس السرعة تماماً',                correct: false },
          { text: '"ركض" أبطأ من "مشى"',                     correct: false },
          { text: 'لا فرق بينهما',                              correct: false },
        ],
      },
      {
        id: 'V3_3',
        text: 'أكمل: "الغطّاس الماهر _____ في أعماق البحر ليكتشف الشعاب المرجانية"',
        options: [
          { text: 'يغوص',   correct: true  },
          { text: 'يركض',   correct: false },
          { text: 'ينسى',   correct: false },
          { text: 'يتجاهل', correct: false },
        ],
      },
      {
        id: 'V3_4',
        text: 'أكمل: "المصوّر الماهر _____ أجمل اللحظات في صور خالدة"',
        options: [
          { text: 'يُجسّد',   correct: true  },
          { text: 'يقول فقط', correct: false },
          { text: 'ينطق بها', correct: false },
          { text: 'يُخبر عن', correct: false },
        ],
      },
    ],
    reading: [
      {
        id: 'R3_1',
        text: 'اقرأ: بعد رحلة المزرعة، قرر يوسف تربية أرنب في المنزل والاعتناء به يومياً ليتعلّم المسؤولية. ما الفكرة المحورية؟',
        options: [
          { text: 'يوسف يتعلم المسؤولية من رعاية حيوان أليف', correct: true  },
          { text: 'الأرانب حيوانات خطيرة',                       correct: false },
          { text: 'يوسف يكره الحيوانات',                          correct: false },
          { text: 'المزرعة مكان ممل',                              correct: false },
        ],
      },
      {
        id: 'R3_2',
        text: 'اقرأ: الهاتف يساعد سارة على التواصل مع أصدقائها ومعرفة الواجبات، لكنه قد يشغلها عن المذاكرة إن أفرطت في استخدامه. ما الاستنتاج المناسب؟',
        options: [
          { text: 'للهاتف فوائد وأضرار في آنٍ معاً',       correct: true  },
          { text: 'الهاتف ضار بالكامل',                       correct: false },
          { text: 'الهاتف مفيد فقط بلا أي عيوب',              correct: false },
          { text: 'الهاتف غير مهم لسارة',                      correct: false },
        ],
      },
      {
        id: 'R3_3',
        text: 'اقرأ: فاز فريق سارة بالمسابقة العلمية لأنهم لم يكتفوا بالمعلومات، بل تدرّبوا كثيراً على العرض أمام الجمهور. ما دلالة هذا النص؟',
        options: [
          { text: 'المعرفة وحدها لا تكفي؛ يحتاج النجاح إلى التدريب أيضاً', correct: true  },
          { text: 'المعلومات غير مهمة للفوز',                                correct: false },
          { text: 'العرض أهم من المعرفة دائماً',                             correct: false },
          { text: 'الحظ وحده سبب الفوز',                                     correct: false },
        ],
      },
      {
        id: 'R3_4',
        text: 'اقرأ: في سباق المدرسة، قال تفسير أول إن يوسف فاز لأنه تدرّب كل يوم لمدة شهر، وقال تفسير ثانٍ إنه فاز لأن الحظ حالفه. أيّ التفسيرين أقوى؟',
        options: [
          { text: 'الأول، لأنه يعتمد على سبب واقعي يمكن التحقق منه', correct: true  },
          { text: 'الثاني، لأن الحظ هو الأهم دائماً',                   correct: false },
          { text: 'كلاهما متساويان في القوة',                            correct: false },
          { text: 'لا يمكن تفضيل أحدهما',                                 correct: false },
        ],
      },
      {
        id:   'D3_1',
        type: 'dialogue-order',
        text: 'رتّب جمل هذا الحوار بين سارة ويوسف بالترتيب الصحيح',
        lines: [
          { id: 'a', speaker: 'سارة', text: 'يوسف، هل جهّزت أدواتك للمسابقة العلمية غداً؟' },
          { id: 'b', speaker: 'يوسف', text: 'ليس بعد، سأجهّزها الليلة.' },
          { id: 'c', speaker: 'سارة', text: 'لا تنسَ إحضار النموذج الذي صنعناه معاً.' },
          { id: 'd', speaker: 'يوسف', text: 'بالتأكيد، شكراً لتذكيري!' },
        ],
      },
      // ── مُدمَج من بنك الـ15 سؤالاً (q11/q12 — فهم قرائي ومترادفات لنفس
      // الفقرة، q13 — سبب ونتيجة، q15 — فهم شامل) ──
      {
        id:        'L3_MRG_Q11',
        type:      'listening-comprehension',
        audioText: 'عاد عمر من المدرسة مسروراً؛ لأنه حصل على وسام التفوق في اللغة العربية.',
        text:      'لماذا كان عمر مسروراً؟',
        skill:     'reading',
        options: [
          { text: 'لأنه حصل على وسام التفوق',   correct: true  },
          { text: 'لأنه ذهب مع أصدقائه',         correct: false },
          { text: 'لأنه تناول طعامه المفضل',     correct: false },
        ],
      },
      {
        id:        'L3_MRG_Q12',
        type:      'listening-comprehension',
        audioText: 'عاد عمر من المدرسة مسروراً؛ لأنه حصل على وسام التفوق في اللغة العربية.',
        text:      'من النص السابق، ما الكلمة الأقرب في المعنى لكلمة «مسروراً»؟',
        skill:     'reading',
        options: [
          { text: 'سعيداً', correct: true  },
          { text: 'حزيناً', correct: false },
          { text: 'غاضباً', correct: false },
        ],
      },
      {
        id:        'L3_MRG_Q13',
        type:      'listening-comprehension',
        audioText: 'كان الجو بارداً جداً، لذلك ارتدى خالد معطفه السميك قبل الخروج.',
        text:      'لماذا ارتدى خالد معطفه؟',
        skill:     'reading',
        options: [
          { text: 'لأن الجو كان بارداً',        correct: true  },
          { text: 'لأنه اشترى معطفاً جديداً',   correct: false },
          { text: 'لأنه ذاهب إلى المدرسة',       correct: false },
        ],
      },
      {
        id:    'L3_MRG_Q15',
        skill: 'reading',
        text:  'أيُّ جملة تعبّر بصورة صحيحة عن المحافظة على البيئة؟',
        options: [
          { text: 'نحافظ على نظافة المكان ولا نرمي النفايات', correct: true  },
          { text: 'نرمي النفايات في الشارع',                   correct: false },
          { text: 'نترك النفايات في الحديقة',                  correct: false },
        ],
      },
    ],
    grammar: [
      {
        id: 'G3_1',
        text: 'حدّد صحة هذه الجملة نحوياً: "لو تدرّب يوسف أكثر لفاز في السباق"',
        options: [
          { text: 'صحيحة نحوياً، وهي جملة شرطية بـ"لو"',  correct: true  },
          { text: 'خطأ في الجزم',                              correct: false },
          { text: 'خطأ في جواب الشرط',                        correct: false },
          { text: 'خطأ في اختيار أداة الشرط',                 correct: false },
        ],
      },
      {
        id: 'G3_2',
        text: 'حدّد الصحة النحوية: "الطلابُ الذين تدرّبوا كثيراً فازوا في المسابقة العلمية"',
        options: [
          { text: 'الجملة صحيحة نحوياً بالكامل',            correct: true  },
          { text: 'خطأ في الموافقة بين الفعل والفاعل',       correct: false },
          { text: 'خطأ في استخدام أداة النفي',               correct: false },
          { text: 'خطأ في استخدام اسم الموصول',              correct: false },
        ],
      },
      {
        id: 'G3_3',
        text: 'اختر الجملة الأكثر أناقةً وصحةً حول تحضير سارة للمسابقة:',
        options: [
          { text: 'من الممكن تحقيق النجاح إذا توافر الجهد والتدريب المستمر', correct: true  },
          { text: 'قد يكون ممكن تحقيق النجاح',                                correct: false },
          { text: 'قد النجاح يتحقق ربما',                                       correct: false },
          { text: 'النجاح شيء ممكن إذا الجهد يوجد',                            correct: false },
        ],
      },
      {
        id: 'G3_4',
        text: 'في الجملة: "تسعى سارة إلى تحسين علاماتها كل فصل دراسي"، لماذا استُخدم الفعل المضارع "تسعى"؟',
        options: [
          { text: 'للدلالة على الاستمرارية والتكرار',      correct: true  },
          { text: 'لأن الفعل الماضي لا يناسب السياق',     correct: false },
          { text: 'بدون قصد بلاغي',                          correct: false },
          { text: 'لأن المضارع أسهل في الكتابة',           correct: false },
        ],
      },
      // ── مُدمَج من بنك الـ15 سؤالاً (q14 — تراكيب متقدمة) ──
      {
        id: 'L3_MRG_Q14',
        text: 'اختر الجملة الصحيحة لغوياً',
        options: [
          { text: 'الطالباتُ يكتبنَ الدرسَ', correct: true  },
          { text: 'الطالباتُ يكتبونَ الدرسَ', correct: false },
          { text: 'الطالباتُ يكتبُ الدرسَ',   correct: false },
        ],
      },
    ],
    writing: [
      {
        id: 'W3_1',
        text: 'اكتب عن رحلتكم إلى المزرعة. اختر الفقرة الأفضل:',
        options: [
          { text: 'زرنا المزرعة الجميلة، وشاهدنا الحيوانات، وتعلّمنا من أين يأتي طعامنا', correct: true  },
          { text: 'المزرعة مكان ممل ولا أريد العودة إليها',                                  correct: false },
          { text: 'لا أتذكر شيئاً عن تلك الرحلة',                                            correct: false },
          { text: 'كانت رحلة سيئة لا تستحق الذكر',                                           correct: false },
        ],
      },
      {
        id: 'W3_2',
        text: 'اختر أفضل وصف لصداقة سارة ويوسف:',
        options: [
          { text: 'سارة ويوسف صديقان مقربان يساعد كل منهما الآخر ويشاركانه أجمل اللحظات', correct: true  },
          { text: 'سارة ويوسف لا يتفقان أبداً',                                              correct: false },
          { text: 'صداقتهما ليست مهمة',                                                      correct: false },
          { text: 'كل منهما يلعب وحده دائماً',                                               correct: false },
        ],
      },
      {
        id: 'W3_3',
        text: 'بعد فوز الفريق في المسابقة العلمية، أيّ العناصر يجب ذكرها في تقرير قصير عن التجربة؟',
        options: [
          { text: 'خطوات التحضير، والصعوبات التي واجهوها، وشعورهم بالفوز', correct: true  },
          { text: 'ذكر اسم القاعة وتاريخ المسابقة فقط',                      correct: false },
          { text: 'إعادة كتابة أسئلة المسابقة',                              correct: false },
          { text: 'مقارنة المسابقة بمباراة كرة قدم',                          correct: false },
        ],
      },
      {
        id: 'W3_4',
        text: 'اختر أفضل رسالة قصيرة لمعلمتك تشكرينها فيها على مساعدتها في المسابقة:',
        options: [
          { text: 'معلمتي العزيزة، أشكرك من قلبي على مساعدتك ودعمك لنا في المسابقة', correct: true  },
          { text: 'مرحباً، أعطيني علامة عالية من فضلك',                                correct: false },
          { text: 'يا أستاذة، أنا مشغول الآن',                                          correct: false },
          { text: 'إلى من يهمه الأمر، بخصوص الموضوع',                                  correct: false },
        ],
      },
    ],
  },
};

export function getLevelQuestions(levelId) {
  const key = `level${levelId}`;
  const levelData = questionsBank[key];
  if (!levelData) return [];

  const matching = [];
  const regular  = [];
  for (const skill of SKILLS) {
    const skillQuestions = levelData[skill.id] || [];
    skillQuestions.forEach(q => {
      const withSkill = { ...q, skill: skill.id };
      if (q.type === 'matching') matching.push(withSkill);
      else regular.push(withSkill);
    });
  }
  return [...matching, ...regular];
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
