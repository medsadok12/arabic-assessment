import { describe, it, expect } from 'vitest';
import { checkSpelling, normalizeArabic, looseEqual, displayAnswer, levenshtein } from './huroof-spell.js';
import { DEFAULT_LETTERS, DEFAULT_RIDDLES, mergeLetters, huroofTarget } from './huroof.js';

const L = mergeLetters([]);
const T = (i) => huroofTarget(L[i]);
const check = (typed, i, opts) => checkSpelling(typed, T(i), opts);
const kind = (typed, i, opts) => { const r = check(typed, i, opts); return r.ok ? 'ok' : r.kind; };

describe('normalizeArabic — ما ليس خطأً إملائياً لا يُحاسَب عليه', () => {
  it('يحذف التشكيل والتطويل والترقيم والمسافات الزائدة', () => {
    expect(normalizeArabic('  أَسَـــدٌ!؟ ')).toBe('أسد');
    expect(normalizeArabic('تُفَّاحَةٌ')).toBe('تفاحة');
  });
  it('يوحّد أشكال العرض والحروف الفارسية الشبيهة', () => {
    expect(normalizeArabic('ﻗﻄﺔ')).toBe('قطة');
    expect(normalizeArabic('ﻻ')).toBe('لا');
    expect(normalizeArabic('کتاب')).toBe('كتاب');
    expect(normalizeArabic('ظبی')).toBe('ظبي');
  });
});

describe('checkSpelling — الإجابة الصحيحة', () => {
  it('كل كلمات الحروف الـ28 تُقبل بلا تشكيل وبتشكيلها الكامل', () => {
    L.forEach((l, i) => {
      expect(check(l.answer, i).ok).toBe(true);
      expect(check(l.word, i).ok).toBe(true);
    });
  });
  it('«ال» التعريف مقبولة افتراضياً، ومرفوضة برسالة إن أطفأها المعلم', () => {
    expect(kind('الأسد', 0)).toBe('ok');
    expect(kind('الشمس', 12)).toBe('ok');
    expect(check('الأسد', 0, { allowAl: false })).toMatchObject({ ok: false, kind: 'al' });
  });
  it('الإجابات الأخرى المقبولة: قط، تفاح، موز…', () => {
    expect(kind('قط', 20)).toBe('ok');
    expect(kind('تفاح', 2)).toBe('ok');
    expect(kind('موز', 23)).toBe('ok');
  });
});

describe('checkSpelling — الهمزات', () => {
  it('مثال الأستاذ محمد: «اسد» ← لا تنسَ إضافة الهمزة: أَسَد!', () => {
    const r = check('اسد', 0);
    expect(r).toMatchObject({ ok: false, kind: 'hamza_missing' });
    expect(r.msg).toBe('أحسنت المحاولة، لكن لا تنسَ إضافة الهمزة: أَسَد!');
    expect(r.tip).toContain('فوق الألف');
  });
  it('همزة في غير مكانها: إسد ← فوق الألف، ذءب ← على النبرة', () => {
    expect(check('إسد', 0)).toMatchObject({ kind: 'hamza_seat' });
    const r = check('ذءب', 8);
    expect(r.kind).toBe('hamza_seat');
    expect(r.msg).toContain('على النبرة (ئ)');
  });
  it('همزة ناقصة في وسط الكلمة: ذيب، طاير', () => {
    expect(check('ذيب', 8)).toMatchObject({ kind: 'hamza_missing', show: 'ذِئْب' });
    expect(check('طاير', 15).tip).toContain('النبرة');
  });
  it('همزة زائدة على ألف لا همزة لها', () => {
    expect(kind('غزأل', 18)).toBe('hamza_extra');
  });
});

describe('checkSpelling — التاء المربوطة والمفتوحة والتنوين والألف المقصورة', () => {
  it('تفاحه / تفاحت ← تاء مربوطة', () => {
    expect(check('تفاحه', 2)).toMatchObject({ kind: 'ta_marbuta', show: 'تُفَّاحَة' });
    expect(check('تفاحت', 2).msg).toContain('وليست تاء مفتوحة');
    expect(kind('قطه', 20)).toBe('ta_marbuta');
  });
  it('بيه ← تاء مفتوحة', () => {
    expect(kind('بيه', 1)).toBe('ta_maftuha');
  });
  it('التنوين المكتوب نوناً: أسدن، بيتن — وتُعرض الكلمة بتنوينها', () => {
    const r = check('أسدن', 0);
    expect(r.kind).toBe('tanween');
    expect(r.msg).toContain('أَسَدٌ');
  });
  it('خطآن معاً: الأولوية للهمزة ثم التنوين بعد تصحيحها', () => {
    expect(kind('اسدن', 0)).toBe('hamza_missing');
    expect(kind('أسدن', 0)).toBe('tanween');
    expect(kind('تفاحتن', 2)).toBe('ta_marbuta');
  });
  it('الياء والألف المقصورة في آخر الكلمة', () => {
    expect(kind('ظبى', 16)).toBe('ya');
    const t = { word: 'مُسْتَشْفَى' };
    expect(checkSpelling('مستشفي', t).kind).toBe('alef_maqsura');
    expect(checkSpelling('مستشفا', t).kind).toBe('alef_maqsura');
  });
});

