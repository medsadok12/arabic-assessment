import { describe, it, expect } from 'vitest';
import { buildConfirmUrl, staleLinkRedirect, isUuid } from './email-confirm';

const UID = 'f4db077e-8016-4abc-94b7-1f53e8b040b6';

describe('buildConfirmUrl', () => {
  it('يضم الرمز والنوع ومعرّف الحساب', () => {
    const u = new URL(buildConfirmUrl('https://www.aarem.net', { hashedToken: 'a/b+c', type: 'signup', userId: UID }));
    expect(u.pathname).toBe('/auth/confirm');
    expect(u.searchParams.get('token_hash')).toBe('a/b+c');
    expect(u.searchParams.get('type')).toBe('signup');
    expect(u.searchParams.get('uid')).toBe(UID);
  });
  it('معرّف غير صالح لا يُضاف', () => {
    const u = new URL(buildConfirmUrl('https://www.aarem.net', { hashedToken: 't', type: 'magiclink', userId: 'x' }));
    expect(u.searchParams.has('uid')).toBe(false);
    expect(isUuid(UID)).toBe(true);
  });
});

describe('staleLinkRedirect', () => {
  const o = 'https://www.aarem.net';
  it('حساب مؤكَّد ← الدخول والبريد مكتوب', () => {
    expect(staleLinkRedirect(o, { email: 'a@b.com', email_confirmed_at: '2026-10-20' }))
      .toBe(`${o}/auth/login?confirmed=1&email=a%40b.com`);
  });
  it('حساب غير مؤكَّد ← طلب رابط جديد', () => {
    expect(staleLinkRedirect(o, { email: 'a@b.com', email_confirmed_at: null }))
      .toBe(`${o}/auth/verify-email?email=a%40b.com&reason=expired`);
  });
  it('رابط قديم بلا معرّف ← الدخول برسالة واضحة', () => {
    expect(staleLinkRedirect(o, null)).toBe(`${o}/auth/login?error=confirmation_failed`);
  });
});
