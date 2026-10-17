/* ════════════════════════════════════════════════════════════════
   أشكال الحروف العربية في مربعات الكلمة (صيّاد الحروف ومعاينة اللعبة في
   الصفحة الرئيسية الجديدة) — مصدر واحد بدل نسختين.
   كل حرف في مربع مستقل يُعرض بشكله داخل الكلمة (أول/وسط/آخر) عبر ZWJ.
════════════════════════════════════════════════════════════════ */

export const DIACRITICS = /[ً-ْٰ]/g;
export function stripDia(s) { return (s || '').replace(DIACRITICS, ''); }

// حروف لا تتصل بما بعدها
export const NON_CONNECTORS = new Set('اأإآءوردذزىة');

// المسافة بين كلمتين (مثل «حمار وحشي») حدّ كلمة: الحرف قبلها وبعدها لا يتصل بها
export const isGap = (ch) => ch == null || /\s/.test(ch);

export function getLetterForm(stripped, idx) {
  const letter    = stripped[idx];
  if (isGap(letter)) return 'isolated';
  const prev      = idx > 0                   ? stripped[idx - 1] : null;
  const next      = idx < stripped.length - 1 ? stripped[idx + 1] : null;
  const joinsPrev = !isGap(prev) && !NON_CONNECTORS.has(prev);
  const joinsNext = !isGap(next) && !NON_CONNECTORS.has(letter);
  if (joinsPrev && joinsNext) return 'medial';
  if (joinsPrev)              return 'final';
  if (joinsNext)              return 'initial';
  return 'isolated';
}

export const ZWJ = '‍'; // U+200D zero-width joiner

export function toContextual(letter, form) {
  const base = (letter || '').replace(DIACRITICS, '');
  switch (form) {
    case 'initial': return base + ZWJ;
    case 'medial':  return ZWJ + base + ZWJ;
    case 'final':   return ZWJ + base;
    default:        return base;
  }
}
