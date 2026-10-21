/* ════════════════════════════════════════════════════════════════
   الوقف بالسكون — قبل أن يُنطق النص.
   العربي يقف على ساكن: «صَغِيرٌ.» تُقرأ «صَغِيرْ»، «سَهْلًا.» تُقرأ «سَهْلَا»،
   «مَدْرَسَةٌ.» تُقرأ «مَدْرَسَهْ». أما وسط الجملة فالتنوين والحركات تُنطق كما هي.
   بلاغ الأستاذ محمد (2026-10-21): «فهيم يقف على التنوين وعلى الحركة… فيصبح ركيكاً
   جداً». يُطبَّق على كل نص يُقرأ بصوت (الخادم وصوت الجهاز الاحتياطي) — لا على
   النص المعروض، فالكتابة تبقى كما هي.
════════════════════════════════════════════════════════════════ */

const FATHATAN = '\u064B', DAMMATAN = '\u064C', KASRATAN = '\u064D';
const FATHA = '\u064E', DAMMA = '\u064F', KASRA = '\u0650';
const SHADDA = '\u0651', SUKUN = '\u0652';
const VOWELS = new Set([FATHATAN, DAMMATAN, KASRATAN, FATHA, DAMMA, KASRA]);
const MARK = /[\u064B-\u0652\u0670]/;

// كلمة عربية تليها وقفة: علامة ترقيم أو سطر جديد أو نهاية النص — تُتجاوز الأقواس
// وعلامات التنصيص والرموز التعبيرية («بَطَلُ 🌟» وقفة أيضاً)
const WORD_BEFORE_PAUSE = /[\u0621-\u064A\u0671-\u06D3\u064B-\u0652\u0670]+(?=[\u00BB"'\u201D\u2019)\]\s\p{Extended_Pictographic}\uFE0F]*(?:[.\u060C,\u061F?!\u061B;:\u2026\n\u2014\u2013]|$))/gu;

function splitLast(word) {
  // الحرف الأخير وعلاماته، وما قبله (مع علاماته)
  let i = word.length;
  while (i > 0 && MARK.test(word[i - 1])) i--;
  return { head: word.slice(0, i - 1), letter: word[i - 1], marks: word.slice(i) };
}

export function waqfWord(word) {
  const { head, letter, marks } = splitLast(word);
  if (!letter) return word;

  // التاء المربوطة يُوقف عليها هاءً ساكنة: مَدْرَسَةٌ ← مَدْرَسَهْ
  if (letter === '\u0629') return `${head}\u0647${SUKUN}`;

  // تنوين الفتح يُوقف عليه ألفاً: سَهْلًا ← سَهْلَا، جِدًّا ← جِدَّا، هُدًى ← هُدَى، كتاباً ← كتابَا
  if (letter === '\u0627' || letter === '\u0649') {
    const prev = splitLast(head);
    if (prev.marks.includes(FATHATAN)) {
      return `${prev.head}${prev.letter}${prev.marks.replace(FATHATAN, FATHA)}${letter}`;
    }
    if (marks.includes(FATHATAN)) {
      const withFatha = [...prev.marks].some(m => VOWELS.has(m) || m === SUKUN) ? prev.marks : prev.marks + FATHA;
      return `${prev.head}${prev.letter}${withFatha}${letter}`;
    }
    return word; // ألف مدّ — لا تتغير
  }

  // مَاءً ← مَاءَا
  if (letter === '\u0621' && marks.includes(FATHATAN)) return `${head}\u0621${FATHA}\u0627`;

  // واو/ياء بلا حركة: حرف مدّ (فِي) أو ساكن أصلاً — لا تتغير
  const hasVowel = [...marks].some(m => VOWELS.has(m));
  if ((letter === '\u0648' || letter === '\u064A') && !hasVowel) return word;

  // الحركة والتنوين ← سكون؛ الشدّة تبقى (رَمَادِيٌّ ← رَمَادِيّ)
  if (marks.includes(SHADDA)) return `${head}${letter}${SHADDA}`;
  return `${head}${letter}${SUKUN}`;
}

export function applyWaqf(text) {
  return String(text ?? '').replace(WORD_BEFORE_PAUSE, waqfWord);
}
