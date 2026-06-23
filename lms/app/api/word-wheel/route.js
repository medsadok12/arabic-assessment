import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 20 عجلة × 4 مستويات — كل عجلة تحتوي على قائمة كلمات تعليمية مختارة
const CATALOG = [
  // ━━━ المرحلة 1 — مبتدئ (120 ث) ━━━
  { level:1, center:'م', letters:['ك','ت','ب','ر','س','ن','ل','د'], time:120,
    valid_words:['تمر','سمك','نمر','رمل','سلم','مدرس','مكتب','مسكن'] },
  { level:1, center:'ل', letters:['ع','ب','م','ك','ت','ر','ف','ن'], time:120,
    valid_words:['لعب','ملك','علم','نمل','رمل','لبن','ملعب','تعلم'] },
  { level:1, center:'ر', letters:['د','م','س','ب','ن','ك','ت','ل'], time:120,
    valid_words:['نسر','برد','كرم','درس','رمل','سكر','ركب','مدرس','منبر'] },
  { level:1, center:'ن', letters:['م','ل','ر','س','ب','ع','ت','ف'], time:120,
    valid_words:['نمر','نسر','نبت','لبن','سمن','فرن','نبل','منبر','تمرن'] },
  { level:1, center:'س', letters:['م','ر','ل','ن','ت','ب','ع','ك'], time:120,
    valid_words:['سمك','نسر','سلم','مسكن','ملبس','سبع','سكن','كنس','تسمع'] },
  // ━━━ المرحلة 2 — متوسط (90 ث) ━━━
  { level:2, center:'ع', letters:['ل','م','ب','ر','ق','ش','ف','ت'], time:90,
    valid_words:['لعب','علم','عمل','فعل','شعر','عقل','ملعب','مربع','تعلم'] },
  { level:2, center:'ق', letters:['ر','ل','م','ب','س','ن','ت','ع'], time:90,
    valid_words:['قمر','قلب','عقل','نقل','بقل','سبق','قرن'] },
  { level:2, center:'ف', letters:['ر','م','ع','ل','ت','ن','ك','ب'], time:90,
    valid_words:['فرن','فكر','فلك','ملف','كتف','فعل','فرع','تفكر','تفرع'] },
  { level:2, center:'ح', letters:['م','ب','ر','ل','س','ن','ت','ك'], time:90,
    valid_words:['بحر','محل','ملح','لحم','سبح','حبل','حمل','مسبح','حلب'] },
  { level:2, center:'ش', letters:['ر','م','س','ع','ق','ل','ب','ن'], time:90,
    valid_words:['شمس','شبل','شعر','نشر','بشر','شمع','شعب','شرق','قشر','مشرق','منشر'] },
  // ━━━ المرحلة 3 — متقدم (75 ث) ━━━
  { level:3, center:'خ', letters:['ر','م','ب','ل','ع','ش','ق','ت'], time:75,
    valid_words:['خبر','بخل','خلق','خشب','خلع','بخر','مخبر','تخلق'] },
  { level:3, center:'ذ', letters:['ر','م','ك','ب','ل','ع','ت','ن'], time:75,
    valid_words:['ذكر','بذل','نبذ','مذكر','تذكر','منذر'] },
  { level:3, center:'غ', letters:['ر','م','ب','ل','ع','ش','ف','ن'], time:75,
    valid_words:['غنم','نغم','بلغ','فرغ','شغل','غمر','مغرب','شغف','مشغل'] },
  { level:3, center:'ض', letters:['ر','م','ب','ل','ع','ك','ن','ت'], time:75,
    valid_words:['ضرب','عرض','ضمن','بعض','تضمن','ضلع','مضرب'] },
  { level:3, center:'ط', letters:['ر','م','ب','ل','ع','ك','ن','ي'], time:75,
    valid_words:['طبل','طيب','طير','بطل','طلب','طلع','مطلع','طمر'] },
  // ━━━ المرحلة 4 — أسطوري (60 ث) ━━━
  { level:4, center:'ظ', letters:['ر','م','ب','ل','ع','ك','ن','ف'], time:60,
    valid_words:['ظفر','ظلم','عظم','نظر','ظرف','لفظ','منظر'] },
  { level:4, center:'ث', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,
    valid_words:['ثعلب','ثمر','ثمن','لبث','بعث'] },
  { level:4, center:'ج', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,
    valid_words:['جمل','جبل','نجم','فجر','برج','عجل','رجل','منجل'] },
  { level:4, center:'ص', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,
    valid_words:['صبر','نصر','صفر','صلب','صنف','نصل','فصل','عصر','مصنع','منصب'] },
  { level:4, center:'ز', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,
    valid_words:['رمز','كنز','زمن','نزل','فرز','برز','ركز','منزل','مركز'] },
];

const LEVELS = [
  { id:1, label:'مبتدئ',  icon:'🟢', desc:'حروف شائعة — 120 ثانية' },
  { id:2, label:'متوسط',  icon:'🟡', desc:'حروف أصعب — 90 ثانية'  },
  { id:3, label:'متقدم',  icon:'🟠', desc:'حروف نادرة — 75 ثانية' },
  { id:4, label:'أسطوري', icon:'🔴', desc:'التحدي الأقصى — 60 ثانية' },
];

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const level = Math.min(4, Math.max(1, parseInt(searchParams.get('level') || '1')));
  const idx   = Math.max(0, parseInt(searchParams.get('index') || '0'));

  const wheels = CATALOG.filter(w => w.level === level);
  const wheel  = wheels[idx % wheels.length];

  return NextResponse.json({
    level:       wheel.level,
    index:       idx % wheels.length,
    total:       wheels.length,
    center:      wheel.center,
    letters:     wheel.letters,
    time:        wheel.time,
    valid_words: wheel.valid_words || [],
    levels:      LEVELS,
  });
}
