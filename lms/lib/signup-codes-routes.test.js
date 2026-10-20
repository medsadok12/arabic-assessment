import { describe, it, expect, vi, beforeEach } from 'vitest';

/* مسارات التسجيل والتقييم مع مفتاح «هل يُطلب الكود؟» — قاعدة بيانات وهمية تسجّل
   كل عملية على جدولَي الأكواد، للتأكد من أن الإخفاء لا يمسّ الأكواد إطلاقاً، وأن
   التفعيل يعيد السلوك الأصلي كما هو (تحقق + استهلاك + تحرير عند التراجع). */

const state = vi.hoisted(() => ({ db: null, user: null, notify: [], emails: [] }));
const NEW_ID = 'f4db077e-8016-4abc-94b7-1f53e8b040b6';

function makeDb({ settings, settingsError = null, codeExists = true, consumeOk = true }) {
  const ops = [];
  const auth = {
    generateLink: vi.fn(async () => ({ data: { user: { id: NEW_ID }, properties: { hashed_token: 'tok' } }, error: null })),
    updateUserById: vi.fn(async () => ({ error: null })),
    deleteUser: vi.fn(async () => ({ error: null })),
  };
  const from = (table) => {
    const q = { table, steps: [] };
    const result = () => {
      const kind = q.steps.find(s => s[0] === 'update') ? 'update' : 'select';
      if (table === 'platform_settings') return { data: settings === undefined ? null : { value: settings }, error: settingsError };
      if (table === 'student_invitation_codes' || table === 'assessment_codes') {
        if (kind === 'select') return { data: codeExists ? { id: 'c1', is_used: false } : null, error: codeExists ? null : { code: 'PGRST116' } };
        const releasing = q.steps.find(s => s[0] === 'update')[1].is_used === false;
        return { data: releasing || consumeOk ? { id: 'c1' } : null, error: null };
      }
      return { data: null, error: null };
    };
    const b = {
      select: (...a) => { q.steps.push(['select', ...a]); return b; },
      update: (v) => { q.steps.push(['update', v]); ops.push(q); return b; },
      eq: (...a) => { q.steps.push(['eq', ...a]); return b; },
      maybeSingle: async () => { if (!ops.includes(q) && table !== 'platform_settings') ops.push(q); return result(); },
      single: async () => { if (!ops.includes(q)) ops.push(q); return result(); },
      then: (res, rej) => Promise.resolve(result()).then(res, rej),
    };
    return b;
  };
  return { from, auth: { admin: auth }, ops, codeOps: () => ops.filter(o => o.table !== 'platform_settings') };
}

vi.mock('./supabase-admin', () => ({ createAdminClient: () => state.db }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => state.db }));
vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }) }));
vi.mock('./ip-rate-check', () => ({ getClientIP: () => '1.1.1.1', ipRateCheck: async () => true }));
vi.mock('./notify', () => ({ notify: async (...a) => { state.notify.push(a); } }));
vi.mock('./email', () => ({
  sendVerificationEmail: async (m) => { if (state.failEmail) throw new Error('smtp down'); state.emails.push(m); },
}));

const { POST: register } = await import('../app/api/auth/register/route.js');
const { POST: completeGoogle } = await import('../app/api/auth/complete-google/route.js');
const { POST: validateCode } = await import('../app/api/public/validate-student-code/route.js');

const req = (body) => new Request('https://www.aarem.net/x', {
  method: 'POST', headers: { 'Content-Type': 'application/json', host: 'www.aarem.net' }, body: JSON.stringify(body),
});
const student = { name: 'سارة', email: 'Sara@Example.com', password: 'secret1', age: '9', grade: '3' };
const HIDDEN = { student_code_required: false, assessment_code_required: false };
const SHOWN  = { student_code_required: true,  assessment_code_required: true };

beforeEach(() => { state.notify = []; state.emails = []; state.failEmail = false; state.user = null; });

