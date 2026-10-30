/* ════════════════════════════════════════════════════════════════
   عجلة الكلمات — المنطق المشترك (بلا DOM): الأنماط الثلاثة، الألوان،
   الإعدادات، التحقق من العجلات والكلمات، ومساعدات اللعب.
   مصدر واحد للعبة (library/games/word-wheel) ولوحة إدارتها ومسارات
   /api/word-wheel/* ومعاينتها في الصفحة الرئيسية.

   المحتوى كله في قاعدة البيانات (lms/supabase/word_wheel_v2.sql):
   العجلات في word_wheel_configs، وبطاقات الكلمات في word_wheel_words،
   والمظهر والإعدادات العامة في game_settings ('word-wheel').
   DEFAULT_CATALOG نسخة احتياطية للتحدي المفتوح إن تعذّر الجلب.
════════════════════════════════════════════════════════════════ */

export const DEFAULT_CATALOG = [
  { level:1, wheel_index:0, center:'م', letters:['ك','ت','ب','ر','س','ن','ل','د'], time:120, valid_words:['تمر','سمك','نمر','رمل','سلم','مدرس','مكتب','مسكن'] },
  { level:1, wheel_index:1, center:'ل', letters:['ع','ب','م','ك','ت','ر','ف','ن'], time:120, valid_words:['لعب','ملك','علم','نمل','رمل','لبن','ملعب','تعلم'] },
  { level:1, wheel_index:2, center:'ر', letters:['د','م','س','ب','ن','ك','ت','ل'], time:120, valid_words:['نسر','برد','كرم','درس','رمل','سكر','ركب','مدرس','منبر'] },
  { level:1, wheel_index:3, center:'ن', letters:['م','ل','ر','س','ب','ع','ت','ف'], time:120, valid_words:['نمر','نسر','نبت','لبن','سمن','فرن','نبل','منبر','تمرن'] },
  { level:1, wheel_index:4, center:'س', letters:['م','ر','ل','ن','ت','ب','ع','ك'], time:120, valid_words:['سمك','نسر','سلم','مسكن','ملبس','سبع','سكن','كنس','تسمع'] },
  { level:2, wheel_index:0, center:'ع', letters:['ل','م','ب','ر','ق','ش','ف','ت'], time:90,  valid_words:['لعب','علم','عمل','فعل','شعر','عقل','ملعب','مربع','تعلم'] },
  { level:2, wheel_index:1, center:'ق', letters:['ر','ل','م','ب','س','ن','ت','ع'], time:90,  valid_words:['قمر','قلب','عقل','نقل','بقل','سبق','قرن'] },
  { level:2, wheel_index:2, center:'ف', letters:['ر','م','ع','ل','ت','ن','ك','ب'], time:90,  valid_words:['فرن','فكر','فلك','ملف','كتف','فعل','فرع','تفكر','تفرع'] },
  { level:2, wheel_index:3, center:'ح', letters:['م','ب','ر','ل','س','ن','ت','ك'], time:90,  valid_words:['بحر','محل','ملح','لحم','سبح','حبل','حمل','مسبح','حلب'] },
  { level:2, wheel_index:4, center:'ش', letters:['ر','م','س','ع','ق','ل','ب','ن'], time:90,  valid_words:['شمس','شبل','شعر','نشر','بشر','شمع','شعب','شرق','قشر','مشرق','منشر'] },
  { level:3, wheel_index:0, center:'خ', letters:['ر','م','ب','ل','ع','ش','ق','ت'], time:75,  valid_words:['خبر','بخل','خلق','خشب','خلع','بخر','مخبر','تخلق'] },
  { level:3, wheel_index:1, center:'ذ', letters:['ر','م','ك','ب','ل','ع','ت','ن'], time:75,  valid_words:['ذكر','بذل','نبذ','مذكر','تذكر','منذر'] },
  { level:3, wheel_index:2, center:'غ', letters:['ر','م','ب','ل','ع','ش','ف','ن'], time:75,  valid_words:['غنم','نغم','بلغ','فرغ','شغل','غمر','مغرب','شغف','مشغل'] },
  { level:3, wheel_index:3, center:'ض', letters:['ر','م','ب','ل','ع','ك','ن','ت'], time:75,  valid_words:['ضرب','عرض','ضمن','بعض','تضمن','ضلع','مضرب'] },
  { level:3, wheel_index:4, center:'ط', letters:['ر','م','ب','ل','ع','ك','ن','ي'], time:75,  valid_words:['طبل','طيب','طير','بطل','طلب','طلع','مطلع','طمر'] },
  { level:4, wheel_index:0, center:'ظ', letters:['ر','م','ب','ل','ع','ك','ن','ف'], time:60,  valid_words:['ظفر','ظلم','عظم','نظر','ظرف','لفظ','منظر'] },
  { level:4, wheel_index:1, center:'ث', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,  valid_words:['ثعلب','ثمر','ثمن','لبث','بعث'] },
  { level:4, wheel_index:2, center:'ج', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,  valid_words:['جمل','جبل','نجم','فجر','برج','عجل','رجل','منجل'] },
  { level:4, wheel_index:3, center:'ص', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,  valid_words:['صبر','نصر','صفر','صلب','صنف','نصل','فصل','عصر','مصنع','منصب'] },
  { level:4, wheel_index:4, center:'ز', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,  valid_words:['رمز','كنز','زمن','نزل','فرز','برز','ركز','منزل','مركز'] },
];

