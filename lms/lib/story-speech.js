/* ════════════════════════════════════════════════════════════════
   قراءة صفحة القصة بصوت الجهاز — البديل حين لا يوجد تسجيل للصفحة
   زر «🔊 استمع» يظهر تحت كل صفحة في كل قصة: يشغّل تسجيل المعلم إن وُجد،
   وإلا يقرأ نص الصفحة بصوت الجهاز (speechSynthesis) إن كان فيه صوت عربي.
   هنا الدوال الصافية فقط (مغطّاة باختبار story-speech.test.js)؛ التشغيل
   نفسه في components/StoryNarration.jsx.
════════════════════════════════════════════════════════════════ */

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };

/* نص الصفحة من HTML المحرر: الأسطر تبقى أسطراً، والوسوم والرموز تُحذف */
export function storyPageText(pageHtml) {
  return String(pageHtml || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, m => ENTITIES[m] ?? ' ')
    .split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
    .join('\n');
}

const SPEECH_MAX = 160;
const HAS_WORD = /[\p{L}\p{N}]/u;

function splitBy(text, re) {
  return (text.match(re) || []).map(s => s.trim()).filter(Boolean);
}

/* يقطّع النص إلى جمل قصيرة تُقرأ واحدة تلو الأخرى: يعطي تقدماً حقيقياً في
   شريط الزر، ويتفادى توقف كروم عن القراءة في منتصف نص طويل.
   بلا lookbehind في التعابير — سفاري الأقدم من 16.4 يرفضه فيتعطل الملف كله. */
export function speechChunks(text, max = SPEECH_MAX) {
  const clean = String(text || '')
    .replace(/\p{Extended_Pictographic}|️|‍/gu, ' ') // الإيموجي يُنطق اسمه بصوت الجهاز
    .replace(/[«»“”"]/g, ' ');
  const out = [];
  for (const line of clean.split('\n')) {
    for (const sentence of splitBy(line, /[^.!?؟…؛]+[.!?؟…؛]*/g)) {
      if (sentence.length <= max) { out.push(sentence); continue; }
      for (const part of splitBy(sentence, /[^،,]+[،,]*/g)) {
        if (part.length <= max) { out.push(part); continue; }
        let cur = '';
        for (const word of part.split(/\s+/)) {
          if (cur && cur.length + 1 + word.length > max) { out.push(cur); cur = word; }
          else cur = cur ? `${cur} ${word}` : word;
        }
        if (cur) out.push(cur);
      }
    }
  }
  return out.map(s => s.replace(/\s+/g, ' ').trim()).filter(s => HAS_WORD.test(s));
}

/* أفضل صوت عربي في الجهاز: الأصوات الطبيعية (Edge/Windows) أولاً، ثم أصوات
   Google، ثم العربية السعودية. null إن لم يكن في الجهاز صوت عربي — فلا يظهر
   الزر لصفحة بلا تسجيل بدل أن يقرأها صوت إنجليزي بلا معنى. */
export function pickArabicVoice(voices) {
  let best = null;
  let bestScore = -1;
  for (const v of voices || []) {
    const lang = String(v?.lang || '').toLowerCase().replace('_', '-');
    if (!lang.startsWith('ar')) continue;
    const name = String(v?.name || '');
    const score = (/natural|neural|online/i.test(name) ? 4 : 0)
                + (/google/i.test(name) ? 2 : 0)
                + (lang === 'ar-sa' ? 1 : 0);
    if (score > bestScore) { best = v; bestScore = score; }
  }
  return best;
}
