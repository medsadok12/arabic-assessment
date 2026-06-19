import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 20 عجلة × 4 مستويات — مصمّمة يدوياً لضمان وجود كلمات كافية
const CATALOG = [
  // ━━━ المرحلة 1 — مبتدئ (120 ث) ━━━
  { level:1, center:'م', letters:['ك','ت','ب','ر','س','ن','ل','د'], time:120 },
  { level:1, center:'ل', letters:['ع','ب','م','ك','ت','ر','ف','ن'], time:120 },
  { level:1, center:'ر', letters:['د','م','س','ب','ن','ك','ت','ل'], time:120 },
  { level:1, center:'ن', letters:['م','ل','ر','س','ب','ع','ت','ف'], time:120 },
  { level:1, center:'س', letters:['م','ر','ل','ن','ت','ب','ع','ك'], time:120 },
  // ━━━ المرحلة 2 — متوسط (90 ث) ━━━
  { level:2, center:'ع', letters:['ل','م','ب','ر','ق','ش','ف','ت'], time:90 },
  { level:2, center:'ق', letters:['ر','ل','م','ب','س','ن','ت','ع'], time:90 },
  { level:2, center:'ف', letters:['ر','م','ع','ل','ت','ن','ك','ب'], time:90 },
  { level:2, center:'ح', letters:['م','ب','ر','ل','س','ن','ت','ك'], time:90 },
  { level:2, center:'ش', letters:['ر','م','س','ع','ق','ل','ب','ن'], time:90 },
  // ━━━ المرحلة 3 — متقدم (75 ث) ━━━
  { level:3, center:'خ', letters:['ر','م','ب','ل','ع','ش','ق','ت'], time:75 },
  { level:3, center:'ذ', letters:['ر','م','ك','ب','ل','ع','ت','ن'], time:75 },
  { level:3, center:'غ', letters:['ر','م','ب','ل','ع','ش','ف','ن'], time:75 },
  { level:3, center:'ض', letters:['ر','م','ب','ل','ع','ك','ن','ت'], time:75 },
  { level:3, center:'ط', letters:['ر','م','ب','ل','ع','ك','ن','ي'], time:75 },
  // ━━━ المرحلة 4 — أسطوري (60 ث) ━━━
  { level:4, center:'ظ', letters:['ر','م','ب','ل','ع','ك','ن','ف'], time:60 },
  { level:4, center:'ث', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60 },
  { level:4, center:'ج', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60 },
  { level:4, center:'ص', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60 },
  { level:4, center:'ز', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60 },
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
    levels:      LEVELS,
  });
}
