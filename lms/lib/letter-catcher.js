/* ════════════════════════════════════════════════════════════════
   صيّاد الحروف — منطق مشترك بين الخادم والمتصفح
   - إعدادات الجولة التي يحفظها المعلم/المدير وتُطبَّق على الطلاب (game_settings)
   - طول الكلمة بالحروف فقط (المسافة والتشكيل لا تُحسب)
   - تدوير الكلمات بلا تكرار حتى يمرّ الطفل على كل كلمات المجموعة
════════════════════════════════════════════════════════════════ */

export const LC_GAME_ID = 'letter-catcher';

/* 0 = كل كلمات المجموعة في جولة واحدة */
export const WORDS_PER_ROUND_CHOICES = [5, 10, 15, 20, 30, 0];
export const OPTIONS_COUNT_CHOICES = [3, 4, 5];
export const LC_DEFAULT_SETTINGS = { words_per_round: 20, options_count: 5 };

/* أقصى قيمة لمنزلق «طول الكلمة» في معاينة المعلم = بلا حد */
export const LEN_NO_LIMIT = 20;

/* يُرجع إعدادات صالحة دائماً؛ أي قيمة غير معروفة تعود للافتراضي */
export function normalizeLcSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const wpr = Number(s.words_per_round);
  const opt = Number(s.options_count);
  return {
    words_per_round: WORDS_PER_ROUND_CHOICES.includes(wpr) ? wpr : LC_DEFAULT_SETTINGS.words_per_round,
    options_count: OPTIONS_COUNT_CHOICES.includes(opt) ? opt : LC_DEFAULT_SETTINGS.options_count,
  };
}

/* للحفظ: يرفض القيم غير المعروفة بدل استبدالها بصمت */
export function validateLcSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  if (!WORDS_PER_ROUND_CHOICES.includes(Number(s.words_per_round))) return null;
  if (!OPTIONS_COUNT_CHOICES.includes(Number(s.options_count))) return null;
  return { words_per_round: Number(s.words_per_round), options_count: Number(s.options_count) };
}

/* عدد كلمات الجولة الفعلي لمجموعة فيها total كلمة */
export function roundSize(total, wordsPerRound) {
  if (!total) return 0;
  return wordsPerRound === 0 ? total : Math.min(total, wordsPerRound);
}

const DIACRITICS = /[ً-ْٰ]/g;

/* طول الكلمة بالحروف: بلا تشكيل ولا مسافات — «حمار وحشي» = 8 لا 9.
   رمز _ يبقى محسوباً لأنه مكان حرف ناقص */
export function letterCount(word) {
  return (word || '').replace(DIACRITICS, '').replace(/\s+/g, '').length;
}

function shuffled(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* يختار count معرّفاً لم يُجب عنها الطفل بعد في الدورة الحالية.
   إن بقي أقل من count، تأتي كلمات الدورة الحالية أولاً ثم تُكمَّل الجولة من
   دورة جديدة (بلا تكرار داخل الجولة نفسها) — الترتيب مهم لأن markSeen تسجّل
   الكلمة عند الإجابة عنها، فتكتمل الدورة القديمة قبل أن تبدأ الجديدة.
   يُرجع { picked, seen }: seen هي الذاكرة لو أُجيب عن كل كلمات الجولة. */
export function pickRotation(ids, seenIds, count, rand = Math.random) {
  const all = [...new Set((ids || []).map(String))];
  const n = Math.min(Math.max(0, count | 0), all.length);
  if (!n) return { picked: [], seen: [] };
  if (n >= all.length) return { picked: shuffled(all, rand), seen: [] };

  const valid = new Set(all);
  const seen = new Set((seenIds || []).map(String).filter(id => valid.has(id)));
  const unseen = all.filter(id => !seen.has(id));

  if (unseen.length >= n) {
    const picked = shuffled(unseen, rand).slice(0, n);
    picked.forEach(id => seen.add(id));
    // اكتملت الدورة بالضبط → الجولة التالية تبدأ دورة جديدة
    return { picked, seen: seen.size >= all.length ? [] : [...seen] };
  }

  const fill = shuffled(all.filter(id => seen.has(id)), rand).slice(0, n - unseen.length);
  return { picked: [...shuffled(unseen, rand), ...fill], seen: fill };
}

/* تُستدعى عند إجابة الطفل عن كلمة: تُضاف لذاكرة الدورة، وحين تكتمل الدورة
   (أجاب عن كل كلمات المجموعة) تُصفَّر لتبدأ دورة جديدة */
export function markSeen(ids, seenIds, id) {
  const valid = new Set((ids || []).map(String));
  const seen = new Set((seenIds || []).map(String).filter(x => valid.has(x)));
  if (valid.has(String(id))) seen.add(String(id));
  return seen.size >= valid.size ? [] : [...seen];
}
