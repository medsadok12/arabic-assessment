import { stripDia, isGap } from './letter-forms';
import { publicMediaBase } from './story-preview';

/* ════════════════════════════════════════════════════════════════
   معاينة لعبة «صيّاد الحروف» في الصفحة الرئيسية الجديدة (/landing-v2) — خادم فقط
   ثلاث كلمات حقيقية من اللعبة بصورها، والكلمات التي سجّل لها المعلم صوتاً
   حقيقياً أولاً (ما لا صوت له يُنطق بصوت الجهاز كما في اللعبة نفسها).
   الروابط تُقبل فقط من تخزين مشروعنا العام.
════════════════════════════════════════════════════════════════ */

export const GAME_PREVIEW_COUNT = 3;
const MAX_LETTERS = 6;   // كلمة قصيرة تتسع مربعاتها لعرض الجوال
const DISTRACTORS = 2;   // ثلاثة خيارات: الصحيح + اثنان

function ourMedia(url) {
  const base = publicMediaBase();
  return typeof url === 'string' && base.length > 30 && url.startsWith(`${base}media/`) ? url : null;
}

function shuffled(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* صف من letter_catcher_words → كلمة المعاينة، أو null إن لم تصلح */
export function toPreviewWord(row, rand = Math.random) {
  const word = typeof row?.word === 'string' ? row.word.trim() : '';
  const missing = stripDia(row?.missing_letter || '').trim();
  if (word.split('_').length !== 2 || missing.length !== 1) return null;
  const letters = stripDia(word.replace('_', missing));
  if ([...letters].some(isGap) || letters.length < 2 || letters.length > MAX_LETTERS) return null;

  const pool = [...new Set((Array.isArray(row.options) ? row.options : [])
    .map(o => stripDia(String(o || '')).trim())
    .filter(o => o.length === 1 && o !== missing))];
  if (pool.length < DISTRACTORS) return null;

  const image = ourMedia(row.image_url);
  const emoji = typeof row.emoji === 'string' && row.emoji.trim() ? row.emoji.trim() : null;
  if (!image && !emoji) return null;

  return {
    word,
    missing,
    options: shuffled([missing, ...shuffled(pool, rand).slice(0, DISTRACTORS)], rand),
    image,
    emoji,
    audio: ourMedia(row.audio_url),
  };
}

/* يختار ثلاث كلمات: ذوات الصوت الحقيقي أولاً، والبقية عشوائياً — أو null
   فتعرض الصفحة كلماتها الاحتياطية الثابتة */
export function pickGamePreviewWords(rows, rand = Math.random) {
  const words = shuffled(rows || [], rand).map(r => toPreviewWord(r, rand)).filter(Boolean);
  const picked = [...words.filter(w => w.audio), ...words.filter(w => !w.audio)].slice(0, GAME_PREVIEW_COUNT);
  return picked.length === GAME_PREVIEW_COUNT ? picked : null;
}
