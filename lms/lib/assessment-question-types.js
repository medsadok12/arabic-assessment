// مصدر الحقيقة الوحيد لأنواع أسئلة التقييم الـ23 (arabic-assessment) —
// يُستهلَك من واجهة إدارة التقييمات في bogga لبناء نموذج تحرير مولَّد آلياً
// لكل نوع، بدل 23 مكوّناً منفصلاً مكرراً (مبدأ DRY، القسم 12.3 من CLAUDE.md).
//
// الفئة A: محتوى حقيقي (نص/خيارات/أزواج...) — نموذج تحرير كامل.
// الفئة B: تدريبات صوتية/حرفية ثابتة البنية داخل كود المكوّن نفسه في تطبيق
// التقييم (الأبجدية، حروف المد، السكون، التنوين...) — إدارة وصفية فقط
// (المستوى/المهارة/الترتيب/التفعيل/الوزن)، بلا تحرير محتوى، بقرار صريح من
// الأستاذ محمد (لا مساس بمنطق السحب والإفلات لهذه المكوّنات).

export const SKILL_LABELS = {
  listening:  'الاستماع والفهم السمعي',
  vocabulary: 'المفردات والمعاني',
  reading:    'القراءة والفهم',
  grammar:    'القواعد النحوية',
  writing:    'الكتابة والتعبير',
  speaking:   'النطق والتعبير الشفهي',
};

export const CATEGORY_B_TYPES = new Set([
  'letter-recognition', 'vowel-cards', 'vowel-long', 'sukun-cards',
  'tanween-cards', 'letter-position', 'word-construct', 'oral-assessment',
]);

export const TYPE_LABELS = {
  mcq:                     'اختيار من متعدد',
  'listen-choose':         'استماع ثم اختيار',
  'listening-comprehension': 'فهم مسموع',
  matching:                'توصيل (نص)',
  'image-matching':        'توصيل (رمز/صورة)',
  'syllable-order':        'ترتيب مقاطع كلمة',
  'syllable-reading':      'قراءة مقاطع',
  'dialogue-order':        'ترتيب حوار',
  'letter-listen-choose':  'استماع واختيار حرف',
  'listen-speak':          'أسئلة شفهية (استماع وإجابة)',
  speaking:                'تسجيل صوتي لنص محدد',
  'photo-writing':         'كتابة عن صورة (تصوير الإجابة)',
  'word-order':            'ترتيب كلمات جملة',
  correction:              'تصحيح خطأ في جملة',
  fill:                    'إكمال الفراغ',
  'letter-recognition':    'التعرف على الحروف الهجائية (ثابت)',
  'vowel-cards':           'الحركات القصيرة (ثابت)',
  'vowel-long':            'حروف المدّ (ثابت)',
  'sukun-cards':           'السكون (ثابت)',
  'tanween-cards':         'التنوين (ثابت)',
  'letter-position':       'موضع الحرف في الكلمة (ثابت)',
  'word-construct':        'بناء الكلمة من حروف (ثابت)',
  'oral-assessment':       'تقييم نطق حرّ (ثابت)',
};

export const CATEGORY_A_TYPES = Object.keys(TYPE_LABELS).filter(t => !CATEGORY_B_TYPES.has(t));