/* ── الكلمة والحروف ───────────────────────────────────────────── */

const STRIP_RE  = /[ً-ْٰـ]/g;
const ARABIC_RE = /^[ء-ي]+$/;

export function stripWheel(w) { return String(w || '').replace(STRIP_RE, ''); }
export function isArabicWord(w) { return ARABIC_RE.test(w); }
export function letterCounts(w) { const c = {}; for (const ch of w) c[ch] = (c[ch] || 0) + 1; return c; }
export function canFormFrom(word, counts) {
  const m = letterCounts(word);
  for (const [ch, n] of Object.entries(m)) if ((counts[ch] || 0) < n) return false;
  return true;
}
export function calcScore(word, allLetters) {
  const len = word.length;
  const base = len >= 7 ? 12 : len === 6 ? 8 : len === 5 ? 4 : len === 4 ? 2 : 1;
  const unique = [...new Set(allLetters)];
  return unique.every(ch => word.includes(ch)) ? base * 2 : base;
}

/* حروف العجلة من نص أو مصفوفة: «ك ت ب»، «كتب»، «ك،ت،ب» ← ['ك','ت','ب'] — بلا تشكيل */
export function parseLetters(input) {
  const raw = Array.isArray(input) ? input.join('') : String(input || '');
  return [...stripWheel(raw)].filter(ch => /[ء-ي]/.test(ch));
}

/* ── الأنماط الثلاثة ──────────────────────────────────────────── */

export const WW_GAME_ID = 'word-wheel';
export const WW_MODES = ['picture', 'complete', 'challenge'];
export const MODE_INFO = {
  picture: {
    icon: '🖼️', stage: 'المبتدئ', title: 'اكتشف الكلمة من الصورة',
    desc: 'انظر إلى الصورة، وركّب حروف الكلمة من العجلة',
  },
  complete: {
    icon: '🧩', stage: 'المتوسط', title: 'أكمل الكلمة الناقصة',
    desc: 'اعثر على الحرف المختفي، أو اكتشف الكلمة من التلميح',
  },
  challenge: {
    icon: '🏆', stage: 'المتقدم', title: 'التحدي المفتوح',
    desc: 'كوّن أكبر عدد من الكلمات — والحرف الأوسط إلزامي',
  },
};
export const CHALLENGE_LEVELS = [
  { id: 1, label: 'مبتدئ',  icon: '🟢' },
  { id: 2, label: 'متوسط',  icon: '🟡' },
  { id: 3, label: 'متقدم',  icon: '🟠' },
  { id: 4, label: 'أسطوري', icon: '🔴' },
];
export const isMode = (m) => WW_MODES.includes(m);
// أقصر كلمة: حرفان لصغار الصورة/الإكمال («يد»)، وثلاثة في التحدي المفتوح
export const minWordLength = (mode) => (mode === 'challenge' ? 3 : 2);