describe('checkSpelling — المدّ والشدة والحروف الشبيهة', () => {
  it('حرف مدّ ناقص: غزل ← غزال، هلل ← هلال', () => {
    expect(check('غزل', 18)).toMatchObject({ kind: 'madd', show: 'غَزَال' });
    expect(kind('هلل', 25)).toBe('madd');
  });
  it('حرف مكرر بدل الشدة: تففاحة، رممان', () => {
    expect(kind('تففاحة', 2)).toBe('shadda');
    expect(kind('رممان', 9)).toBe('shadda');
  });
  it('حروف شبيهة بالنقاط أو الصوت: سقر، تائر، زئب، دفدع، تفاخة', () => {
    expect(check('سقر', 13).msg).toContain('«ص» وليس «س»');
    expect(kind('تائر', 15)).toBe('similar');
    expect(kind('زئب', 8)).toBe('similar');
    expect(kind('دفدع', 14)).toBe('similar');
    expect(kind('تفاخة', 2)).toBe('similar');
  });
});

describe('checkSpelling — لا تكشف الإجابة إلا لخطأ قاعدة', () => {
  it('قريب (حرف ناقص/زائد/مختلف) بلا كشف الكلمة', () => {
    const r = check('اس', 0);
    expect(r.kind).toBe('close_missing');
    expect(r.show).toBeUndefined();
    expect(r.msg).not.toContain('أسد');
    expect(kind('كتابب', 21)).toBe('close_extra');
  });
  it('كلمة أخرى ← «ليست هذه الكلمة» بلا كشف', () => {
    const r = check('نمر', 0);
    expect(r.kind).toBe('wrong');
    expect(r.show).toBeUndefined();
  });
  it('فارغ، أو حروف لاتينية', () => {
    expect(kind('   ', 0)).toBe('empty');
    expect(kind('asad', 0)).toBe('not_arabic');
  });
});

describe('checkSpelling — قواعد المعلم', () => {
  it('القواعد الجاهزة تعيد الطفل للكلمة المطلوبة: فرس للحصان، غزال للظبي، قمر للهلال', () => {
    expect(check('فرس', 5)).toMatchObject({ kind: 'custom' });
    expect(check('فرس', 5).msg).toContain('الحاء');
    expect(check('غزال', 16).msg).toContain('الظاء');
    expect(check('قمر', 25).msg).toContain('الهاء');
  });
  it('القاعدة متسامحة مع أخطاء الهمزة والتاء: «هره» تطابق «هرة»', () => {
    expect(check('هره', 20)).toMatchObject({ kind: 'custom' });
    expect(looseEqual('هره', 'هرة')).toBe(true);
    expect(looseEqual('اسد', 'أسد')).toBe(true);
    expect(looseEqual('نمر', 'أسد')).toBe(false);
  });
  it('قاعدة يضيفها المعلم لكلمة جديدة', () => {
    const t = { word: 'بَطَّةٌ', rules: [{ wrong: 'وزة', msg: 'الوزة أكبر مني!' }] };
    expect(checkSpelling('وزه', t)).toEqual({ ok: false, kind: 'custom', msg: 'الوزة أكبر مني!' });
    expect(checkSpelling('بطه', t).kind).toBe('ta_marbuta');
  });
  it('إجابة يحدّدها المعلم تختلف عن كلمة البطاقة', () => {
    const t = { word: 'الْقِطَّةُ', answer: 'قطة' };
    expect(checkSpelling('قطة', t).ok).toBe(true);
    expect(displayAnswer('رُمَّانٌ', 'رمانة')).toBe('رمانة');
    expect(displayAnswer('رُمَّانٌ', null)).toBe('رُمَّان');
  });
});

describe('الألغاز الافتراضية', () => {
  it('لكل حرف لغز ينتهي بسؤال، وقواعده لا تطابق إجابته الصحيحة', () => {
    expect(DEFAULT_RIDDLES).toHaveLength(DEFAULT_LETTERS.length);
    DEFAULT_RIDDLES.forEach((d, i) => {
      expect(d.riddle.endsWith('؟')).toBe(true);
      (d.rules || []).forEach(r => expect(looseEqual(r.wrong, L[i].answer)).toBe(false));
      (d.accept || []).forEach(a => expect(check(a, i).ok).toBe(true));
    });
  });
  it('levenshtein', () => {
    expect(levenshtein('غزال', 'غزل')).toBe(1);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});
