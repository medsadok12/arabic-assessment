// ألحان أصلية قصيرة لهذا التدريب، تُعزف محليًا بلا خدمات أو ملفات خارجية.
// كل نغمة: MIDI، ومدتها بالنبضات. لا صوت آلي للكلمات.
export const DISCOVER_BACKGROUNDS = [
  { id: 'garden', name: 'نزهة في الحديقة', mood: 'مرحة وهادئة', bpm: 78, tone: 'triangle', notes: [[60, 1], [64, 1], [67, 2], [64, 1], [62, 1], [67, 2], [64, 2], [62, 2], [60, 4]] },
  { id: 'clouds', name: 'غيمات هادئة', mood: 'ناعمة وبطيئة', bpm: 60, tone: 'sine', notes: [[60, 2], [67, 2], [69, 2], [64, 2], [65, 2], [62, 2], [67, 2], [60, 2]] },
  { id: 'music-box', name: 'صندوق الألحان', mood: 'اكتشاف ولعب', bpm: 90, tone: 'sine', notes: [[72, 1], [79, 1], [76, 1], [79, 1], [81, 2], [79, 2], [76, 2], [74, 2], [72, 4]] },
  { id: 'stream', name: 'جدول صغير', mood: 'مريحة ومتدفقة', bpm: 72, tone: 'sine', notes: [[62, 2], [65, 1], [69, 1], [72, 2], [69, 2], [67, 2], [65, 2], [64, 2], [62, 2]] },
  { id: 'stars', name: 'نجوم هادئة', mood: 'استرخاء وتركيز', bpm: 56, tone: 'sine', notes: [[72, 2], [71, 2], [67, 2], [64, 2], [62, 2], [64, 2], [67, 2], [72, 2]] },
  { id: 'explore', name: 'خطوات الاكتشاف', mood: 'حيوية خفيفة', bpm: 100, tone: 'triangle', notes: [[60, 1], [62, 1], [64, 1], [67, 1], [69, 2], [67, 2], [64, 2], [62, 2], [60, 4]] },
  { id: 'butterflies', name: 'رقصة الفراشات', mood: 'خفيفة ومرحة', bpm: 96, tone: 'sine', notes: [[76, 1], [74, 1], [79, 2], [76, 2], [81, 1], [79, 1], [74, 2], [72, 4]] },
  { id: 'rainbow', name: 'ألوان الفرح', mood: 'بهجة لطيفة', bpm: 86, tone: 'triangle', notes: [[67, 1], [72, 1], [76, 2], [74, 2], [77, 2], [76, 2], [72, 2], [67, 4]] },
];
export const DISCOVER_SUCCESSES = [
  { id: 'sparkle', name: 'بريق الاكتشاف', bpm: 180, tone: 'sine', notes: [[72, .5], [76, .5], [79, .5], [84, 2]] },
  { id: 'bravo', name: 'أحسنت يا بطل', bpm: 140, tone: 'triangle', notes: [[76, .5], [79, .5], [84, 2]] },
  { id: 'tiny-win', name: 'فرحة صغيرة', bpm: 170, tone: 'sine', notes: [[72, .5], [74, .5], [76, .5], [79, 1.5]] },
  { id: 'bell', name: 'جرس لطيف', bpm: 135, tone: 'sine', notes: [[79, .75], [76, .75], [84, 1.5]] },
  { id: 'steps', name: 'خطوات إلى القمة', bpm: 185, tone: 'triangle', notes: [[60, .5], [64, .5], [67, .5], [71, .5], [72, 2]] },
  { id: 'bloom', name: 'تفتّح الزهرة', bpm: 150, tone: 'sine', notes: [[77, .5], [81, .5], [84, 1], [81, 1.5]] },
  { id: 'celebrate', name: 'احتفال فهيم', bpm: 180, tone: 'triangle', notes: [[72, .5], [76, .5], [79, .5], [84, 1], [79, .5], [84, 1.5]] },
  { id: 'gentle', name: 'نجمة هادئة', bpm: 115, tone: 'sine', notes: [[72, .75], [79, .75], [76, .75], [84, 1.5]] },
];
export const DEFAULT_DISCOVER_SOUND = {
  background: 'off', backgroundUrl: '', backgroundVolume: .16,
  success: 'sparkle', successUrl: '', successVolume: .45,
  wordVolume: 1, clueVolume: 1, autoWord: true,
};
export function normalizeDiscoverSound(raw) {
  if (raw !== undefined && (!raw || typeof raw !== 'object' || Array.isArray(raw))) return null;
  const value = { ...DEFAULT_DISCOVER_SOUND, ...raw };
  if (!['off', 'custom', ...DISCOVER_BACKGROUNDS.map(x => x.id)].includes(value.background) || !['off', 'custom', ...DISCOVER_SUCCESSES.map(x => x.id)].includes(value.success) || typeof value.autoWord !== 'boolean') return null;
  for (const key of ['backgroundVolume', 'successVolume', 'wordVolume', 'clueVolume']) if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 1) return null;
  return Object.fromEntries(Object.keys(DEFAULT_DISCOVER_SOUND).map(k => [k, value[k]]));
}
