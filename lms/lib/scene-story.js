/* ════════════════════════════════════════════════════════════════
   «مشهدٌ وحكاية» — المنطق المشترك (بلا DOM ولا قاعدة بيانات)
   مصدر واحد لشاشة الطفل ولوحة المعلم ومسارات /api/scenes/*.
   الجداول: scenes و scene_responses (lms/supabase/scene_story.sql).
════════════════════════════════════════════════════════════════ */

export const SCENE_MODES = ['write', 'speak', 'photo'];
export const MODE_INFO = {
  write: { icon: '✍️', label: 'أكتب' },
  speak: { icon: '🎙️', label: 'أحكي' },
  photo: { icon: '📷', label: 'أصوّر' },
};

/* سلّم الكتابة حسب العمر: المساعدة وهدف عدد الكلمات */
export const BANDS = ['1', '2', '3'];
export const BAND_INFO = {
  '1': { icon: '🌱', label: 'الصف 1–2', goal: 4,  help: 'tiles',    hint: 'المس البطاقات بالترتيب لتصنع جملتك' },
  '2': { icon: '🌿', label: 'الصف 3–4', goal: 15, help: 'starters', hint: 'اختر بداية جملة ثم أكمل حكايتك' },
  '3': { icon: '🌳', label: 'الصف 5–7', goal: 40, help: 'map',      hint: 'استعن بخريطة الحكاية واكتب نصّك' },
};
/* صندوق السؤال تحت الصورة: عنوان ثابت، وسؤال المعلم يُسمَع بتسجيله (لا نص مكتوب).
   بلا تسجيل يقرأ صوت الجهاز عبارة عامة تناسب كل المشاهد */
export const LISTEN_TITLE    = 'اسْتَمِعْ وَعَبِّرْ';
export const LISTEN_FALLBACK = 'انْظُرْ إلى الصُّورَةِ جَيِّداً، ثُمَّ عَبِّرْ عَمَّا تَراهُ';

export const STORY_MAP = ['👤 من؟', '📍 أين ومتى؟', '⚡ ماذا حدث؟', '🏁 كيف انتهت؟'];
export const DEFAULT_STARTERS = ['في الصورةِ أرى…', 'كان الجوُّ…', 'شعرتُ بـ…', 'وفجأةً…', 'وفي النهايةِ…'];
export const DEFAULT_WHAT_IF = ['ماذا لو تغيّر المكانُ فجأة؟', 'ماذا لو تكلّمتِ الأشياءُ في الصورة؟', 'ماذا لو جاءَ ضيفٌ غيرُ متوقَّع؟', 'ماذا لو بدأ المطرُ ينهمر؟'];
export const FEELINGS = [
  { id: 'happy',    icon: '😄', label: 'فرحان' },
  { id: 'excited',  icon: '🤩', label: 'متحمّس' },
  { id: 'scared',   icon: '😟', label: 'خائف' },
  { id: 'surprised',icon: '😮', label: 'متفاجئ' },
  { id: 'sad',      icon: '😢', label: 'حزين' },
];

/* تقييم المعلم: ثلاثة معايير × 1–3 نجوم + ملصقات + تعليق */
export const CRITERIA = [
  { id: 'idea',  icon: '💡', label: 'الفكرة' },
  { id: 'words', icon: '🧺', label: 'الكلمات' },
  { id: 'order', icon: '🧱', label: 'الترتيب' },
];
export const STICKERS = [
  { id: 'brave',     label: '🦁 كاتب شجاع' },
  { id: 'imagine',   label: '🎨 خيال واسع' },
  { id: 'words',     label: '✨ كلمات جميلة' },
  { id: 'voice',     label: '🎙️ حكاية بصوت رائع' },
  { id: 'neat',      label: '🖊️ خط جميل' },
  { id: 'progress',  label: '🚀 تقدّم ملحوظ' },
];

export const SUBMIT_POINTS = 15;   // عند أول إرسال لكل مشهد
export const STAR_POINTS   = 2;    // لكل نجمة من نجوم المعلم (حتى 9 نجوم = 18)

export const STUDENT_MEDIA_BUCKET = 'student-work';
export const SCENE_MEDIA_PREFIX   = 'scenes/';
export const LIMITS = { title: 80, prompt: 240, word: 30, words: 16, tiles: 10, starters: 8, hotspots: 6, q: 120, whatIf: 8, feelingQ: 80, text: 3000, comment: 500 };
export const AUDIO_MAX_SECS = 120;

const TASHKEEL_RE = /[ً-ْٰـ]/g;
export const plainArabic = (t) => String(t || '').replace(TASHKEEL_RE, '');