describe('POST /api/auth/register', () => {
  it('الكود مخفي: حساب بلا كود، ولا أي عملية على جدول الأكواد', async () => {
    state.db = makeDb({ settings: HIDDEN });
    const res = await register(req({ ...student, code: '' }));
    expect(res.status).toBe(200);
    expect(state.db.codeOps()).toHaveLength(0);
    expect(state.db.auth.admin.updateUserById).toHaveBeenCalledWith(NEW_ID, { app_metadata: { role: 'student' } });
    expect(state.emails).toHaveLength(1);
    // رابط التأكيد يحمل معرّف الحساب (لفتحه مرتين بلا «فشل»)
    const link = new URL(state.emails[0].link);
    expect(link.pathname).toBe('/auth/confirm');
    expect(link.searchParams.get('uid')).toBe(NEW_ID);
    expect(link.searchParams.get('type')).toBe('signup');
  });

  it('الكود ظاهر وغائب: رفض مع need_code، ولا حساب يُنشأ', async () => {
    state.db = makeDb({ settings: SHOWN });
    const res = await register(req({ ...student, code: '' }));
    expect(res.status).toBe(400);
    expect((await res.json()).need_code).toBe(true);
    expect(state.db.auth.admin.generateLink).not.toHaveBeenCalled();
  });

  it('الكود ظاهر وصحيح: التحقق ثم الاستهلاك كما كان', async () => {
    state.db = makeDb({ settings: SHOWN });
    const res = await register(req({ ...student, code: 'aarem-ab12' }));
    expect(res.status).toBe(200);
    const consumed = state.db.codeOps().find(o => o.steps.some(s => s[0] === 'update' && s[1].is_used === true));
    expect(consumed.steps).toContainEqual(['eq', 'code', 'AAREM-AB12']);
  });

  it('الكود ظاهر وفشل البريد: يُحذف الحساب ويُحرَّر الكود', async () => {
    state.db = makeDb({ settings: SHOWN });
    state.failEmail = true;
    const res = await register(req({ ...student, code: 'AAREM-AB12' }));
    expect(res.status).toBe(500);
    expect(state.db.auth.admin.deleteUser).toHaveBeenCalledWith(NEW_ID);
    expect(state.db.codeOps().some(o => o.steps.some(s => s[0] === 'update' && s[1].is_used === false))).toBe(true);
  });

  it('الكود مخفي وفشل البريد: يُحذف الحساب بلا أي عملية على الأكواد', async () => {
    state.db = makeDb({ settings: HIDDEN });
    state.failEmail = true;
    const res = await register(req({ ...student }));
    expect(res.status).toBe(500);
    expect(state.db.auth.admin.deleteUser).toHaveBeenCalledWith(NEW_ID);
    expect(state.db.codeOps()).toHaveLength(0);
  });

  it('تعذّر قراءة الإعداد: يعود السلوك الأصلي (الكود مطلوب)', async () => {
    state.db = makeDb({ settings: undefined, settingsError: { code: '42P01' } });
    const res = await register(req({ ...student }));
    expect(res.status).toBe(400);
    expect((await res.json()).need_code).toBe(true);
  });
});

describe('POST /api/auth/complete-google', () => {
  const googleUser = { id: 'g1', email: 'kid@gmail.com', app_metadata: {}, user_metadata: { full_name: 'Kid' } };

  it('الكود مخفي: يكتمل الحساب طالباً بلا كود', async () => {
    state.db = makeDb({ settings: HIDDEN });
    state.user = googleUser;
    const res = await completeGoogle(req({ code: '', age: '8' }));
    expect(res.status).toBe(200);
    expect(state.db.codeOps()).toHaveLength(0);
    expect(state.db.auth.admin.updateUserById.mock.calls[0][1].app_metadata.role).toBe('student');
  });

  it('الكود ظاهر وغائب: need_code ولا يُكتب دور', async () => {
    state.db = makeDb({ settings: SHOWN });
    state.user = googleUser;
    const res = await completeGoogle(req({ age: '8' }));
    expect(res.status).toBe(400);
    expect((await res.json()).need_code).toBe(true);
    expect(state.db.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it('الكود ظاهر وصحيح: يُستهلك ثم يُكتب الدور', async () => {
    state.db = makeDb({ settings: SHOWN });
    state.user = googleUser;
    const res = await completeGoogle(req({ code: 'aarem-x1', age: '8' }));
    expect(res.status).toBe(200);
    expect(state.db.codeOps()).toHaveLength(1);
    expect(state.db.auth.admin.updateUserById).toHaveBeenCalled();
  });
});

describe('POST /api/public/validate-student-code', () => {
  it('كود التقييم مخفي: يبدأ بلا كود ويصل إشعار البدء', async () => {
    state.db = makeDb({ settings: HIDDEN });
    const res = await validateCode(req({ code: '', name: 'سارة' }));
    expect(await res.json()).toEqual({ valid: true, code_required: false });
    expect(state.notify[0][2]).toContain('بلا كود');
    expect(state.db.codeOps()).toHaveLength(0);
  });

  it('كود التقييم ظاهر وغائب: need_code', async () => {
    state.db = makeDb({ settings: SHOWN });
    const res = await validateCode(req({ code: '', name: 'سارة' }));
    expect(res.status).toBe(400);
    expect((await res.json()).need_code).toBe(true);
  });

  it('كود مُرسَل: التحقق والاستهلاك كما كانا', async () => {
    state.db = makeDb({ settings: HIDDEN });
    const res = await validateCode(req({ code: 'eval-01', name: 'سارة' }));
    expect((await res.json()).valid).toBe(true);
    expect(state.db.codeOps().some(o => o.table === 'assessment_codes' && o.steps.some(s => s[0] === 'update'))).toBe(true);
  });
});
