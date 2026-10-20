import { describe, it, expect } from 'vitest';
import { issueHandoff, readHandoff, handoffDecision, HANDOFF_TTL_MS } from './login-handoff';

const S = 'test-secret';
const UID = 'f4db077e-8016-4abc-94b7-1f53e8b040b6';
const T0 = Date.parse('2026-10-20T10:00:00Z');

describe('تذكرة العبور', () => {
  it('تُقرأ كما صدرت', () => {
    const t = issueHandoff(UID, { now: T0, secret: S });
    expect(readHandoff(t, { now: T0 + 5_000, secret: S })).toEqual({ userId: UID, issuedAt: T0 });
  });
  it('تُرفض بعد ساعة، أو بتوقيع آخر، أو بعد العبث بها', () => {
    const t = issueHandoff(UID, { now: T0, secret: S });
    expect(readHandoff(t, { now: T0 + HANDOFF_TTL_MS + 1, secret: S })).toBeNull();
    expect(readHandoff(t, { now: T0, secret: 'other' })).toBeNull();
    const [p, sig] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ u: '00000000-0000-4000-8000-000000000000', t: T0 })).toString('base64url');
    expect(readHandoff(`${forged}.${sig}`, { now: T0, secret: S })).toBeNull();
    expect(readHandoff(`${p}.`, { now: T0, secret: S })).toBeNull();
    expect(readHandoff('garbage', { now: T0, secret: S })).toBeNull();
  });
  it('بلا مفتاح خادم لا تصدر ولا تُقبل', () => {
    expect(issueHandoff(UID, { now: T0, secret: '' })).toBeNull();
    expect(readHandoff(issueHandoff(UID, { now: T0, secret: S }), { now: T0, secret: '' })).toBeNull();
  });
});

describe('handoffDecision', () => {
  const student = (confirmed) => ({ app_metadata: { role: 'student' }, email_confirmed_at: confirmed });
  it('ينتظر حتى يتأكّد البريد', () => expect(handoffDecision(student(null), T0)).toBe('wait'));
  it('يفتح بعد التأكيد', () => expect(handoffDecision(student('2026-10-20T10:03:00Z'), T0)).toBe('open'));
  it('لا يفتح حساباً تأكّد قبل إصدار التذكرة', () => expect(handoffDecision(student('2026-07-07T08:00:00Z'), T0)).toBe('deny'));
  it('لا يفتح غير الطلاب', () => expect(handoffDecision({ app_metadata: { role: 'admin' }, email_confirmed_at: '2026-10-20T10:03:00Z' }, T0)).toBe('deny'));
  it('حساب غير موجود', () => expect(handoffDecision(null, T0)).toBe('deny'));
});
