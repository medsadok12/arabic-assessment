// 60 سؤال للتقييم الشامل - أكاديمية عارم

export const SKILLS = [
  { id: 'listening',  name: 'الاستماع والفهم السمعي', weight: 0.20 },
  { id: 'vocabulary', name: 'المفردات والمعاني',       weight: 0.20 },
  { id: 'reading',    name: 'القراءة والفهم',          weight: 0.20 },
  { id: 'grammar',    name: 'القواعد النحوية',         weight: 0.20 },
  { id: 'writing',    name: 'الكتابة والتعبير',        weight: 0.20 },
];

export const LEVELS = [
  { id: 1, name: 'مبتدئ',  icon: '🌱' },
  { id: 2, name: 'متوسط', icon: '📚' },
  { id: 3, name: 'متقدم', icon: '🎓' },
];

export const JUMP_THRESHOLD      = 85;
export const REGRESSION_THRESHOLD = 70;

export const questionsBank = {
  level1: {
    listening: [
      {
        id: 'L1_1',
        text: 'استمع: "تُفَّاحَة". ما هي هذه الكلمة؟',
        options: [
          { text: 'تفاحة',   correct: true  },
          { text: 'موزة',    correct: false },
          { text: 'برتقالة', correct: false },
          { text: 'عنبة',    correct: false },
        ],
      },
      {
        id: 'L1_2',
        text: 'استمع: "كِتَاب". ما هي هذه الكلمة؟',
        options: [
          { text: 'كتاب', correct: true  },
          { text: 'كَباب', correct: false },
          { text: 'كَلب',  correct: false },
          { text: 'كِبار', correct: false },
        ],
      },
      {
        id: 'L1_3',
        text: 'ما معنى تحية "السلام عليكم"؟',
        options: [
          { text: 'تحية إسلامية معروفة',     correct: true  },
          { text: 'جملة وداع',                correct: false },
          { text: 'سؤال عن الصحة',            correct: false },
          { text: 'طلب المساعدة',              correct: false },
        ],
      },
      {
        id: 'L1_4',
        text: 'ما معنى كلمة "نجم" في الجملة: "النجوم تضيء السماء ليلاً"؟',
        options: [
          { text: 'جسم مضيء في السماء', correct: true  },
          { text: 'حيوان بري',           correct: false },
          { text: 'نوع من الطعام',       correct: false },
          { text: 'نبات صغير',           correct: false },
        ],
      },
    ],
    vocabulary: [
      {
        id: 'V1_1',
        text: 'ما معنى كلمة "قمر"؟',
        options: [
          { text: 'جسم مضيء يدور حول الأرض ليلاً', correct: true  },
          { text: 'نجم صغير في السماء',              correct: false },
          { text: 'كوكب بعيد جداً',                  correct: false },
          { text: 'سحابة بيضاء',                     correct: false },
        ],
      },
      {
        id: 'V1_2',
        text: 'ما معنى كلمة "بحر"؟',
        options: [
          { text: 'مياه مالحة واسعة', correct: true  },
          { text: 'نهر صغير',         correct: false },
          { text: 'بئر عميقة',        correct: false },
          { text: 'بحيرة عذبة',       correct: false },
        ],
      },
      {
        id: 'V1_3',
        text: 'أكمل الجملة: "الشمس _____ كل صباح من الشرق"',
        options: [
          { text: 'تشرق',  correct: true  },
          { text: 'تسبح',  correct: false },
          { text: 'تركض',  correct: false },
          { text: 'تنام',  correct: false },
        ],
      },
      {
        id: 'V1_4',
        text: 'ما مرادف كلمة "سعيد"؟',
        options: [
          { text: 'مسرور', correct: true  },
          { text: 'حزين',  correct: false },
          { text: 'غاضب',  correct: false },
          { text: 'خائف',  correct: false },
        ],
      },
    ],
    reading: [
      {
        id: 'R1_1',
        text: 'اختر الكتابة الصحيحة لكلمة "مكان التعليم":',
        options: [
          { text: 'مدرسة', correct: true  },
          { text: 'مدرسه', correct: false },
          { text: 'مدرسو', correct: false },
          { text: 'مدرسي', correct: false },
        ],
      },
      {
        id: 'R1_2',
        text: 'اقرأ: "الطفل يلعب في الحديقة". ما الذي يفعله الطفل؟',
        options: [
          { text: 'يلعب ويستمتع',  correct: true  },
          { text: 'يدرس دروسه',   correct: false },
          { text: 'يأكل الطعام',  correct: false },
          { text: 'ينام مبكراً',  correct: false },
        ],
      },
      {
        id: 'R1_3',
        text: 'اقرأ: "السماء زرقاء جميلة اليوم". ماذا تخبرنا هذه الجملة؟',
        options: [
          { text: 'لون السماء أزرق',     correct: true  },
          { text: 'السماء تمطر الآن',     correct: false },
          { text: 'السماء مليئة بالغيوم', correct: false },
          { text: 'الطقس بارد جداً',      correct: false },
        ],
      },
      {
        id: 'R1_4',
        text: 'اقرأ: "محمد يحب الكتب كثيراً". ماذا يحب محمد؟',
        options: [
          { text: 'الكتب',    correct: true  },
          { text: 'الألعاب',  correct: false },
          { text: 'الرياضة',  correct: false },
          { text: 'الرسم',    correct: false },
        ],
      },
    ],
    grammar: [
      {
        id: 'G1_1',
        text: 'اختر الجملة الصحيحة:',
        options: [
          { text: 'أنا اسمي محمد',    correct: true  },
          { text: 'أنا يسمى محمد',    correct: false },
          { text: 'أنا سمي محمد',     correct: false },
          { text: 'اسمي أنا محمد هو', correct: false },
        ],
      },
      {
        id: 'G1_2',
        text: 'أكمل الجملة: "أنا _____ في المدرسة كل يوم"',
        options: [
          { text: 'أدرس',    correct: true  },
          { text: 'يدرس',    correct: false },
          { text: 'تدرس',    correct: false },
          { text: 'يدرسون',  correct: false },
        ],
      },
      {
        id: 'G1_3',
        text: 'ما نوع الكلمة "يكتب"؟',
        options: [
          { text: 'فعل مضارع', correct: true  },
          { text: 'اسم',       correct: false },
          { text: 'حرف جر',    correct: false },
          { text: 'فعل ماضٍ',  correct: false },
        ],
      },
      {
        id: 'G1_4',
        text: 'رتّب الكلمات لتكوين جملة صحيحة: (في / أنا / المدرسة)',
        options: [
          { text: 'أنا في المدرسة',    correct: true  },
          { text: 'في أنا المدرسة',    correct: false },
          { text: 'المدرسة أنا في',    correct: false },
          { text: 'أنا المدرسة في',    correct: false },
        ],
      },
    ],
    writing: [
      {
        id: 'W1_1',
        text: 'أمامك صورة تفاحة حمراء. ما الكلمة التي تصف هذه الصورة؟',
        options: [
          { text: 'تفاحة حمراء', correct: true  },
          { text: 'موزة صفراء',  correct: false },
          { text: 'برتقالة',     correct: false },
          { text: 'عنب أخضر',   correct: false },
        ],
      },
      {
        id: 'W1_2',
        text: 'اختر الجملة المناسبة للكتابة عن المدرسة:',
        options: [
          { text: 'المدرسة مكان رائع للتعلم',    correct: true  },
          { text: 'الموز أصفر اللون',             correct: false },
          { text: 'السماء جميلة في الصباح',       correct: false },
          { text: 'البحر واسع وعميق',             correct: false },
        ],
      },
      {
        id: 'W1_3',
        text: 'أكمل الجملة بشكل مناسب: "أحب أن _____ في وقت الفراغ"',
        options: [
          { text: 'أقرأ الكتب المفيدة', correct: true  },
          { text: 'لا أفعل شيئاً',       correct: false },
          { text: 'أنام طوال اليوم',     correct: false },
          { text: 'أبكي كثيراً',          correct: false },
        ],
      },
      {
        id: 'W1_4',
        text: 'أمامك صورة بنت تقرأ كتاباً. اختر الوصف الأنسب:',
        options: [
          { text: 'بنت تقرأ كتابها باهتمام',    correct: true  },
          { text: 'بنت تلعب في الحديقة',         correct: false },
          { text: 'بنت تنام على السرير',          correct: false },
          { text: 'بنت تأكل الطعام',              correct: false },
        ],
      },
    ],
  },

  level2: {
    listening: [
      {
        id: 'L2_1',
        text: 'استمعت لهذا النص: "الطالب الجيد يدرس بانتظام ويحضّر دروسه". ما الفكرة الرئيسية؟',
        options: [
          { text: 'أهمية الدراسة المنتظمة', correct: true  },
          { text: 'الطلاب كسالى دائماً',    correct: false },
          { text: 'المدرسة صعبة جداً',       correct: false },
          { text: 'الامتحانات مهمة',         correct: false },
        ],
      },
      {
        id: 'L2_2',
        text: 'استمعت: "محمد يعمل مهندساً في شركة كبيرة". ما مهنة محمد؟',
        options: [
          { text: 'مهندس',  correct: true  },
          { text: 'طبيب',   correct: false },
          { text: 'معلم',   correct: false },
          { text: 'محاسب',  correct: false },
        ],
      },
      {
        id: 'L2_3',
        text: 'استمعت: "السماء مليئة بغيوم داكنة والرياح قوية". ما توقعك للطقس؟',
        options: [
          { text: 'سيمطر قريباً',       correct: true  },
          { text: 'الطقس جميل ومشمس',   correct: false },
          { text: 'ستشرق الشمس بقوة',   correct: false },
          { text: 'الطقس حار جداً',      correct: false },
        ],
      },
      {
        id: 'L2_4',
        text: 'استمعت: "يقضي أحمد وقته في الفصل يشرح للطلاب ويصحح الواجبات". ما مهنة أحمد؟',
        options: [
          { text: 'معلم',    correct: true  },
          { text: 'طبيب',    correct: false },
          { text: 'مهندس',   correct: false },
          { text: 'تاجر',    correct: false },
        ],
      },
    ],
    vocabulary: [
      {
        id: 'V2_1',
        text: 'ما معنى كلمة "عميق" في جملة "البحر عميق جداً"؟',
        options: [
          { text: 'بعيد القاع', correct: true  },
          { text: 'ذو ألوان كثيرة', correct: false },
          { text: 'مليء بالأسماك', correct: false },
          { text: 'واسع الأطراف',  correct: false },
        ],
      },
      {
        id: 'V2_2',
        text: 'ما مرادف كلمة "رائع"؟',
        options: [
          { text: 'جميل ومبهر', correct: true  },
          { text: 'كبير الحجم', correct: false },
          { text: 'سريع الحركة', correct: false },
          { text: 'صغير جداً',   correct: false },
        ],
      },
      {
        id: 'V2_3',
        text: 'أكمل الجملة: "النبات _____ ببطء ويحتاج إلى ماء وضوء"',
        options: [
          { text: 'ينمو',   correct: true  },
          { text: 'يموت',   correct: false },
          { text: 'يسبح',   correct: false },
          { text: 'يطير',   correct: false },
        ],
      },
      {
        id: 'V2_4',
        text: 'أيّ من الكلمات التالية لا تنتمي للمجموعة: (تفاح، برتقال، سيارة، موز)؟',
        options: [
          { text: 'سيارة',    correct: true  },
          { text: 'تفاح',     correct: false },
          { text: 'برتقال',   correct: false },
          { text: 'موز',      correct: false },
        ],
      },
    ],
    reading: [
      {
        id: 'R2_1',
        text: 'اقرأ: "التعليم أساس التقدم وركيزة بناء الأمم". ما الفكرة الرئيسية؟',
        options: [
          { text: 'أهمية التعليم في تقدم المجتمعات', correct: true  },
          { text: 'المدارس تكلف أموالاً كثيرة',       correct: false },
          { text: 'الجامعات صعبة وشاقة',               correct: false },
          { text: 'التعليم متاح للجميع',               correct: false },
        ],
      },
      {
        id: 'R2_2',
        text: 'اقرأ: "فاطمة تقضي ساعتين يومياً في القراءة وتحب الروايات". ما هوايتها المفضلة؟',
        options: [
          { text: 'القراءة',       correct: true  },
          { text: 'الرياضيات',     correct: false },
          { text: 'اللغة العربية', correct: false },
          { text: 'الرسم',         correct: false },
        ],
      },
      {
        id: 'R2_3',
        text: 'اقرأ: "تراكمت الغيوم الداكنة وهبّت رياح قوية". ما الذي يمكن استنتاجه؟',
        options: [
          { text: 'من المرجح أن يمطر',   correct: true  },
          { text: 'الطقس مشمس وجميل',    correct: false },
          { text: 'ستشرق الشمس بشدة',    correct: false },
          { text: 'الطقس حار ورطب',       correct: false },
        ],
      },
      {
        id: 'R2_4',
        text: 'اقرأ: "يعمل العمال بسرعة كبيرة لنقل الخضار والفواكه لأن الحرارة تتلفها". لماذا يعملون بسرعة؟',
        options: [
          { text: 'لأن الحرارة تتلف البضاعة', correct: true  },
          { text: 'لأنهم يريدون راحة مبكرة',  correct: false },
          { text: 'لأنهم كسالى في الغالب',    correct: false },
          { text: 'لأن المدير يراقبهم',        correct: false },
        ],
      },
    ],
    grammar: [
      {
        id: 'G2_1',
        text: 'اختر الجملة النحوية الصحيحة:',
        options: [
          { text: 'يذهب الطلاب إلى المدرسة كل يوم',    correct: true  },
          { text: 'يذهبوا الطلاب إلى المدرسة',          correct: false },
          { text: 'الطلاب يذهبوا كل يوم للمدرسة',       correct: false },
          { text: 'ذهب الطلاب غداً للمدرسة',            correct: false },
        ],
      },
      {
        id: 'G2_2',
        text: 'أكمل الجملة: "هم _____ الدرس جيداً"',
        options: [
          { text: 'يفهمون',  correct: true  },
          { text: 'يفهم',    correct: false },
          { text: 'يفهمان',  correct: false },
          { text: 'تفهم',    correct: false },
        ],
      },
      {
        id: 'G2_3',
        text: 'اختر الجملة المركبة الصحيحة:',
        options: [
          { text: 'عندما ذهبتُ إلى السوق، وجدتُها مغلقة',   correct: true  },
          { text: 'ذهبتُ للسوق وجدتُ مغلق',                  correct: false },
          { text: 'أنا ذهبتُ وجدتُ السوق مغلقة',             correct: false },
          { text: 'السوق ذهبتُ وجدتُها مغلقة',               correct: false },
        ],
      },
      {
        id: 'G2_4',
        text: 'حدّد الخطأ النحوي في: "الطلابُ الذين درسوا بجد نجحوا في الامتحان"',
        options: [
          { text: 'الجملة صحيحة نحوياً',         correct: true  },
          { text: 'خطأ في ترتيب الجملة',          correct: false },
          { text: 'خطأ في تصريف الفعل',           correct: false },
          { text: 'خطأ في استخدام الاسم الموصول', correct: false },
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
        text: 'اختر الحوار المناسب عن الطقس بين شخصين:',
        options: [
          { text: '- كيف الطقس اليوم؟ - جميل ومشمس، مناسب للنزهة', correct: true  },
          { text: '- ما اسمك؟ - اسمي محمد وأنا من القاهرة',          correct: false },
          { text: '- أين المدرسة؟ - هي في وسط المدينة',               correct: false },
          { text: '- متى يبدأ الدرس؟ - يبدأ في الثامنة',              correct: false },
        ],
      },
      {
        id: 'W2_3',
        text: 'اختر الجملة الأنسب لشرح أهمية القراءة:',
        options: [
          { text: 'القراءة تزيد المعرفة وتوسّع الأفق وتنمّي الخيال',  correct: true  },
          { text: 'القراءة تسبب الملل وتضيع الوقت',                     correct: false },
          { text: 'القراءة ليست مهمة في العصر الرقمي',                  correct: false },
          { text: 'القراءة مفيدة للصغار فقط',                           correct: false },
        ],
      },
      {
        id: 'W2_4',
        text: 'اكتب عن يوم مميز. اختر التعبير الأفضل:',
        options: [
          { text: 'كان يوماً جميلاً أمضيته مع عائلتي في رحلة ممتعة إلى البحر', correct: true  },
          { text: 'كان يوماً عادياً لم يحدث فيه شيء',                              correct: false },
          { text: 'لا أتذكر أي شيء عن ذلك اليوم',                                  correct: false },
          { text: 'كان يوماً سيئاً لا أريد تذكره',                                  correct: false },
        ],
      },
    ],
  },

  level3: {
    listening: [
      {
        id: 'L3_1',
        text: 'استمعتَ لمحاضرة تقول: "اللغة العربية إرث حضاري عريق يمتد عبر قرون". ما الوصف الأنسب للغة وفق المحاضرة؟',
        options: [
          { text: 'لغة تاريخية غنية وعريقة',      correct: true  },
          { text: 'لغة صعبة التعلم والاستيعاب',   correct: false },
          { text: 'لغة قديمة غير مستخدمة',         correct: false },
          { text: 'لغة محدودة الانتشار',            correct: false },
        ],
      },
      {
        id: 'L3_2',
        text: 'استمعتَ: "التفوق الأكاديمي لا يعني الحفظ وحده، بل الفهم العميق والتطبيق". ماذا يستلزم التفوق وفق هذا النص؟',
        options: [
          { text: 'الفهم العميق والتطبيق الفعلي', correct: true  },
          { text: 'الحفظ والاستذكار وحدهما',       correct: false },
          { text: 'الدراسة المكثفة فقط',            correct: false },
          { text: 'الاعتماد على الأساتذة',           correct: false },
        ],
      },
      {
        id: 'L3_3',
        text: 'استمعتَ لنقاش حول التعليم الإلكتروني. قال المتحدث: "له مزايا عديدة، لكن ينبغي ألا يحلّ محل التفاعل الإنساني". ما موقف المتحدث؟',
        options: [
          { text: 'إيجابي مع تحفّظ على الاستغناء عن التفاعل البشري', correct: true  },
          { text: 'رافض للتعليم الإلكتروني رفضاً تاماً',               correct: false },
          { text: 'محايد لا رأي له في الموضوع',                         correct: false },
          { text: 'مؤيد كامل دون أي تحفظات',                            correct: false },
        ],
      },
      {
        id: 'L3_4',
        text: 'استمعتَ لنقاش بين شخصين: الأول قدّم أدلة وإحصاءات دقيقة، والثاني اعتمد على أمثلة عاطفية فقط. أيّهما أقوى حجةً؟',
        options: [
          { text: 'الأول لأن حججه مدعومة بأدلة موضوعية', correct: true  },
          { text: 'كلاهما متساوٍ في القوة والإقناع',        correct: false },
          { text: 'الثاني لأن العواطف أكثر إقناعاً',        correct: false },
          { text: 'لا يمكن التمييز بينهما',                  correct: false },
        ],
      },
    ],
    vocabulary: [
      {
        id: 'V3_1',
        text: 'ما المعنى الدقيق لكلمة "الاستقلالية" في السياق الفكري؟',
        options: [
          { text: 'القدرة على اتخاذ القرارات بشكل ذاتي ومستقل', correct: true  },
          { text: 'امتلاك الثروة والنفوذ',                        correct: false },
          { text: 'القوة العسكرية للدولة',                        correct: false },
          { text: 'الانعزال عن المجتمع',                          correct: false },
        ],
      },
      {
        id: 'V3_2',
        text: 'ما الفرق الدقيق بين "يتذكر" و"يستذكر"؟',
        options: [
          { text: 'يتذكر: استحضار من الذاكرة، يستذكر: مراجعة الدروس للحفظ', correct: true  },
          { text: 'كلاهما بنفس المعنى تماماً',                                  correct: false },
          { text: 'يستذكر أقوى في المعنى من يتذكر',                            correct: false },
          { text: 'يتذكر أشمل وأعمق من يستذكر',                                correct: false },
        ],
      },
      {
        id: 'V3_3',
        text: 'أكمل العبارة الأدبية: "الأديب الحقيقي _____ في أعماق التجربة الإنسانية"',
        options: [
          { text: 'يغوص',   correct: true  },
          { text: 'يركض',   correct: false },
          { text: 'ينسى',   correct: false },
          { text: 'يتجاهل', correct: false },
        ],
      },
      {
        id: 'V3_4',
        text: 'اختر التعبير الأدبي الأدق: "الشاعر الماهر _____ مشاعره في صور بلاغية رائعة"',
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
        text: 'اقرأ: "الإنسان كائن يبحث دوماً عن معنى لوجوده في هذا العالم الفسيح". ما الفكرة المحورية؟',
        options: [
          { text: 'البحث الأزلي للإنسان عن معنى الوجود',  correct: true  },
          { text: 'الإنسان حزين دائماً في هذا العالم',    correct: false },
          { text: 'لا معنى لوجود الإنسان',                  correct: false },
          { text: 'العالم واسع وفسيح فقط',                  correct: false },
        ],
      },
      {
        id: 'R3_2',
        text: 'اقرأ: "التقدم التكنولوجي سلاح ذو حدّين: يُيسّر الحياة ويهدد الخصوصية في آنٍ واحد". ما الاستنتاج المناسب؟',
        options: [
          { text: 'التكنولوجيا لها مزايا وسلبيات في آنٍ معاً',  correct: true  },
          { text: 'التكنولوجيا سيئة ومضرة بالمجتمع',              correct: false },
          { text: 'التكنولوجيا حلم وردي بلا عيوب',                correct: false },
          { text: 'التكنولوجيا تقتصر على تيسير الحياة فقط',      correct: false },
        ],
      },
      {
        id: 'R3_3',
        text: 'اقرأ: "المعرفة وحدها لا تملأ الروح؛ تحتاج إلى جماليات الفن والتأمل لتكتمل". ما دلالة هذا النص؟',
        options: [
          { text: 'المعرفة ضرورية لكنها تحتاج إلى عناصر أخرى كالفن لتكتمل', correct: true  },
          { text: 'المعرفة العلمية غير مهمة لكمال الإنسان',                    correct: false },
          { text: 'الروح أهم من العقل في كل الأحوال',                          correct: false },
          { text: 'الفن يعوض عن المعرفة بالكامل',                               correct: false },
        ],
      },
      {
        id: 'R3_4',
        text: 'قارن نصّين: الأول يعتمد على أدلة علمية، والثاني على أدلة عاطفية. من الأقوى حجةً؟',
        options: [
          { text: 'الأول أقوى لأن الأدلة العلمية موضوعية ويمكن التحقق منها', correct: true  },
          { text: 'كلاهما متساوٍ في الحجة والإقناع',                            correct: false },
          { text: 'الثاني أفضل لأن العاطفة تؤثر في الجمهور أكثر',            correct: false },
          { text: 'لا يمكن المقارنة بينهما أصلاً',                              correct: false },
        ],
      },
    ],
    grammar: [
      {
        id: 'G3_1',
        text: 'حدّد صحة هذه الجملة نحوياً: "لو كان يدرس أكثر لنجح في الامتحان"',
        options: [
          { text: 'صحيحة نحوياً، وهي جملة شرطية بـ"لو"',  correct: true  },
          { text: 'خطأ في الجزم',                              correct: false },
          { text: 'خطأ في جواب الشرط',                        correct: false },
          { text: 'خطأ في اختيار أداة الشرط',                 correct: false },
        ],
      },
      {
        id: 'G3_2',
        text: 'حدّد الصحة النحوية: "الطلابُ الذين لم يُذاكروا رسبوا في الامتحان"',
        options: [
          { text: 'الجملة صحيحة نحوياً بالكامل',            correct: true  },
          { text: 'خطأ في الموافقة بين الفعل والفاعل',       correct: false },
          { text: 'خطأ في استخدام أداة النفي',               correct: false },
          { text: 'خطأ في استخدام اسم الموصول',              correct: false },
        ],
      },
      {
        id: 'G3_3',
        text: 'اختر الجملة الأكثر أناقةً وصحةً أسلوبياً:',
        options: [
          { text: 'من الممكن تحقيق النجاح إذا توافرت الإرادة والعزيمة', correct: true  },
          { text: 'قد يكون ممكن تحقيق النجاح',                            correct: false },
          { text: 'قد النجاح يتحقق ربما',                                   correct: false },
          { text: 'النجاح شيء ممكن إذا الإرادة توجد',                     correct: false },
        ],
      },
      {
        id: 'G3_4',
        text: 'في النص الأدبي: "يسعى الأديب إلى تصوير الواقع بعين الشاعر". لماذا اختار الكاتب المضارع "يسعى"؟',
        options: [
          { text: 'للدلالة على الاستمرارية والتجدد',      correct: true  },
          { text: 'لأن الفعل الماضي لا يناسب السياق',     correct: false },
          { text: 'بدون قصد بلاغي',                          correct: false },
          { text: 'لأن المضارع أسهل في الكتابة',           correct: false },
        ],
      },
    ],
    writing: [
      {
        id: 'W3_1',
        text: 'اكتب عن دور الإعلام في المجتمع. اختر التعبير الأوفى:',
        options: [
          { text: 'الإعلام مسؤول عن نشر المعلومات وتشكيل الوعي العام وتوعية المجتمع بقضاياه', correct: true  },
          { text: 'الإعلام غير مهم وتأثيره محدود',                                                correct: false },
          { text: 'الإعلام يكذب دائماً ولا يُعتمد عليه',                                           correct: false },
          { text: 'الإعلام وسيلة ترفيه بحتة لا أكثر',                                               correct: false },
        ],
      },
      {
        id: 'W3_2',
        text: 'اختر التعبير الأدبي الأجمل لموضوع "الحب والعطاء":',
        options: [
          { text: 'الحب والعطاء جناحان يرفعان الروح نحو سماء الجمال والخير', correct: true  },
          { text: 'الحب والعطاء مجرد وهم لا وجود له',                           correct: false },
          { text: 'الحب والعطاء خسارة وضياع للوقت',                              correct: false },
          { text: 'الحب والعطاء مفاهيم تقليدية لا معنى لها',                    correct: false },
        ],
      },
      {
        id: 'W3_3',
        text: 'في تحليل نقدي لقصيدة ما، أيّ العناصر الأساسية التي ينبغي تناولها؟',
        options: [
          { text: 'الصور البلاغية والأسلوب والبنية والفكرة الرئيسية',        correct: true  },
          { text: 'ذكر اسم الشاعر وتاريخ ميلاده فقط',                         correct: false },
          { text: 'إعادة كتابة القصيدة بأسلوب آخر',                             correct: false },
          { text: 'مقارنة القصيدة بأغنية عصرية',                                correct: false },
        ],
      },
      {
        id: 'W3_4',
        text: 'اختر الافتتاحية الأفضل لرسالة رسمية إلى مدير المدرسة:',
        options: [
          { text: 'حضرة المدير الموقر، تحية طيبة وبعد؛ أتقدم إليكم بهذا الطلب...',   correct: true  },
          { text: 'مرحبا يا مدير، أريد أن أطلب منك شيئاً...',                            correct: false },
          { text: 'صاحبي العزيز، أكتب إليك هذه الرسالة...',                               correct: false },
          { text: 'إلى من يهمه الأمر، بخصوص الموضوع...',                                 correct: false },
        ],
      },
    ],
  },
};

export function getLevelQuestions(levelId) {
  const key = `level${levelId}`;
  const levelData = questionsBank[key];
  if (!levelData) return [];

  const questions = [];
  for (const skill of SKILLS) {
    const skillQuestions = levelData[skill.id] || [];
    skillQuestions.forEach(q => questions.push({ ...q, skill: skill.id }));
  }
  return questions;
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
