import { describe, it, expect } from 'vitest';
import { stripDia, getLetterForm, toContextual, ZWJ } from './letter-forms.js';

describe('letter-forms', () => {
  it('يحذف التشكيل', () => { expect(stripDia('رُمَّان')).toBe('رمان'); });
  it('يحدد شكل الحرف داخل الكلمة', () => {
    expect(getLetterForm('عنب', 0)).toBe('initial');
    expect(getLetterForm('عنب', 1)).toBe('medial');
    expect(getLetterForm('عنب', 2)).toBe('final');
    expect(getLetterForm('رمان', 0)).toBe('isolated');   // الراء لا تتصل بما بعدها
    expect(getLetterForm('رمان', 3)).toBe('isolated');   // بعد الألف
    expect(getLetterForm('حمار وحشي', 4)).toBe('isolated'); // الراء قبل المسافة
  });
  it('يرسم الحرف بشكله عبر ZWJ', () => {
    expect(toContextual('عَ', 'initial')).toBe(`ع${ZWJ}`);
    expect(toContextual('ن', 'medial')).toBe(`${ZWJ}ن${ZWJ}`);
    expect(toContextual('ب', 'final')).toBe(`${ZWJ}ب`);
    expect(toContextual('ب', 'isolated')).toBe('ب');
  });
});
