import { describe, it, expect, beforeAll } from 'vitest';
import {
  DEFAULT_LETTERS, HUROOF_COUNT, mergeLetters, sanitizeHuroofPatch, huroofMediaPathFromUrl, highlightLetter,
} from './huroof.js';

const SUPA = 'https://proj.supabase.co';
const MEDIA = `${SUPA}/storage/v1/object/public/media/`;

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA;
});

describe('mergeLetters', () => {
  it('يُرجع الحروف الـ28 الافتراضية حين لا توجد تعديلات', () => {
    const out = mergeLetters([]);
    expect(out).toHaveLength(28);
    expect(HUROOF_COUNT).toBe(28);
    expect(out[0]).toMatchObject({ l: 'أ', word: DEFAULT_LETTERS[0].word, idx: 0, customized: false, image_url: null });
  });

  it('يدمج نص الحرف المعدَّل وصوره وأصواته ويُبقي غير المعدَّل افتراضياً', () => {
    const out = mergeLetters([{ idx: 1, word: 'بَطَّةٌ', sentence: null, image_url: `${MEDIA}huroof/2-img.webp`, letter_audio_url: `${MEDIA}huroof/2-letter.m4a` }]);
    expect(out[1].word).toBe('بَطَّةٌ');
    expect(out[1].sentence).toBe(DEFAULT_LETTERS[1].sentence);
    expect(out[1].image_url).toBe(`${MEDIA}huroof/2-img.webp`);
    expect(out[1].sentence_audio_url).toBeNull();
    expect(out[1].customized).toBe(true);
    expect(out[0].customized).toBe(false);
  });

  it('يتجاهل الصفوف بفهرس خارج الحروف والبيانات غير الصالحة', () => {
    expect(mergeLetters([{ idx: 99, word: 'x' }, { idx: -1 }, null])).toEqual(mergeLetters([]));
    expect(mergeLetters(null)).toHaveLength(28);
  });
});

describe('sanitizeHuroofPatch', () => {
  it('يحفظ النص المطابق للأصل أو الفارغ كـnull ليبقى افتراضياً', () => {
    const { fields } = sanitizeHuroofPatch(0, { word: DEFAULT_LETTERS[0].word, sentence: '   ', name: 'ألف' });
    expect(fields).toEqual({ word: null, sentence: null, name: 'ألف' });
  });

  it('يقبل روابط مجلد الحروف فقط ويسمح بإزالة الملف بـnull', () => {
    expect(sanitizeHuroofPatch(3, { image_url: `${MEDIA}huroof/4-img-1.webp`, letter_audio_url: null }).fields)
      .toEqual({ image_url: `${MEDIA}huroof/4-img-1.webp`, letter_audio_url: null });
    expect(sanitizeHuroofPatch(3, { image_url: `${MEDIA}stories/audio/x.mp3` }).error).toBeTruthy();
    expect(sanitizeHuroofPatch(3, { sentence_audio_url: 'https://evil.example/a.mp3' }).error).toBeTruthy();
    expect(sanitizeHuroofPatch(3, { image_url: 'data:image/png;base64,AAAA' }).error).toBeTruthy();
  });

  it('يرفض النص الأطول من المسموح وأنواع البيانات الخاطئة', () => {
    expect(sanitizeHuroofPatch(0, { sentence: 'ب'.repeat(301) }).error).toBeTruthy();
    expect(sanitizeHuroofPatch(0, { word: 5 }).error).toBeTruthy();
    expect(sanitizeHuroofPatch(0, null).error).toBeTruthy();
  });

  it('يتجاهل الحقول غير المعروفة (لا يكتب أعمدة أخرى)', () => {
    expect(sanitizeHuroofPatch(0, { updated_by: 'x', idx: 5 }).fields).toEqual({});
  });
});

