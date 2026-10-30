import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ user: null, child: 'child-a', rows: [], error: false, calls: [], identity: [] }));
vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: db.user } }) } }) }));
vi.mock('./active-child', () => ({ resolveActiveIdentity: async (user, admin, req) => { db.identity.push(req.url); return { effectiveUserId: db.child }; } }));
vi.mock('./supabase-admin', () => ({ createAdminClient: () => ({ from: table => {
  const filters = []; let start = 0, end = 999, one = false;
  db.calls.push(table);
  return { maybeSingle() { one = true; return this; }, select() { return this; }, eq(k, v) { filters.push(r => r[k] === v); return this; }, order() { return this; }, range(a, b) { start = a; end = b; return this; }, then(ok, fail) { return Promise.resolve(db.error ? { error: { message: 'unavailable' }, data: null } : { error: null, data: one ? db.rows.find(r => filters.every(fn => fn(r))) || null : db.rows.filter(r => filters.every(fn => fn(r))).slice(start, end + 1) }).then(ok, fail); } };
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

const contentRoute = await import('../app/api/library/stories-preview/[id]/route.js');
const ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const content = async (id = ID) => { const r = await contentRoute.GET(new Request('https://www.aarem.net/api/library/stories-preview/' + id), { params: { id } }); return { status: r.status, body: await r.json() }; };
describe('قارئ المعاينة: نص منشور وتسجيلات المعلم فقط', () => {
  beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://preview.supabase.co'); db.rows = [{ id: ID, title: 'حكاية', status: 'published', content: '<p>أولًا</p><!-- PAGE --><p>ثانيًا</p>', page_audio: ['https://preview.supabase.co/storage/v1/object/public/media/stories/audio/page.mp3', 'https://outside.example/voice.mp3'], updated_at: '2026-10-28' }]; });
  it('يرفض الزائر والمعرّف غير الصالح', async () => { expect((await content('bad')).status).toBe(404); db.user = null; expect((await content()).status).toBe(401); });
  it('المسودة غير متاحة حتى في قارئ المعاينة', async () => { db.rows[0].status = 'draft'; expect((await content()).status).toBe(404); });
  it('يعيد الصفحات بالترتيب ولا يضيف صوتًا غير موجود أو مصدرًا آخر', async () => { const r = await content(); expect(r.status).toBe(200); expect(r.body.story.pages).toEqual(['<p>أولًا</p>', '<p>ثانيًا</p>']); expect(r.body.story.audio[0]).toContain('stories/audio/page.mp3'); expect(r.body.story.audio[1]).toBeNull(); });
  it('تعديل المحتوى يغيّر بصمة علامة الكتاب حتى لو لم يتغير تاريخ التعديل', async () => { const a = await content(); db.rows[0].content += '<p>نص إضافي</p>'; const b = await content(); expect(b.body.story.version).not.toBe(a.body.story.version); });
  it('الفشل واضح ولا يعيد نصًا مفترضًا', async () => { db.error = true; expect((await content()).status).toBe(503); });
  it('لا تصدير لمسار كتابة أو إكمال', () => { expect(Object.keys(contentRoute).sort()).toEqual(['GET', 'dynamic']); });
});