export function countWords(text) {
  return (plainArabic(text).match(/[ء-ي٠-٩A-Za-z0-9]+/g) || []).length;
}

/* تمييز العدد: 3–10 كلمات، وما عداها كلمة (11 كلمة، 40 كلمة) */
export const wordNoun = (n) => (n >= 3 && n <= 10 ? 'كلمات' : 'كلمة');

/* عدد الكلمات الذهبية المستعملة في النص (تُقارن بلا تشكيل) */
export function goldUsed(text, words) {
  const t = plainArabic(text);
  return (Array.isArray(words) ? words : []).filter(x => x?.gold && x.w && t.includes(plainArabic(x.w).trim())).length;
}

/* فئة الطالب من صفه، أو فئة المشهد إن حُدِّدت */
export function bandForGrade(grade) {
  const g = Number(grade);
  if (!Number.isFinite(g) || g <= 0) return '2';
  return g <= 2 ? '1' : g <= 4 ? '2' : '3';
}
export function effectiveBand(scene, grade) {
  return BANDS.includes(scene?.band) ? scene.band : bandForGrade(grade);
}

/* هل يرى الطالب هذا المشهد؟ ظاهر + موعد نشره حان + (للجميع، أو من أحد معلميه)
   + فئته تناسب صف الطالب إن حُدِّدت الفئة وعُرف الصف */
export function sceneVisibleTo(scene, { now = Date.now(), grade = null, teacherIds = [] } = {}) {
  if (!scene?.is_active) return false;
  if (Date.parse(scene.publish_at || 0) > now) return false;
  if (scene.audience === 'mine' && !teacherIds.includes(scene.created_by)) return false;
  if (BANDS.includes(scene.band) && Number(grade) > 0 && bandForGrade(grade) !== scene.band) return false;
  return true;
}

const str = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const strList = (list, maxItems, maxLen) =>
  [...new Set((Array.isArray(list) ? list : []).map(x => str(x, maxLen)).filter(Boolean))].slice(0, maxItems);

/* بيانات مشهد من اللوحة ← { data } أو { error } (رسالة للمعلم).
   isMediaUrl(url, kind): يقبل روابط مجلد scenes/ في تخزيننا فقط (يُمرَّر من الخادم). */
export function sanitizeSceneInput(body, isMediaUrl, { partial = false } = {}) {
  const b = body && typeof body === 'object' ? body : {};
  const data = {};
  const has = (k) => !partial || b[k] !== undefined;

  if (has('title')) {
    data.title = str(b.title, LIMITS.title);
    if (!data.title) return { error: 'اكتب عنواناً للمشهد' };
  }
  if (has('image_url')) {
    if (!b.image_url || !isMediaUrl(b.image_url)) return { error: 'ارفع صورة المشهد' };
    data.image_url = b.image_url;
  }
  // السؤال المكتوب لم يعد يُعرض ولا يُطلب (القسم 21): العمود باقٍ للتوافق، ويُحفظ فارغاً للجديد
  if (b.prompt !== undefined) data.prompt = str(b.prompt, LIMITS.prompt);
  else if (!partial) data.prompt = '';
  if (b.prompt_audio_url !== undefined) {
    if (b.prompt_audio_url && !isMediaUrl(b.prompt_audio_url)) return { error: 'رابط صوت السؤال غير صالح — سجّله أو ارفعه من اللوحة' };
    data.prompt_audio_url = b.prompt_audio_url || null;
  }
  if (b.words !== undefined) {
    const seen = new Set();
    data.words = (Array.isArray(b.words) ? b.words : [])
      .map(x => ({ w: str(typeof x === 'string' ? x : x?.w, LIMITS.word), gold: !!x?.gold }))
      .filter(x => x.w && !seen.has(x.w) && seen.add(x.w))
      .slice(0, LIMITS.words);
  }
  if (b.tiles !== undefined) data.tiles = (Array.isArray(b.tiles) ? b.tiles : []).map(x => str(x, LIMITS.word)).filter(Boolean).slice(0, LIMITS.tiles);
  if (b.starters !== undefined) data.starters = strList(b.starters, LIMITS.starters, 60);
  if (b.what_if !== undefined) data.what_if = strList(b.what_if, LIMITS.whatIf, LIMITS.q);
  if (b.hotspots !== undefined) {
    data.hotspots = (Array.isArray(b.hotspots) ? b.hotspots : [])
      .map(h => ({ x: Math.round(Number(h?.x) * 10) / 10, y: Math.round(Number(h?.y) * 10) / 10, q: str(h?.q, LIMITS.q) }))
      .filter(h => h.q && h.x >= 0 && h.x <= 100 && h.y >= 0 && h.y <= 100)
      .slice(0, LIMITS.hotspots);
  }
  if (b.feeling_q !== undefined) data.feeling_q = str(b.feeling_q, LIMITS.feelingQ) || null;
  if (has('modes')) {
    data.modes = SCENE_MODES.filter(m => (Array.isArray(b.modes) ? b.modes : SCENE_MODES).includes(m));
    if (!data.modes.length) return { error: 'اختر طريقة تعبير واحدة على الأقل' };
  }
  if (b.band !== undefined) data.band = ['auto', ...BANDS].includes(String(b.band)) ? String(b.band) : 'auto';
  if (b.audience !== undefined) data.audience = b.audience === 'mine' ? 'mine' : 'all';
  if (b.is_active !== undefined) data.is_active = !!b.is_active;
  if (b.sort_order !== undefined) data.sort_order = Math.max(0, Math.min(9999, Math.round(Number(b.sort_order) || 0)));
  if (b.publish_at !== undefined) {
    const t = Date.parse(b.publish_at);
    if (b.publish_at && !Number.isFinite(t)) return { error: 'تاريخ النشر غير صالح' };
    data.publish_at = b.publish_at ? new Date(t).toISOString() : new Date().toISOString();
  }
  return { data };
}

