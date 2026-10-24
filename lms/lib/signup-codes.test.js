import { describe, it, expect } from 'vitest';
import { normalizeSignupCodes, loadSignupCodes, DEFAULT_SIGNUP_CODES } from './signup-codes';

const fakeAdmin = (result) => ({
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => result }) }) }),
});

describe('normalizeSignupCodes', () => {
  it('القيم المنطقية تُحترم', () => {
    expect(normalizeSignupCodes({ student_code_required: false, assessment_code_required: true }))
      .toEqual({ student_code_required: false, assessment_code_required: true });
  });
  it('القيم الغريبة أو الناقصة تعود للافتراضي (الكود مطلوب)', () => {
    expect(normalizeSignupCodes({ student_code_required: 'no' })).toEqual(DEFAULT_SIGNUP_CODES);
    expect(normalizeSignupCodes(null)).toEqual(DEFAULT_SIGNUP_CODES);
  });
});

describe('loadSignupCodes', () => {
  it('يقرأ الصف المحفوظ', async () => {
    const s = await loadSignupCodes(fakeAdmin({ data: { value: { student_code_required: false, assessment_code_required: false } }, error: null }));
    expect(s).toEqual({ student_code_required: false, assessment_code_required: false });
  });
  it('غياب الصف أو خطأ القاعدة ← الكود مطلوب كما كان', async () => {
    expect(await loadSignupCodes(fakeAdmin({ data: null, error: null }))).toEqual(DEFAULT_SIGNUP_CODES);
    expect(await loadSignupCodes(fakeAdmin({ data: null, error: { code: '42P01' } }))).toEqual(DEFAULT_SIGNUP_CODES);
    expect(await loadSignupCodes({ from: () => { throw new Error('down'); } })).toEqual(DEFAULT_SIGNUP_CODES);
  });
});
