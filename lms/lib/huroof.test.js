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