/* ── الألوان (المظهر) ─────────────────────────────────────────── */

// الألوان التي يتحكم فيها المعلم — والباقي (ظلال العجلة وحوافها) يُشتق منها
export const THEME_KEYS = ['bg1', 'bg2', 'center_bg', 'center_text', 'outer_bg', 'outer_text', 'button_bg', 'button_text'];
export const THEME_LABELS = {
  bg1: 'الخلفية (أعلى)', bg2: 'الخلفية (أسفل)',
  center_bg: 'الحرف الإلزامي', center_text: 'نص الحرف الإلزامي',
  outer_bg: 'الحروف الخارجية', outer_text: 'نص الحروف الخارجية',
  button_bg: 'الأزرار', button_text: 'نص الأزرار',
};

export const THEME_PRESETS = {
  gold: {
    label: 'ذهبي مشمس',
    bg1: '#92400E', bg2: '#D97706', center_bg: '#F59E0B', center_text: '#78350F',
    outer_bg: '#D97706', outer_text: '#92400E', button_bg: '#F59E0B', button_text: '#FFFFFF',
    // الشكل الأصلي للعبة ومعاينة الصفحة الرئيسية حرفياً
    derived: { center_light: '#FEF3C7', center_stroke: '#D97706', outer_light: '#FDE68A', outer_stroke: '#F59E0B', center_label: '#B45309', button_dark: '#D97706' },
  },
  violet: {
    label: 'بنفسجي مرح',
    bg1: '#5B4FC4', bg2: '#9C3EC4', center_bg: '#7C3AED', center_text: '#FFFFFF',
    outer_bg: '#A78BFA', outer_text: '#3B0764', button_bg: '#7C3AED', button_text: '#FFFFFF',
  },
  ocean: {
    label: 'أزرق بحري',
    bg1: '#0C4A6E', bg2: '#0EA5E9', center_bg: '#0284C7', center_text: '#FFFFFF',
    outer_bg: '#7DD3FC', outer_text: '#0C4A6E', button_bg: '#0EA5E9', button_text: '#FFFFFF',
  },
  forest: {
    label: 'أخضر الغابة',
    bg1: '#14532D', bg2: '#16A34A', center_bg: '#15803D', center_text: '#FFFFFF',
    outer_bg: '#86EFAC', outer_text: '#14532D', button_bg: '#22C55E', button_text: '#FFFFFF',
  },
  candy: {
    label: 'وردي حلوى',
    bg1: '#9D174D', bg2: '#EC4899', center_bg: '#DB2777', center_text: '#FFFFFF',
    outer_bg: '#F9A8D4', outer_text: '#831843', button_bg: '#EC4899', button_text: '#FFFFFF',
  },
  aarem: {
    label: 'هوية عارم',
    bg1: '#1A2B4A', bg2: '#2C4470', center_bg: '#E8B84B', center_text: '#1A2B4A',
    outer_bg: '#F4EFE6', outer_text: '#1A2B4A', button_bg: '#E8B84B', button_text: '#1A2B4A',
  },
};
export const DEFAULT_THEME_PRESET = 'gold';

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
export const isHexColor = (v) => typeof v === 'string' && HEX_RE.test(v.trim());

