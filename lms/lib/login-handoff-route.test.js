import { describe, it, expect, vi, beforeEach } from 'vitest';

/* /api/auth/handoff — صفحة «تحقق من بريدك» تُدخل الطالب وحدها فور تأكيد بريده */

const s = vi.hoisted(() => ({ account: null, verifyErr: null, links: [], verifies: [] }));
const UID = 'f4db077e-8016-4abc-94b7-1f53e8b040b6';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

vi.mock('next/headers', () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));
vi.mock('./ip-rate-check', () => ({ getClientIP: () => '1.1.1.1', ipRateCheck: async () => true }));
vi.mock('./supabase-admin', () => ({
  createAdminClient: () => ({
    auth: { admin: {
      getUserById: async () => ({ data: { user: s.account } }),
      generateLink: async (o) => { s.links.push(o); return { data: { properties: { hashed_token: 'magic-hash' } }, error: null }; },
    } },
  }),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { verifyOtp: async (o) => {
    s.verifies.push(o);
    return s.verifyErr ? { data: {}, error: { message: s.verifyErr } } : { data: { user: s.account }, error: null };
  } } }),
}));

const { POST } = await import('../app/api/auth/handoff/route.js');
const { issueHandoff } = await import('./login-handoff.js');
const call = async (token) => {
  const res = await POST(new Request('https://www.aarem.net/api/auth/handoff', { method: 'POST', body: JSON.stringify({ token }) }));
  return { status: res.status, body: await res.json() };
};
const student = (confirmed) => ({ id: UID, email: 'kid@x.com', app_metadata: { role: 'student' }, email_confirmed_at: confirmed });

beforeEach(() => { s.account = null; s.verifyErr = null; s.links = []; s.verifies = []; });

describe('POST /api/auth/handoff', () => {
  it('تذكرة مزوّرة ← 410 بلا أي نداء', async () => {
    const r = await call('fake.token');
    expect(r.status).toBe(410);
    expect(s.links).toHaveLength(0);
  });
  it('البريد لم يُؤكَّد ← ننتظر', async () => {
    s.account = student(null);
    const r = await call(issueHandoff(UID));
    expect(r.body).toEqual({ pending: true });
    expect(s.links).toHaveLength(0);
  });
  it('تأكّد ← تُفتح الجلسة على الخادم ويُوجَّه للوحة', async () => {
    s.account = student(new Date(Date.now() + 1000).toISOString());
    const r = await call(issueHandoff(UID));
    expect(r.body).toEqual({ ok: true, redirect: '/dashboard' });
    expect(s.links[0]).toEqual({ type: 'magiclink', email: 'kid@x.com' });
    expect(s.verifies[0]).toEqual({ type: 'magiclink', token_hash: 'magic-hash' });
  });
  it('حساب غير طالب ← 410', async () => {
    s.account = { ...student(new Date().toISOString()), app_metadata: { role: 'admin' } };
    expect((await call(issueHandoff(UID))).status).toBe(410);
    expect(s.links).toHaveLength(0);
  });
  it('خلل عابر في فتح الجلسة ← 503 وتبقى الصفحة تنتظر', async () => {
    s.account = student(new Date(Date.now() + 1000).toISOString());
    s.verifyErr = 'boom';
    const r = await call(issueHandoff(UID));
    expect(r.status).toBe(503);
    expect(r.body.pending).toBe(true);
  });
});
