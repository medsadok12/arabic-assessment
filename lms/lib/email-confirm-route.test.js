import { describe, it, expect, vi, beforeEach } from 'vitest';

/* /auth/confirm — رابط فُتح مرتين (حالة الأستاذ محمد 2026-10-20): المرة الأولى تؤكّد،
   والثانية لا تُظهر «فشل» بل توجّه للوحة أو للدخول بالبريد مكتوباً */

const s = vi.hoisted(() => ({ verify: null, current: null, account: null }));
const UID = 'f4db077e-8016-4abc-94b7-1f53e8b040b6';

vi.mock('next/headers', () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      verifyOtp: async () => s.verify,
      getUser: async () => ({ data: { user: s.current } }),
    },
  }),
}));
vi.mock('./supabase-admin', () => ({
  createAdminClient: () => ({ auth: { admin: { getUserById: async () => ({ data: { user: s.account } }) } } }),
}));

const { GET } = await import('../app/auth/confirm/route.js');
const go = async (qs) => (await GET(new Request(`https://www.aarem.net/auth/confirm?${qs}`))).headers.get('location');
const used = { data: { user: null }, error: { message: 'One-time token not found', code: 'otp_expired' } };

beforeEach(() => { s.verify = used; s.current = null; s.account = null; });

describe('GET /auth/confirm', () => {
  it('رابط صالح ← لوحة الطالب', async () => {
    s.verify = { data: { user: { id: UID, app_metadata: { role: 'student' } } }, error: null };
    expect(await go(`token_hash=t&type=signup&uid=${UID}`)).toBe('https://www.aarem.net/dashboard');
  });
  it('فُتح مرة ثانية وهذا المتصفح داخل بالحساب ← لوحته', async () => {
    s.current = { id: UID, email_confirmed_at: '2026-10-20', app_metadata: { role: 'student' } };
    expect(await go(`token_hash=t&type=signup&uid=${UID}`)).toBe('https://www.aarem.net/dashboard');
  });
  it('فُتح مرة ثانية في متصفح آخر ← الدخول والبريد مكتوب', async () => {
    s.account = { id: UID, email: 'mgandouzi99@gmail.com', email_confirmed_at: '2026-10-20', app_metadata: { role: 'student' } };
    expect(await go(`token_hash=t&type=signup&uid=${UID}`))
      .toBe('https://www.aarem.net/auth/login?confirmed=1&email=mgandouzi99%40gmail.com');
  });
  it('رابط منتهٍ لحساب لم يُؤكَّد ← صفحة طلب رابط جديد', async () => {
    s.account = { id: UID, email: 'kid@x.com', email_confirmed_at: null, app_metadata: { role: 'student' } };
    expect(await go(`token_hash=t&type=signup&uid=${UID}`))
      .toBe('https://www.aarem.net/auth/verify-email?email=kid%40x.com&reason=expired');
  });
  it('حساب غير طالب ← لا يُكشف بريده', async () => {
    s.account = { id: UID, email: 'admin@x.com', email_confirmed_at: '2026-01-01', app_metadata: { role: 'admin' } };
    expect(await go(`token_hash=t&type=signup&uid=${UID}`)).toBe('https://www.aarem.net/auth/login?error=confirmation_failed');
  });
  it('رابط قديم بلا معرّف ← رسالة واضحة كما كان', async () => {
    expect(await go('token_hash=t&type=signup')).toBe('https://www.aarem.net/auth/login?error=confirmation_failed');
  });
  it('متصفح داخل بحساب آخر لا يُعامَل كصاحب الرابط', async () => {
    s.current = { id: '00000000-0000-4000-8000-000000000000', email_confirmed_at: '2026-01-01', app_metadata: { role: 'admin' } };
    s.account = { id: UID, email: 'mgandouzi99@gmail.com', email_confirmed_at: '2026-10-20', app_metadata: { role: 'student' } };
    expect(await go(`token_hash=t&type=signup&uid=${UID}`))
      .toBe('https://www.aarem.net/auth/login?confirmed=1&email=mgandouzi99%40gmail.com');
  });
});