describe('huroofMediaPathFromUrl', () => {
  it('يرفض الخروج من مجلد الحروف', () => {
    expect(huroofMediaPathFromUrl(`${MEDIA}huroof/../stories/a.mp3`)).toBeNull();
    expect(huroofMediaPathFromUrl(`${MEDIA}huroof/1-letter-1.m4a?t=1`)).toBe('huroof/1-letter-1.m4a');
  });
});

describe('highlightLetter — الحرف ملوّن داخل الكلمة والجملة', () => {
  const hl = (t, l) => highlightLetter(t, l).filter(x => x.hl).map(x => x.t);
  it('يلوّن الحرف مع حركاته', () => {
    expect(highlightLetter('أَسَدٌ', 'أ')).toEqual([{ t: 'أَ', hl: true }, { t: 'سَدٌ', hl: false }]);
    expect(hl('دَجَاجَةٌ', 'ج')).toEqual(['جَ', 'جَ']);
  });
  it('يقبل حرف البطاقة بالكشيدة «هـ»', () => {
    expect(hl('هِلَالٌ', 'هـ')).toEqual(['هِ']);
  });
  it('لا يكسر «لا»: لام قبل ألف وألف بعد لام لا يُلوَّنان', () => {
    expect(hl('هِلَالٌ', 'ل')).toEqual(['لٌ']);
    expect(hl('الأَسَدُ', 'أ')).toEqual([]);
    expect(hl('الأَسَدُ مَلِكُ', 'ل')).toEqual(['لِ']);
  });
  it('النص كله محفوظ كما هو', () => {
    const t = 'الدَّجَاجَةُ تَبِيضُ كُلَّ يَوْمْ';
    expect(highlightLetter(t, 'د').map(x => x.t).join('')).toBe(t);
  });
  it('بلا نص أو بلا حرف: مقطع واحد أو لا شيء', () => {
    expect(highlightLetter('', 'أ')).toEqual([]);
    expect(highlightLetter('أَسَدٌ', '')).toEqual([{ t: 'أَسَدٌ', hl: false }]);
  });
});

/* ── تحدّي الحروف (2026-10-25) ── */
import {
  DEFAULT_RIDDLES, normalizeHuroofSettings, validateHuroofSettings, HUROOF_DEFAULT_SETTINGS, shuffledOrder, riddleDefaults,
} from './huroof.js';

describe('mergeLetters — لغز فهيم والإملاء', () => {
  it('الافتراضي: لغز الحرف، والإجابة بلا تشكيل، وإجاباته المقبولة وقواعده', () => {
    const l = mergeLetters([])[20];
    expect(l.riddle).toBe(DEFAULT_RIDDLES[20].riddle);
    expect(l.answer).toBe('قطة');
    expect(l.accept).toEqual(['قط']);
    expect(l.rules.length).toBeGreaterThan(0);
    expect(l.custom).toEqual({ riddle: false, answer: false, accept: false, rules: false });
  });
  it('إن غيّر المعلم الكلمة: لا لغز افتراضي ولا قواعد قديمة، والإجابة من الكلمة الجديدة', () => {
    const l = mergeLetters([{ idx: 1, word: 'بَطَّةٌ' }])[1];
    expect(l.riddle).toBeNull();
    expect(l.answer).toBe('بطة');
    expect(l.rules).toEqual([]);
    expect(riddleDefaults(1, 'بَطَّةٌ')).toEqual({ riddle: '', accept: [], rules: [] });
  });
  it('ما كتبه المعلم يحل محل الافتراضي، و[] تعني «لا شيء»', () => {
    const l = mergeLetters([{ idx: 20, riddle: 'لغزي؟', answer: 'هرة', accept: [], spell_rules: [{ wrong: 'قطة', msg: 'اكتب اسمها الآخر' }, { wrong: '', msg: 'x' }] }])[20];
    expect(l).toMatchObject({ riddle: 'لغزي؟', answer: 'هرة', accept: [] });
    expect(l.rules).toEqual([{ wrong: 'قطة', msg: 'اكتب اسمها الآخر' }]);
    expect(l.custom).toEqual({ riddle: true, answer: true, accept: true, rules: true });
  });
});

