/* ════════════════════════════════════════════════════════════════
   إكمال السكون الناقص — قبل أن يُنطق النص (لا يتغير النص المعروض).
   كلمة مشكولة إلا حرفاً يجعل Azure يخمّن حركاتها من السياق، وقد يخطئ:
   بلاغ الأستاذ محمد (2026-10-23): «أَوْ غَيرَ نَاطِقِينَ» (الياء بلا سكون) قُرئت «غيرِ».
   القاعدة الوحيدة المطبّقة: واو أو ياء بلا علامة، قبلها فتحة، وبعدها حرف بحركة (بلا شدّة)
   ← حرف لين ساكن: غَيرَ ← غَيْرَ، يَومُ ← يَوْمُ، خَوفٍ ← خَوْفٍ.
   ولا يُخمَّن حيث يحتمل أن الساقط فتحة لا سكون:
   • بعد حرف زائد مفتوح في أول الكلمة (وَيـ، فَيـ، سَيـ، لَيـ، بَيـ، كَيـ): سَيكُونُ = سَيَكُونُ.
   • إن تلا الحرفَ التالي ألفٌ (وزن فَعَلَان/فَعَال): حَيوَانٌ = حَيَوَانٌ، طَيرَانٌ = طَيَرَانٌ.
   • إن كان على التالي شدّة (تَفَعَّلَ): تَوقَّفَ = تَوَقَّفَ.
════════════════════════════════════════════════════════════════ */

const FATHA = 'َ', SUKUN = 'ْ', SHADDA = 'ّ';
const MARK = /[ً-ْٰ]/;
const SHORT_VOWEL = /[ً-ِ]/;     // حركة أو تنوين (بلا سكون)
const LETTER = /[ء-ي]/;
const PREFIXES = new Set(['و', 'ف', 'س', 'ل', 'ب', 'ك']); // و ف س ل ب ك
const WORD = /[ء-يً-ْٰ]+/g;

// الكلمة ← [{ letter, marks }]
function units(word) {
  const out = [];
  for (const ch of word) {
    if (MARK.test(ch) && out.length) out[out.length - 1].marks += ch;
    else out.push({ letter: ch, marks: '' });
  }
  return out;
}

function completeWord(word) {
  const u = units(word);
  if (!u.some(x => x.marks)) return word; // كلمة بلا تشكيل أصلاً: تُترك لـ Azure
  let changed = false;
  for (let i = 1; i < u.length - 1; i++) {
    const cur = u[i], prev = u[i - 1], next = u[i + 1];
    if (cur.marks || (cur.letter !== 'ي' && cur.letter !== 'و')) continue;
    if (!prev.marks.includes(FATHA)) continue;
    if (!LETTER.test(next.letter) || !SHORT_VOWEL.test(next.marks) || next.marks.includes(SHADDA)) continue;
    if (u[i + 2] && (u[i + 2].letter === 'ا' || u[i + 2].letter === 'ى')) continue;
    if (i === 1 && PREFIXES.has(prev.letter)) continue;
    cur.marks = SUKUN;
    changed = true;
  }
  return changed ? u.map(x => x.letter + x.marks).join('') : word;
}

export function completeSukun(text) {
  return String(text ?? '').replace(WORD, completeWord);
}
