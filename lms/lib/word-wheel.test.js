import { describe, it, expect } from 'vitest';
import { DEFAULT_CATALOG, calcScore, canFormFrom, letterCounts, mergeWheel, toPreviewWheel, pickPreviewWheels, WHEEL_PREVIEW_TARGET } from './word-wheel.js';

describe('word-wheel helpers', () => {
  it('يحسب النقاط بطول الكلمة ويضاعفها حين تستعمل كل الحروف', () => {
    expect(calcScore('رسم', ['ك', 'ت', 'م'])).toBe(1);
    expect(calcScore('مكتب', ['ك', 'ت', 'م'])).toBe(4); // 4 حروف (2) × 2: فيها ك ت م كلها
    expect(calcScore('مدرس', ['ك', 'ت', 'م'])).toBe(2);
  });
  it('يتحقق أن الكلمة تُكوَّن من حروف العجلة بعددها', () => {
    const c = letterCounts('كتبرسنلدم');
    expect(canFormFrom('مكتب', c)).toBe(true);
    expect(canFormFrom('ممم', c)).toBe(false);
  });
});

describe('mergeWheel', () => {
  const base = DEFAULT_CATALOG[0];
  it('تعديل المعلم يغلب، والقيمة الفارغة لا تمحو الافتراضية', () => {
    const m = mergeWheel(base, { valid_words: [], center_letter: 'ت', outer_letters: null, time_seconds: null });
    expect(m.valid_words).toEqual(base.valid_words);
    expect(m.center).toBe('ت');
    expect(m.letters).toEqual(base.letters);
    expect(mergeWheel(base, null)).toBe(base);
  });
});

describe('toPreviewWheel', () => {
  it('كل عجلات المرحلة الأولى الافتراضية صالحة للمعاينة', () => {
    for (const w of DEFAULT_CATALOG.filter(x => x.level === 1)) {
      const p = toPreviewWheel(w);
      expect(p).not.toBeNull();
      expect(p.words.length).toBeGreaterThanOrEqual(WHEEL_PREVIEW_TARGET);
      p.words.forEach(word => expect(word.includes(p.center)).toBe(true));
    }
  });
  it('يستبعد كلمات لا تحوي الحرف الأوسط أو بحروف خارج العجلة', () => {
    const p = toPreviewWheel({ center: 'م', letters: ['ك', 'ت', 'ب', 'ر'], valid_words: ['مكتب', 'كتب', 'رمل', 'ترم', 'برم', 'برم'] });
    expect(p.words).toEqual(['مكتب', 'ترم', 'برم']);
  });
  it('يرفض عجلة كلماتها الصالحة أقل من الهدف', () => {
    expect(toPreviewWheel({ center: 'م', letters: ['ك', 'ت', 'ب', 'ر'], valid_words: ['مكتب'] })).toBeNull();
    expect(toPreviewWheel({ center: 'مم', letters: ['ك', 'ت', 'ب', 'ر'], valid_words: ['مكتب', 'ترم', 'برم'] })).toBeNull();
  });
});

describe('pickPreviewWheels', () => {
  it('يعيد عجلات المرحلة الأولى الخمس مع تعديلات المعلم', () => {
    const wheels = pickPreviewWheels([{ level: 1, wheel_index: 0, center_letter: 'م', outer_letters: null, valid_words: ['تمر', 'سمك', 'نمر'] }], () => 0);
    expect(wheels).toHaveLength(5);
    const edited = wheels.find(w => w.center === 'م');
    expect(edited.words).toEqual(['تمر', 'سمك', 'نمر']);
  });
});
