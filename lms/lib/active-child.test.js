import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveActiveIdentity } from './active-child.js';

// resolveActiveIdentity يستدعي next/headers فقط في مسار الكوكي (لا يوجد req أو
// لا يحمل ?child=) — نموّه لنتحكم بالكوكي المُرجَع في كل اختبار على حدة.
// (vi.mock مُرفَّع تلقائياً فوق الاستيراد الساكن أعلاه بواسطة Vitest.)
const cookieStore = { value: null };
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name) => (name === 'active_child' && cookieStore.value ? { value: cookieStore.value } : undefined),
  }),
}));

const REAL_PARENT_ID = 'parent-real-uuid';
const REAL_PARENT_EMAIL = 'Parent@Example.com';

function makeUser() {
  return { id: REAL_PARENT_ID, email: REAL_PARENT_EMAIL };
}

/**
 * يبني عميل Supabase وهمياً يحاكي بدقة سلسلة الاستدعاءات الفعلية في
 * resolveActiveIdentity: from('students').select().eq('id', x).eq('parent_user_id', y).maybeSingle()
 * ويُسجّل كل الاستدعاءات كي نتحقق أن فلتر الملكية (parent_user_id) أُرسل فعلاً،
 * لا فقط أن النتيجة صحيحة.
 */
function makeAdmin({ childRow = null, childEmail = null } = {}) {
  const calls = { eq: [] };
  const builder = {
    select: () => builder,
    eq: (col, val) => { calls.eq.push([col, val]); return builder; },
    maybeSingle: async () => ({ data: childRow }),
  };
  return {
    _calls: calls,
    from: (table) => {
      if (table !== 'students') throw new Error(`جدول غير متوقع في هذا الاختبار: ${table}`);
      return builder;
    },
    auth: {
      admin: {
        getUserById: async (id) => {
          if (!childEmail) return { data: { user: null } };
          return { data: { user: { id, email: childEmail } } };
        },
      },
    },
  };
}

beforeEach(() => { cookieStore.value = null; });

describe('resolveActiveIdentity', () => {
  it('يرجع الحساب الحقيقي عند غياب أي child (لا رابط ولا كوكي)', async () => {
    const admin = makeAdmin();
    const result = await resolveActiveIdentity(makeUser(), admin, null);
    expect(result).toEqual({
      effectiveUserId: REAL_PARENT_ID,
      effectiveEmail: REAL_PARENT_EMAIL.toLowerCase(),
      viewingChild: null,
    });
  });

  it('?child=self يرجع الحساب الحقيقي فوراً ويتجاوز الكوكي تماماً حتى لو كان يحمل طفلاً آخر', async () => {
    cookieStore.value = 'some-other-child-id';
    const admin = makeAdmin();
    const req = { url: 'https://x.test/api/points?child=self' };
    const result = await resolveActiveIdentity(makeUser(), admin, req);
    expect(result.effectiveUserId).toBe(REAL_PARENT_ID);
    expect(result.viewingChild).toBeNull();
  });

  it('يرجع بيانات الطفل الصحيح عندما ينتمي فعلاً لهذا الوالد (عبر ?child=)', async () => {
    const childRow = { id: 'child-uuid-1', full_name: 'سارة', age: 8, grade: 3 };
    const admin = makeAdmin({ childRow, childEmail: 'sara-alias@example.com' });
    const req = { url: 'https://x.test/api/points?child=child-uuid-1' };

    const result = await resolveActiveIdentity(makeUser(), admin, req);

    expect(result).toEqual({
      effectiveUserId: 'child-uuid-1',
      effectiveEmail: 'sara-alias@example.com',
      viewingChild: childRow,
    });
    // تأكيد أن فلتر الملكية أُرسل فعلاً لقاعدة البيانات بالقيمة الصحيحة —
    // هذا هو الحارس الحقيقي ضد أي حذف مستقبلي سهو لسطر .eq('parent_user_id', ...)
    expect(admin._calls.eq).toContainEqual(['id', 'child-uuid-1']);
    expect(admin._calls.eq).toContainEqual(['parent_user_id', REAL_PARENT_ID]);
  });

  it('🔒 يرفض طلب طفل لا ينتمي للوالد النشط ويسقط تلقائياً للحساب الحقيقي (لا تسرّب بيانات)', async () => {
    // محاكاة أمينة لسلوك Supabase الفعلي: عندما لا يطابق الصف كلاً من
    // id وparent_user_id معاً (أي أن childId ملك عائلة أخرى)، الاستعلام
    // الحقيقي يُرجع null — هذا هو العقد الذي يحمي العزل بين العائلات.
    const admin = makeAdmin({ childRow: null });
    const req = { url: 'https://x.test/api/points?child=child-of-another-family' };

    const result = await resolveActiveIdentity(makeUser(), admin, req);

    expect(result.effectiveUserId).toBe(REAL_PARENT_ID);
    expect(result.effectiveEmail).toBe(REAL_PARENT_EMAIL.toLowerCase());
    expect(result.viewingChild).toBeNull();
    // ومع ذلك، فلتر الملكية أُرسل فعلاً بمعرّف الوالد الحقيقي لا معرّف مزوَّر
    expect(admin._calls.eq).toContainEqual(['parent_user_id', REAL_PARENT_ID]);
  });

  it('يسقط للحساب الحقيقي إن كان صف الطفل موجوداً لكن بلا حساب auth مطابق', async () => {
    const childRow = { id: 'child-uuid-2', full_name: 'يوسف', age: 6, grade: 1 };
    const admin = makeAdmin({ childRow, childEmail: null }); // getUserById لا يرجع مستخدماً
    const req = { url: 'https://x.test/api/points?child=child-uuid-2' };

    const result = await resolveActiveIdentity(makeUser(), admin, req);
    expect(result.effectiveUserId).toBe(REAL_PARENT_ID);
  });

  it('يستخدم كوكي active_child عندما لا يوجد ?child= في الرابط', async () => {
    cookieStore.value = 'child-uuid-3';
    const childRow = { id: 'child-uuid-3', full_name: 'خالد', age: 10, grade: 5 };
    const admin = makeAdmin({ childRow, childEmail: 'khaled-alias@example.com' });

    const result = await resolveActiveIdentity(makeUser(), admin, null);

    expect(result.effectiveUserId).toBe('child-uuid-3');
    expect(result.effectiveEmail).toBe('khaled-alias@example.com');
  });

  it('كوكي active_child بقيمة self يرجع الحساب الحقيقي', async () => {
    cookieStore.value = 'self';
    const admin = makeAdmin();
    const result = await resolveActiveIdentity(makeUser(), admin, null);
    expect(result.effectiveUserId).toBe(REAL_PARENT_ID);
  });
});