function hex6(h) {
  const v = h.trim().slice(1);
  return v.length === 3 ? v.split('').map(c => c + c).join('') : v;
}
/* مزج لونين: t=0 ← الأول، t=1 ← الثاني */
export function mixHex(a, b, t) {
  const pa = hex6(a), pb = hex6(b);
  const ch = (i) => {
    const x = parseInt(pa.slice(i, i + 2), 16), y = parseInt(pb.slice(i, i + 2), 16);
    return Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`.toUpperCase();
}

/* مواصفة مظهر محفوظة: { preset, colors: { مفتاح: hex } } — أو null */
export function sanitizeThemeSpec(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const preset = THEME_PRESETS[raw.preset] ? raw.preset : DEFAULT_THEME_PRESET;
  const colors = {};
  for (const k of THEME_KEYS) {
    const v = raw.colors?.[k];
    if (isHexColor(v) && v.trim().toUpperCase() !== THEME_PRESETS[preset][k].toUpperCase()) colors[k] = v.trim().toUpperCase();
  }
  return { preset, colors };
}

/* الألوان النهائية الجاهزة للرسم من مواصفة (أو null = الذهبي الأصلي) */
export function resolveTheme(spec) {
  const s = sanitizeThemeSpec(spec) || { preset: DEFAULT_THEME_PRESET, colors: {} };
  const base = THEME_PRESETS[s.preset];
  const t = {};
  for (const k of THEME_KEYS) t[k] = s.colors[k] || base[k];
  const keep = (k) => !s.colors[k] && base.derived; // لون الإعداد الجاهز كما هو → ظلاله الأصلية
  const d = base.derived || {};
  t.center_light  = keep('center_bg') ? d.center_light  : mixHex(t.center_bg, '#FFFFFF', 0.6);
  t.center_stroke = keep('center_bg') ? d.center_stroke : mixHex(t.center_bg, '#000000', 0.15);
  t.center_label  = keep('center_text') ? d.center_label : t.center_text;
  t.outer_light   = keep('outer_bg') ? d.outer_light   : mixHex(t.outer_bg, '#FFFFFF', 0.55);
  t.outer_stroke  = keep('outer_bg') ? d.outer_stroke  : mixHex(t.outer_bg, '#000000', 0.12);
  t.button_dark   = keep('button_bg') ? d.button_dark  : mixHex(t.button_bg, '#000000', 0.18);
  t.preset = s.preset;
  return t;
}

/* ── الإعدادات (المساعدة والمكافآت) ───────────────────────────── */

export const DEFAULT_WW_SETTINGS = {
  hints_enabled:   true,      // زر «💡 تلميح»
  hints_limit:     2,         // تلميحات لكل كلمة (الصورة/الإكمال) أو لكل عجلة (التحدي)
  max_attempts:    3,         // أخطاء مسموحة لكل كلمة قبل كشفها بلطف (0 = بلا حد)
  instant_check:   true,      // فحص كل حرف فور لمسه (الصورة والتلميح)
  complete_style:  'missing', // الإكمال: 'missing' حرف مخفي، 'hint' تلميح نصي
  shuffle_words:   true,      // ترتيب عشوائي للكلمات في كل جولة
  show_card:       true,      // بطاقة التعلّم عند اكتشاف كل كلمة
  card_seconds:    0,         // إغلاق البطاقة تلقائياً بعد ثوانٍ (0 = بزر «تابع»)
  voice_fallback:  true,      // صوت الجهاز إن لم يُرفع نطق مسجَّل للكلمة
  points_per_word: 10,        // نقاط الطفل لكل كلمة (يقرؤها الخادم — عام فقط)
  win_points:      10,        // نقاط إضافية عند إنهاء العجلة (عام فقط)
  star2_pct:       50,        // نسبة الكلمات المحلولة لنجمتين
  star3_pct:       80,        // ولثلاث نجوم
};
// ما يمكن تخصيصه لعجلة واحدة — النقاط والنجوم عامة (يطبّقها الخادم والنتائج بالتساوي)
export const WHEEL_SETTING_KEYS = ['hints_enabled', 'hints_limit', 'max_attempts', 'instant_check', 'complete_style', 'shuffle_words', 'show_card', 'card_seconds'];

const clampInt = (v, lo, hi, dflt) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};
const bool = (v, dflt) => (typeof v === 'boolean' ? v : dflt);

/* إعدادات كاملة سليمة من أي مدخل — القيم الغريبة تعود للافتراضي */
export function normalizeWwSettings(raw, base = DEFAULT_WW_SETTINGS) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const s = {
    hints_enabled:   bool(r.hints_enabled, base.hints_enabled),
    hints_limit:     clampInt(r.hints_limit, 0, 5, base.hints_limit),
    max_attempts:    clampInt(r.max_attempts, 0, 10, base.max_attempts),
    instant_check:   bool(r.instant_check, base.instant_check),
    complete_style:  ['missing', 'hint'].includes(r.complete_style) ? r.complete_style : base.complete_style,
    shuffle_words:   bool(r.shuffle_words, base.shuffle_words),
    show_card:       bool(r.show_card, base.show_card),
    card_seconds:    clampInt(r.card_seconds, 0, 15, base.card_seconds),
    voice_fallback:  bool(r.voice_fallback, base.voice_fallback),
    points_per_word: clampInt(r.points_per_word, 0, 50, base.points_per_word),
    win_points:      clampInt(r.win_points, 0, 100, base.win_points),
    star2_pct:       clampInt(r.star2_pct, 1, 100, base.star2_pct),
    star3_pct:       clampInt(r.star3_pct, 1, 100, base.star3_pct),
  };
  if (s.star3_pct < s.star2_pct) s.star3_pct = s.star2_pct;
  return s;
}

/* تخصيص عجلة واحدة: المفاتيح المسموحة فقط — أو null (= الإعدادات العامة) */
export function sanitizeWheelSettings(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const full = normalizeWwSettings(raw);
  const out = {};
  for (const k of WHEEL_SETTING_KEYS) if (raw[k] !== undefined) out[k] = full[k];
  return Object.keys(out).length ? out : null;
}

/* إعدادات العجلة الفعلية: العامة ثم تخصيص العجلة فوقها */
export function effectiveSettings(globalSettings, wheelSettings) {
  const g = normalizeWwSettings(globalSettings);
  const w = sanitizeWheelSettings(wheelSettings) || {};
  return { ...g, ...w };
}

/* إعدادات صف game_settings الكامل: { theme, ...settings } */
export function normalizeGlobalConfig(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return { ...normalizeWwSettings(r), theme: sanitizeThemeSpec(r.theme) || { preset: DEFAULT_THEME_PRESET, colors: {} } };
}

/* ── النجوم ───────────────────────────────────────────────────── */

export function starsFor(solved, total, settings = DEFAULT_WW_SETTINGS) {
  if (!total || solved <= 0) return 0;
  const pct = (solved / total) * 100;
  if (pct >= settings.star3_pct) return 3;
  if (pct >= settings.star2_pct) return 2;
  return 1;
}

/* ── كلمات العجلة ─────────────────────────────────────────────── */

/* valid_words بصيغتيه: نصوص (الجديدة) أو [{word,image}] (القديمة) ←
   [{ word, image }] بلا تشكيل ولا تكرار */
export function normalizeWheelWords(list) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const raw = typeof item === 'string' ? item : item?.word;
    const word = stripWheel(raw).replace(/\s+/g, '');
    if (!word || !isArabicWord(word) || seen.has(word)) continue;
    seen.add(word);
    const image = typeof item === 'object' && typeof item?.image === 'string' && /^https?:\/\//.test(item.image) ? item.image : null;
    out.push({ word, image });
  }
  return out;
}

/* لماذا لا تصلح كلمة في هذه العجلة؟ رسالة للمعلم أو null */
export function wordProblem(word, wheel) {
  const mode = wheel.mode || 'challenge';
  if (word.length < minWordLength(mode)) return `أقصر من ${minWordLength(mode)} حروف`;
  const counts = letterCounts([...(wheel.letters || []), wheel.center || ''].join(''));
  if (!canFormFrom(word, counts)) {
    const missing = [...new Set([...word].filter(ch => (letterCounts(word)[ch] || 0) > (counts[ch] || 0)))];
    return `ينقص العجلة: ${missing.join(' ')}`;
  }
  if (mode === 'challenge' && wheel.center && !word.includes(wheel.center)) return `لا تحوي الحرف الإلزامي «${wheel.center}»`;
  return null;
}

const END_ONLY = ['ة', 'ى', 'ء'];

/* أقل حروف تكفي لتكوين كل الكلمات (أعلى تكرار لكل حرف) — اقتراح للمعلم.
   الأوسط: الحرف الموجود في أكثر الكلمات. */
export function suggestWheelLetters(words) {
  const ws = (words || []).map(w => stripWheel(typeof w === 'string' ? w : w?.word)).filter(w => w && isArabicWord(w));
  if (!ws.length) return { center: '', letters: [] };
  const need = {};
  const inWords = {};
  for (const w of ws) {
    const c = letterCounts(w);
    for (const [ch, n] of Object.entries(c)) {
      need[ch] = Math.max(need[ch] || 0, n);
      inWords[ch] = (inWords[ch] || 0) + 1;
    }
  }
  // حروف آخر الكلمة (ة ى ء) لا تصلح حرفاً أوسط إلا إن لم يبقَ غيرها
  const tail = (ch) => (END_ONLY.includes(ch) ? 1 : 0);
  const order = Object.keys(need).sort((a, b) => tail(a) - tail(b) || inWords[b] - inWords[a] || a.localeCompare(b, 'ar'));
  const center = order[0];
  const letters = [];
  for (const ch of order) for (let i = 0; i < need[ch] - (ch === center ? 1 : 0); i++) letters.push(ch);
  return { center, letters };
}

/* ── العجلة القابلة للعب ──────────────────────────────────────── */

export const WHEEL_TIME_OPTIONS = [0, 60, 75, 90, 120, 180];
export const MAX_OUTER_LETTERS = 10;

/* بيانات عجلة واردة من لوحة المعلم ← { data } أو { error } (رسالة ودّية) */
export function sanitizeWheelInput(body, { partial = false } = {}) {
  const b = body && typeof body === 'object' ? body : {};
  const data = {};
  if (!partial || b.name !== undefined) {
    const name = String(b.name || '').trim().slice(0, 60);
    if (!name) return { error: 'اكتب اسماً للعجلة' };
    data.name = name;
  }
  if (!partial || b.mode !== undefined) {
    if (!isMode(b.mode)) return { error: 'اختر نمط اللعب' };
    data.mode = b.mode;
  }
  if (!partial || b.center_letter !== undefined) {
    const c = parseLetters(b.center_letter);
    if (c.length !== 1) return { error: 'الحرف الأوسط حرف واحد' };
    data.center_letter = c[0];
  }
  if (!partial || b.outer_letters !== undefined) {
    const outer = parseLetters(b.outer_letters);
    if (outer.length < 2) return { error: 'أضف حرفين خارجيين على الأقل' };
    if (outer.length > MAX_OUTER_LETTERS) return { error: `الحروف الخارجية ${MAX_OUTER_LETTERS} على الأكثر` };
    data.outer_letters = outer;
  }
  if (!partial || b.valid_words !== undefined) {
    data.valid_words = normalizeWheelWords(b.valid_words).map(w => w.word).slice(0, 80);
  }
  if (b.time_seconds !== undefined) data.time_seconds = clampInt(b.time_seconds, 0, 600, 90);
  if (b.level !== undefined) data.level = clampInt(b.level, 1, 4, 1);
  if (b.sort_order !== undefined) data.sort_order = clampInt(b.sort_order, 0, 9999, 0);
  if (b.is_active !== undefined) data.is_active = !!b.is_active;
  if (b.theme !== undefined) data.theme = b.theme === null ? null : sanitizeThemeSpec(b.theme);
  if (b.settings !== undefined) data.settings = b.settings === null ? null : sanitizeWheelSettings(b.settings);
  return { data };
}

/* صف من word_wheel_configs (أو عجلة افتراضية) ← عجلة جاهزة للعب، أو null إن
   لم يبقَ فيها كلمة صالحة. الكلمات التي لا تُكوَّن من حروفها تُستبعد بصمت. */
export function wheelForPlay(row, global = {}) {
  if (!row) return null;
  const mode = isMode(row.mode) ? row.mode : 'challenge';
  const center = parseLetters(row.center_letter ?? row.center)[0] || '';
  const letters = parseLetters(row.outer_letters ?? row.letters).slice(0, MAX_OUTER_LETTERS);
  if (!center || letters.length < 2) return null;
  const base = { mode, center, letters };
  const words = normalizeWheelWords(row.valid_words).filter(w => !wordProblem(w.word, base));
  if (!words.length) return null;
  return {
    id: String(row.id ?? `default-${row.level}-${row.wheel_index}`),
    name: row.name || '',
    mode, center, letters,
    level: clampInt(row.level, 1, 4, 1),
    sort_order: clampInt(row.sort_order ?? row.wheel_index, 0, 9999, 0),
    time: mode === 'challenge' ? clampInt(row.time_seconds ?? row.time, 0, 600, 90) : 0,
    words,
    theme: resolveTheme(row.theme || global.theme),
    settings: effectiveSettings(global, row.settings),
  };
}

/* عجلات التحدي الافتراضية بنفس شكل صفوف القاعدة — احتياط إن تعذّر الجلب */
export function defaultChallengeRows() {
  return DEFAULT_CATALOG.map(w => ({
    id: `default-${w.level}-${w.wheel_index}`,
    name: `${CHALLENGE_LEVELS[w.level - 1].icon} ${CHALLENGE_LEVELS[w.level - 1].label} ${w.wheel_index + 1}`,
    mode: 'challenge', level: w.level, sort_order: w.wheel_index,
    center_letter: w.center, outer_letters: w.letters, valid_words: w.valid_words, time_seconds: w.time,
    is_active: true, theme: null, settings: null,
  }));
}

/* ترتيب العرض: النمط ثم المرحلة ثم الترتيب ثم الاسم */
export function sortWheels(list) {
  const mi = (m) => WW_MODES.indexOf(m);
  return [...list].sort((a, b) => mi(a.mode) - mi(b.mode) || (a.level - b.level) || (a.sort_order - b.sort_order)
    || String(a.name).localeCompare(String(b.name), 'ar'));
}

/* ── بطاقة الكلمة (بنك الكلمات) ───────────────────────────────── */

export const WORD_MEDIA_PREFIX = 'word-wheel/';
export const WORD_TEXT_LIMITS = { vocalized: 40, emoji: 8, definition: 220, hint: 140 };

/* بطاقة كلمة للعرض — من بنك الكلمات، وإلا من صورة قديمة في العجلة، وإلا الكلمة وحدها */
export function cardFor(word, bank = {}, legacyImage = null) {
  const b = bank[word] || {};
  return {
    word,
    vocalized: b.vocalized || word,
    emoji: b.emoji || null,
    image_url: b.image_url || legacyImage || null,
    audio_url: b.audio_url || null,
    definition: b.definition || '',
    hint: b.hint || '',
  };
}

/* بيانات بطاقة كلمة من اللوحة ← { data } أو { error }. isMediaUrl يقبل روابط
   مجلد word-wheel/ في تخزيننا فقط (يُمرَّر من الخادم). */
export function sanitizeWordInput(body, isMediaUrl, { partial = false } = {}) {
  const b = body && typeof body === 'object' ? body : {};
  const data = {};
  if (!partial || b.word !== undefined) {
    const word = stripWheel(b.word).replace(/\s+/g, '');
    if (!word || !isArabicWord(word)) return { error: 'اكتب الكلمة بحروف عربية فقط (كلمة واحدة)' };
    if (word.length < 2 || word.length > 12) return { error: 'الكلمة من حرفين إلى 12 حرفاً' };
    data.word = word;
  }
  const text = (k) => {
    if (b[k] === undefined) return;
    const v = String(b[k] ?? '').trim().slice(0, WORD_TEXT_LIMITS[k]);
    data[k] = v || null;
  };
  ['vocalized', 'emoji', 'definition', 'hint'].forEach(text);
  if (data.vocalized && data.word && stripWheel(data.vocalized).replace(/\s+/g, '') !== data.word)
    return { error: 'الكلمة المشكولة يجب أن تكون نفس الكلمة بعد حذف التشكيل' };
  for (const k of ['image_url', 'audio_url']) {
    if (b[k] === undefined) continue;
    if (!b[k]) { data[k] = null; continue; }
    if (!isMediaUrl(b[k])) return { error: k === 'image_url' ? 'رابط الصورة غير صالح — ارفع الصورة من اللوحة' : 'رابط الصوت غير صالح — سجّل أو ارفع الصوت من اللوحة' };
    data[k] = b[k];
  }
  return { data };
}

/* ── مساعدات اللعب ────────────────────────────────────────────── */

/* موضع الحرف المخفي في «أكمل الكلمة»: حرف من الوسط إن أمكن (لا الأول)،
   وموجود في العجلة */
export function missingIndex(word, rand = Math.random) {
  const n = word.length;
  const inner = n > 2 ? [...Array(n).keys()].slice(1) : [...Array(n).keys()];
  return inner[Math.floor(rand() * inner.length)];
}

/* ترتيب عشوائي ثابت بدالة عشوائية قابلة للتمرير (للاختبار) */
export function shuffled(list, rand = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* تلميح التحدي المفتوح: أقصر كلمة لم تُكتشف — طولها وأول حرف منها */
export function challengeHint(words, found) {
  const left = words.map(w => (typeof w === 'string' ? w : w.word)).filter(w => !found.includes(w));
  if (!left.length) return null;
  const w = left.reduce((a, b) => (b.length < a.length ? b : a));
  return { word: w, first: w[0], length: w.length };
}

/* ── التقدّم (نجوم كل عجلة في المتصفح) ───────────────────────── */

export const WW_PROGRESS_KEY = 'ww_progress_v2';
export const WW_LEGACY_PROGRESS_KEY = 'ww_progress';
export function progressKey(wheel) { return `w:${wheel.id}`; }
// نجوم التحدي القديمة كانت بمفتاح «المرحلة_الترتيب»
export function legacyProgressKey(wheel) { return wheel.mode === 'challenge' ? `${wheel.level}_${wheel.sort_order}` : null; }

/* ── معاينة الصفحة الرئيسية ────────────────────────────────────── */
export const WHEEL_PREVIEW_TARGET = 3;   // كلمات يكتشفها الزائر لينهي الجولة

/* عجلة صالحة للمعاينة: حرف أوسط واحد، 4–10 حروف حوله، وكلمات تُكوَّن
   فعلاً من حروف العجلة وتحوي الحرف الأوسط — أو null */
export function toPreviewWheel(wheel) {
  const center = stripWheel(wheel?.center).trim();
  const letters = (Array.isArray(wheel?.letters) ? wheel.letters : []).map(l => stripWheel(l).trim());
  if (center.length !== 1 || letters.length < 4 || letters.length > 10 || letters.some(l => l.length !== 1)) return null;
  const counts = letterCounts([...letters, center].join(''));
  const words = [...new Set(normalizeWheelWords(wheel.valid_words).map(w => w.word)
    .filter(w => w.length >= 3 && w.includes(center) && canFormFrom(w, counts)))];
  if (words.length < WHEEL_PREVIEW_TARGET) return null;
  return { center, letters, words };
}

/* عجلات المرحلة الأولى (المبتدئ) من التحدي المفتوح بترتيب عشوائي — من صفوف
   word_wheel_configs الظاهرة، وإلا العجلات الافتراضية. تبدأ المعاينة بالأولى
   وينتقل «العب مرة أخرى» للتالية */
export function pickPreviewWheels(configRows, rand = Math.random) {
  const fromDb = (configRows || [])
    .filter(r => r && r.is_active !== false && (r.mode || 'challenge') === 'challenge' && Number(r.level || 1) === 1)
    .map(r => toPreviewWheel({ center: r.center_letter, letters: parseLetters(r.outer_letters), valid_words: r.valid_words }))
    .filter(Boolean);
  const wheels = fromDb.length
    ? fromDb
    : DEFAULT_CATALOG.filter(w => w.level === 1).map(toPreviewWheel).filter(Boolean);
  return shuffled(wheels, rand);
}
