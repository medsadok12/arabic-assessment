/* ── نص فهيم ← قطع صوتية ──
   cleanText: يحذف ما لا يُنطق فقط (رموز تعبيرية، أعلام، أسهم، علامات markdown)
   فلا يقرأ الصوت «صاروخ» أو «علم تونس»؛ الحروف العربية وكل الحركات تمر كما هي. */
export function cleanText(text) {
  return text
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')   // regional indicators → country flags 🇹🇳
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')   // skin-tone modifiers (digits-safe)
    .replace(/\p{Extended_Pictographic}/gu, '')// emoji: faces, objects, symbols 🌟🦁
    .replace(/[\u{2190}-\u{21FF}]/gu, '')      // arrows
    .replace(/[\u{2300}-\u{27BF}]/gu, '')      // misc technical, dingbats, symbols
    .replace(/[\u{2B00}-\u{2BFF}]/gu, '')      // misc symbols & arrows (⭐ etc.)
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')      // variation selectors
    .replace(/⃣/g, '')                    // combining enclosing keycap
    .replace(/‍/g, '')                    // zero-width joiner
    .replace(/ـ/g, '')                         // tatweel (no phonetic value)
    .replace(/[*_~`#>]/g, '')                  // markdown symbols
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* الجواب كله قطعة واحدة حين يكون الصوت من Gemini: كل قطعة يولّدها منفصلة فيتغير
   الصوت والسرعة بين القطع (بلاغ الأستاذ محمد). لا يُقسم إلا نص أطول من حد الخادم (1200 حرف). */
export function chunkText(text) {
  const MAX = 1100;
  if (text.length <= MAX) return text ? [text] : [];
  const chunks = [];
  let cur = '';
  for (const s of text.split(/(?<=[.!?؟،؛\n])\s*/)) {
    if (cur && (cur + s).length > MAX) { chunks.push(cur.trim()); cur = s; }
    else cur += (cur ? ' ' : '') + s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.flatMap(c => (c.length > MAX ? c.match(new RegExp(`[\\s\\S]{1,${MAX}}`, 'g')) : [c]));
}

/* صوت Azure ثابت بين الطلبات، فيُقرأ الجواب جملةً جملة وهو يصل: أول جملة مكتملة
   تُرسل للصوت فوراً بدل انتظار الجواب كله.
   الجملة مكتملة حين تتبع علامةَ نهايتها مسافةٌ (فالنقطة في آخر ما وصل قد تكون منتصف رقم).
   الجملة القصيرة جداً تُضم إلى التالية كي لا يتقطع الصوت، والطويلة بلا نهاية تُقسم عند فاصلة. */
const SENTENCE_END = /[.!?؟؛\n]+\s+/g;
const MIN_SPOKEN = 12;
const MAX_PENDING = 180;

export function takeSentences(buf, final = false) {
  const sentences = [];
  let start = 0;
  SENTENCE_END.lastIndex = 0;
  let m;
  while ((m = SENTENCE_END.exec(buf))) {
    const end = m.index + m[0].length;
    const s = buf.slice(start, end).trim();
    if (cleanText(s).length >= MIN_SPOKEN) { sentences.push(s); start = end; }
  }
  let rest = buf.slice(start);
  if (!final && rest.length > MAX_PENDING) {
    const cut = Math.max(rest.lastIndexOf('، '), rest.lastIndexOf(', '));
    if (cut > MIN_SPOKEN) { sentences.push(rest.slice(0, cut + 1).trim()); rest = rest.slice(cut + 2); }
  }
  if (final) {
    const tail = rest.trim();
    // ذيل لا يُنطق (رموز فقط) يُترك؛ والقصير جداً يُلحق بما قبله إن أمكن
    if (!cleanText(tail)) { /* لا شيء يُقرأ */ }
    else if (sentences.length && cleanText(tail).length < MIN_SPOKEN) sentences[sentences.length - 1] += ` ${tail}`;
    else sentences.push(tail);
    rest = '';
  }
  return { sentences, rest };
}