/* مسار ملف الطالب في الدلو الخاص: <طالب>/<مشهد>/<audio|photo>-<وقت>-<عشوائي>.<امتداد> */
export function studentMediaPrefix(studentId, sceneId) {
  return `${studentId}/${sceneId}/`;
}
export function isStudentMediaPath(path, studentId, sceneId, kind) {
  if (typeof path !== 'string' || path.includes('..')) return false;
  const prefix = studentMediaPrefix(studentId, sceneId);
  return path.startsWith(prefix) && new RegExp(`^${kind}-\\d+-[a-z0-9]{6}\\.[a-z0-9]{2,4}$`).test(path.slice(prefix.length));
}

/* ردّ الطالب ← { data } أو { error } (رسالة ودّية للطفل). word_count و gold_used
   يحسبهما الخادم من النص نفسه، لا يُقبلان من العميل. */
export function sanitizeResponseInput(body, scene, { studentId }) {
  const b = body && typeof body === 'object' ? body : {};
  const modes = Array.isArray(scene?.modes) && scene.modes.length ? scene.modes : SCENE_MODES;
  const text = modes.includes('write') ? String(b.text ?? '').trim().slice(0, LIMITS.text) : '';
  const check = (k, kind, mode) => {
    if (!b[k]) return null;
    if (!modes.includes(mode) || !isStudentMediaPath(b[k], studentId, scene.id, kind)) return undefined;
    return b[k];
  };
  const audio = check('audio_path', 'audio', 'speak');
  const photo = check('photo_path', 'photo', 'photo');
  if (audio === undefined || photo === undefined) return { error: 'تعذّر حفظ الملف — أعد التسجيل أو اختر الصورة من جديد' };
  if (!text && !audio && !photo) return { error: 'اكتب حكايتك، أو سجّلها بصوتك، أو أرسل صورة ورقتك 🌟' };
  const feeling = FEELINGS.some(f => f.id === b.feeling) ? b.feeling : null;
  return {
    data: {
      text: text || null,
      audio_path: audio,
      photo_path: photo,
      feeling,
      word_count: countWords(text),
      gold_used: goldUsed(text, scene.words),
    },
  };
}

const star = (v) => Math.max(1, Math.min(3, Math.round(Number(v) || 0)));
export function sanitizeReview(body) {
  const b = body && typeof body === 'object' ? body : {};
  const review = {};
  for (const c of CRITERIA) {
    if (!(Number(b[c.id]) >= 1)) return { error: `قيّم «${c.label}» بنجمة واحدة على الأقل` };
    review[c.id] = star(b[c.id]);
  }
  review.stickers = [...new Set((Array.isArray(b.stickers) ? b.stickers : []).filter(s => STICKERS.some(x => x.id === s)))];
  review.comment = String(b.comment ?? '').trim().slice(0, LIMITS.comment);
  return { review };
}
export const reviewStars = (review) => CRITERIA.reduce((n, c) => n + (Number(review?.[c.id]) || 0), 0);
export const reviewPoints = (review) => reviewStars(review) * STAR_POINTS;

/* نوع الصوت الموحَّد للدلو الخاص (قائمة الأنواع المسموحة فيه) */
const AUDIO_CANON = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', webm: 'audio/webm', ogg: 'audio/ogg', wav: 'audio/wav' };
export function canonicalAudio(ext) {
  return AUDIO_CANON[ext] ? { contentType: AUDIO_CANON[ext], ext } : null;
}