// أنواع حقول النموذج المولَّد آلياً — كل نوع سؤال (فئة A) يُوصَف بمصفوفة
// من هذه الحقول، ويبنيها QuestionFieldEditor.jsx عبر switch واحد بدل
// مكوّن منفصل لكل نوع.
export const FIELD_SCHEMAS = {
  mcq: [
    { key: 'text', label: 'نص السؤال', kind: 'textarea', required: true },
    { key: 'options', label: 'الخيارات (حدّد الإجابة الصحيحة)', kind: 'options-mcq' },
  ],
  'listen-choose': [
    { key: 'text', label: 'نص التعليمة', kind: 'text' },
    { key: 'word', label: 'الكلمة المستهدفة', kind: 'text' },
    { key: 'audioText', label: 'النص المسموع (يُقرأ صوتياً)', kind: 'text' },
    { key: 'options', label: 'الخيارات (نص فقط، بلا وسم صحيح/خطأ)', kind: 'string-list' },
    { key: 'correct', label: 'رقم الخيار الصحيح (0 = الأول)', kind: 'number' },
  ],
  'listening-comprehension': [
    { key: 'audioText', label: 'النص المسموع (يُقرأ صوتياً)', kind: 'textarea' },
    { key: 'text', label: 'نص السؤال', kind: 'textarea', required: true },
    { key: 'options', label: 'الخيارات (حدّد الإجابة الصحيحة)', kind: 'options-mcq' },
  ],
  matching: [
    { key: 'text', label: 'نص التعليمة', kind: 'text' },
    { key: 'pairs', label: 'الأزواج (رمز/إيموجي + الاسم)', kind: 'pairs' },
  ],
  'image-matching': [
    { key: 'text', label: 'نص التعليمة', kind: 'text' },
    { key: 'pairs', label: 'الأزواج (رمز/إيموجي + الاسم)', kind: 'pairs' },
  ],
  'syllable-order': [
    { key: 'text', label: 'نص التعليمة', kind: 'text' },
    { key: 'word', label: 'الكلمة الكاملة', kind: 'text' },
    { key: 'syllables', label: 'المقاطع بالترتيب الصحيح', kind: 'string-list' },
  ],
  'syllable-reading': [
    { key: 'text', label: 'نص التعليمة', kind: 'text' },
    { key: 'syllables', label: 'المقاطع', kind: 'string-list' },
  ],
  'dialogue-order': [
    { key: 'text', label: 'نص التعليمة', kind: 'text' },
    { key: 'lines', label: 'جمل الحوار بالترتيب الصحيح', kind: 'dialogue-lines' },
  ],
  'letter-listen-choose': [
    { key: 'text', label: 'نص التعليمة', kind: 'text' },
    { key: 'items', label: 'عناصر الاستماع (حرف + خيارات)', kind: 'letter-choices' },
  ],
  'listen-speak': [
    { key: 'text', label: 'نص التعليمة', kind: 'text' },
    { key: 'items', label: 'الأسئلة الشفهية', kind: 'items-text' },
  ],
  speaking: [
    { key: 'text', label: 'نص التعليمة', kind: 'text' },
    { key: 'prompt', label: 'الجملة/الكلمة المطلوب نطقها', kind: 'text' },
    { key: 'audioText', label: 'النص المسموع (اختياري)', kind: 'text' },
  ],
  'photo-writing': [
    { key: 'text', label: 'نص التعليمة (يمكن تضمين إيموجي الصورة)', kind: 'textarea', required: true },
  ],
  'word-order': [
    { key: 'text', label: 'نص التعليمة', kind: 'text' },
    { key: 'words', label: 'كلمات الجملة (بالترتيب الصحيح)', kind: 'string-list' },
    { key: 'answer', label: 'الجملة الصحيحة كاملة', kind: 'text' },
  ],
  correction: [
    { key: 'text', label: 'نص التعليمة', kind: 'text' },
    { key: 'wrongSentence', label: 'الجملة الخاطئة', kind: 'text' },
    { key: 'correctAnswer', label: 'الجملة الصحيحة', kind: 'text' },
    { key: 'hint', label: 'تلميح (اختياري)', kind: 'text' },
  ],
  fill: [
    { key: 'text', label: 'نص التعليمة', kind: 'text' },
    { key: 'sentence', label: 'الجملة (استخدم ___ لمكان الفراغ)', kind: 'text' },
    { key: 'answers', label: 'الإجابات المقبولة', kind: 'string-list' },
  ],
};

// الفئة B — بلا حقول محتوى إطلاقاً؛ إدارة وصفية فقط (مستوى/مهارة/ترتيب/
// تفعيل/وزن)، مُدارة من الجدول العام لا من نموذج مخصص.
for (const t of CATEGORY_B_TYPES) FIELD_SCHEMAS[t] = [];

export function emptyPayloadFor(type) {
  const schema = FIELD_SCHEMAS[type] || [];
  const payload = {};
  for (const f of schema) {
    if (f.kind === 'string-list' || f.kind === 'options-mcq' || f.kind === 'pairs' ||
        f.kind === 'dialogue-lines' || f.kind === 'letter-choices' || f.kind === 'items-text') {
      payload[f.key] = [];
    } else if (f.kind === 'number') {
      payload[f.key] = 0;
    } else {
      payload[f.key] = '';
    }
  }
  return payload;
}
