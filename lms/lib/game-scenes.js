/* ════════════════════════════════════════════════════════════════
   عوالم الألعاب — لكل مجموعة كلمات مشهد خلفية مرسوم (components/GameScene.jsx).
   طلب الأستاذ محمد (2026-10-21) بعد تصاميم «صيّاد الحروف»: «فكرة صورة في الخلفية
   ممتعة جداً… طبّق هذه الخلفيات… والأدوات والعائلة ما هي خلفياتها؟».
   المجموعات أسماء يكتبها المعلم بحرية («أدوات»، «الرّياضة والألعاب»…)، فالربط
   بكلمات مفتاحية بعد تطبيع الكتابة، لا بأسماء ثابتة. الترتيب مهم: الأخصّ أولاً.
════════════════════════════════════════════════════════════════ */

export const SCENES = [
  'savanna', 'orchard', 'sea', 'garden', 'farm', 'workshop', 'city', 'sports',
  'jobs', 'clothes', 'weather', 'shapes', 'family', 'colors', 'numbers', 'school', 'meadow',
];

// تشكيل وتطويل وهمزات وتاء مربوطة وألف مقصورة ← صيغة واحدة للمطابقة
export function normalizeArabic(text) {
  return String(text ?? '')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

const RULES = [
  ['sea', /بحر|سمك|محيط/],
  ['savanna', /حيوان|غاب|برار/],
  ['orchard', /غلال|فواك|فاكه|ثمار/],
  ['garden', /خضر|خضار|بقول/],
  ['farm', /فلاح|زراع|مزرع|ريف/],
  ['school', /مدرس|قسم|فصل الدراس/],
  ['numbers', /ارقام|رقم|اعداد|عدد|حساب/],
  ['workshop', /ادوات|اداه|عده|ورش|الات/],
  ['city', /اماكن|مكان|مدن|مدينه|شارع/],
  ['sports', /رياض|العاب|لعب/],
  ['jobs', /مهن|مهنه|وظائف|حرف/],
  ['clothes', /ملابس|لباس|زينه|ازياء/],
  ['weather', /طقس|فصول|مناخ|جو/],
  ['shapes', /اشكال|شكل/],
  ['family', /اسره|عائله|عايله|اهل|منزل|بيت/],
  ['colors', /الوان|لون/],
  ['meadow', /طبيع/],
];

export function sceneFor(category) {
  const c = normalizeArabic(category);
  if (!c) return 'meadow';
  for (const [scene, re] of RULES) if (re.test(c)) return scene;
  return 'meadow';
}
