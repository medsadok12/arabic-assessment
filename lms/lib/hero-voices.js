/* أصوات شخصيات «عالم الأبطال»: صوت Azure بطبقة وسرعة تناسب كل شخصية.
   الجمل ثابتة من الكتالوج، فتُولَّد مرة واحدة وتُخدم من التخزين لكل الطلاب. */
import { CHARACTERS } from './hero-catalog';
import { cleanText } from './faheem-speech';

export const HERO_VOICES = {
  kid:   { name: 'ar-SA-HamedNeural',   pitch: '+45%', rate: '+4%' },
  cat:   { name: 'ar-SA-ZariyahNeural', pitch: '+40%', rate: '+6%' },
  bunny: { name: 'ar-SA-ZariyahNeural', pitch: '+55%', rate: '+8%' },
  panda: { name: 'ar-AE-HamdanNeural',  pitch: '+20%', rate: '-6%' },
  fox:   { name: 'ar-QA-AmalNeural',    pitch: '+30%', rate: '+6%' },
  lion:  { name: 'ar-SA-HamedNeural',   pitch: '+12%', rate: '-4%' },
  dino:  { name: 'ar-AE-HamdanNeural',  pitch: '+35%', rate: '+0%' },
  robot: { name: 'ar-KW-FahedNeural',   pitch: '+25%', rate: '+12%' },
};

/* المفتاح: hello | special | l0 | l1 … ← { preset, text } أو null إن لم يكن من الكتالوج */
export function heroLine(charId, key) {
  const c = CHARACTERS.find(x => x.id === charId);
  const preset = HERO_VOICES[charId];
  if (!c || !preset || typeof key !== 'string') return null;
  let raw = null;
  if (key === 'hello') raw = c.hello;
  else if (key === 'special') raw = `${c.special.name}!`;
  else if (/^l\d$/.test(key)) raw = c.lines[Number(key.slice(1))] ?? null;
  const text = raw ? cleanText(raw).trim() : '';
  return text ? { preset, text } : null;
}
