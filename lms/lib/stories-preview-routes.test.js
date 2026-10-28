import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ user: null, child: 'child-a', rows: [], error: false, calls: [], identity: [] }));
vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: db.user } }) } }) }));
vi.mock('./active-child', () => ({ resolveActiveIdentity: async (user, admin, req) => { db.identity.push(req.url); return { effectiveUserId: db.child }; } }));
vi.mock('./supabase-admin', () => ({ createAdminClient: () => ({ from: table => {
  const filters = []; let start = 0, end = 999;
  db.calls.push(table);
  return { select() { return this; }, eq(k, v) { filters.push(r => r[k] === v); return this; }, order() { return this; }, range(a, b) { start = a; end = b; return this; }, then(ok, fail) { return Promise.resolve(db.error ? { error: { message: 'unavailable' }, data: null } : { error: null, data: db.rows.filter(r => filters.every(fn => fn(r))).slice(start, end + 1) }).then(ok, fail); } };
} }) }));
const route = await import('../app/api/library/stories-preview/progress/route.js');
const get = async () => { const r = await route.GET(new Request('https://www.aarem.net/api/library/stories-preview/progress?child=child-a')); return { status: r.status, headers: r.headers, body: await r.json() }; };
beforeEach(() => { db.user = { id: 'parent', app_metadata: { role: 'student' } }; db.child = 'child-a'; db.rows = []; db.error = false; db.calls = []; db.identity = []; });
describe('معاينة القصص: قراءة خاصة بلا كتابة', () => {
  it('يرفض الزائر والحساب المعلّق دون قراءة قاعدة البيانات', async () => {
    db.user = null; expect((await get()).status).toBe(401);
    db.user = { id: 'x', app_metadata: { role: 'student', status: 'suspended' } };
    expect((await get()).status).toBe(401); expect(db.calls).toEqual([]);
  });
  it('معاينة المعلم لا تستعير نتائج طالب', async () => {
    db.user.app_metadata.role = 'teacher'; expect((await get()).body).toEqual({ completed: [], preview: true }); expect(db.calls).toEqual([]);
  });
  it('يعزل الطفل النشط ويرفض الخلط بنتائج أشقائه ويمنع التخزين المشترك', async () => {
    db.rows = [{ user_id: 'child-a', story_id: 'one' }, { user_id: 'child-a', story_id: 'one' }, { user_id: 'child-b', story_id: 'two' }];
    const result = await get(); expect(result.body).toEqual({ completed: ['one'] }); expect(db.identity[0]).toContain('child=child-a'); expect(result.headers.get('Cache-Control')).toContain('private, no-store');
  });
  it('لا يقطع السجل عند ألف قصة', async () => {
    db.rows = Array.from({ length: 1001 }, (_, i) => ({ user_id: 'child-a', story_id: `story-${i}` })); expect((await get()).body.completed).toHaveLength(1001); expect(db.calls).toHaveLength(2);
  });
  it('فشل القراءة لا يتحوّل إلى ادعاء بعدم قراءة القصص', async () => { db.error = true; const r = await get(); expect(r.status).toBe(503); expect(r.body.completed).toBeUndefined(); });
  it('لا توجد عمليات كتابة متاحة في المسار', () => { expect(Object.keys(route).sort()).toEqual(['GET', 'dynamic']); });
});