describe('sanitizeHuroofPatch — حقول اللغز', () => {
  it('اللغز والإجابة المطابقان للأصل يُحفظان null', () => {
    expect(sanitizeHuroofPatch(0, { riddle: DEFAULT_RIDDLES[0].riddle, answer: 'أسد' }).fields).toEqual({ riddle: null, answer: null });
    expect(sanitizeHuroofPatch(0, { answer: 'الأسد' }).fields).toEqual({ answer: 'الأسد' });
  });
  it('الإجابات المقبولة: قائمة نصوص بلا تكرار، وnull للافتراضي', () => {
    expect(sanitizeHuroofPatch(0, { accept: [' ليث ', 'ليث', ''] }).fields).toEqual({ accept: ['ليث'] });
    expect(sanitizeHuroofPatch(0, { accept: null }).fields).toEqual({ accept: null });
    expect(sanitizeHuroofPatch(0, { accept: 'ليث' }).error).toBeTruthy();
    expect(sanitizeHuroofPatch(0, { accept: Array(9).fill('a') }).error).toBeTruthy();
  });
  it('القواعد: { wrong, msg } فقط وبحدود طول', () => {
    expect(sanitizeHuroofPatch(0, { spell_rules: [{ wrong: 'ليث', msg: 'اسم آخر', x: 1 }] }).fields).toEqual({ spell_rules: [{ wrong: 'ليث', msg: 'اسم آخر' }] });
    expect(sanitizeHuroofPatch(0, { spell_rules: [{ wrong: 'ليث' }] }).error).toBeTruthy();
    expect(sanitizeHuroofPatch(0, { spell_rules: [{ wrong: 'ليث', msg: 'م'.repeat(201) }] }).error).toBeTruthy();
    expect(sanitizeHuroofPatch(0, { spell_rules: Array(13).fill({ wrong: 'a', msg: 'b' }) }).error).toBeTruthy();
  });
  it('صوت اللغز: روابط مجلد الحروف فقط', () => {
    expect(sanitizeHuroofPatch(0, { riddle_audio_url: `${MEDIA}huroof/1-riddle-1.m4a` }).fields).toEqual({ riddle_audio_url: `${MEDIA}huroof/1-riddle-1.m4a` });
    expect(sanitizeHuroofPatch(0, { riddle_audio_url: 'https://evil.example/a.mp3' }).error).toBeTruthy();
  });
});

describe('إعدادات التحدّي', () => {
  it('القيم الافتراضية والقيم الخاطئة تعود للافتراضي', () => {
    expect(normalizeHuroofSettings(null)).toEqual(HUROOF_DEFAULT_SETTINGS);
    expect(normalizeHuroofSettings({ mode: 'x', show_path: 'yes', reveal_after: 99 })).toEqual(HUROOF_DEFAULT_SETTINGS);
  });
  it('المعلم يغيّر الإعدادات ولا يغيّر رقم الجولة', () => {
    const out = validateHuroofSettings({ mode: 'explore', show_path: false, reveal_after: 0, epoch: 50 }, { epoch: 3 });
    expect(out).toMatchObject({ mode: 'explore', show_path: false, reveal_after: 0, epoch: 3, hints: true });
    expect(validateHuroofSettings({ hints: 'no' }, {})).toBeNull();
    expect(validateHuroofSettings({ mode: 'race' }, {})).toBeNull();
    expect(validateHuroofSettings(null, {})).toBeNull();
  });
});

describe('shuffledOrder — خلط ثابت لكل طالب وجولة', () => {
  it('تبديل كامل للأرقام 0..27، ثابت للبذرة نفسها، ومختلف لغيرها', () => {
    const a = shuffledOrder('user-1:0');
    expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: 28 }, (_, i) => i));
    expect(shuffledOrder('user-1:0')).toEqual(a);
    expect(shuffledOrder('user-1:1')).not.toEqual(a);
    expect(a).not.toEqual(Array.from({ length: 28 }, (_, i) => i));
  });
});
