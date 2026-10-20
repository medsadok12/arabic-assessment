import { describe, it, expect, vi, beforeEach } from 'vitest';

/* «مشهدٌ وحكاية» — مسارات /api/scenes/* بقاعدة وهمية في الذاكرة:
   ردّ واحد لكل مشهد، لا تعديل بعد التقييم، نقاط بلا تكرار، وصلاحيات المعلم. */

const db = vi.hoisted(() => ({ tables: {}, user: null, removed: [], points: [], notes: [], seq: 0 }));

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined, getAll: () => [], set: () => {} }) }));
vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: db.user } }) } }) }));
vi.mock('./notify', () => ({ notifyUser: async (...a) => { db.notes.push(a); } }));
vi.mock('./points-server', () => ({ awardPoints: async (_admin, userId, reason, amount) => {
  if (db.points.some(p => p.reason === reason)) return { skipped: true };
  db.points.push({ userId, reason, amount });
  return { success: true };
} }));
vi.mock('./supabase-admin', () => {
  class Q {
    constructor(name) { this.name = name; this.filters = []; this.op = 'select'; this.payload = null; this.one = false; }
    select() { return this; }
    eq(c, v) { this.filters.push(r => r[c] === v); return this; }
    in(c, vs) { this.filters.push(r => vs.includes(r[c])); return this; }
    order() { return this; }
    limit() { return this; }
    insert(p) { this.op = 'insert'; this.payload = p; return this; }
    update(p) { this.op = 'update'; this.payload = p; return this; }
    delete() { this.op = 'delete'; return this; }
    maybeSingle() { this.one = true; return this; }
    single() { this.one = true; return this; }
    then(ok, fail) { return Promise.resolve(this.run()).then(ok, fail); }
    run() {
      const t = db.tables[this.name] || (db.tables[this.name] = []);
      let rows;
      if (this.op === 'insert') { const r = { id: `row-${++db.seq}`, status: 'submitted', ...this.payload }; t.push(r); rows = [r]; }
      else {
        rows = t.filter(r => this.filters.every(f => f(r)));
        if (this.op === 'update') rows.forEach(r => Object.assign(r, this.payload));
        if (this.op === 'delete') db.tables[this.name] = t.filter(r => !rows.includes(r));
      }
      const copy = rows.map(r => ({ ...r }));
      return { data: this.one ? copy[0] || null : copy, error: null };
    }
  }
  const bucket = (b) => ({
    remove: async (paths) => { db.removed.push(...paths.map(p => `${b}:${p}`)); return {}; },
    createSignedUrls: async (paths) => ({ data: paths.map(p => ({ path: p, signedUrl: `https://signed/${p}` })) }),
    createSignedUploadUrl: async (path) => ({ data: { signedUrl: `https://upload/${b}/${path}` }, error: null }),
  });
  return { createAdminClient: () => ({ from: (n) => new Q(n), storage: { from: bucket } }) };
});

const SCENE = '11111111-2222-4333-8444-555555555555';
const PRIVATE = '22222222-2222-4333-8444-555555555555';
const KID = 'f4db077e-8016-4abc-94b7-1f53e8b040b6';
const OTHER_KID = '0b0b0b0b-8016-4abc-94b7-1f53e8b040b6';
const T1 = 'aaaaaaaa-0000-4000-8000-000000000001';
const T2 = 'aaaaaaaa-0000-4000-8000-000000000002';
const ADMIN = 'aaaaaaaa-0000-4000-8000-0000000000ad';
const as = (id, role, email = `${id.slice(0, 4)}@x.com`) => ({ id, email, app_metadata: { role }, user_metadata: { grade: 4, full_name: 'سارة' } });
const kid = as(KID, 'student', 'kid@x.com');
const sceneRow = (over = {}) => ({
  id: SCENE, title: 'يومٌ على التلّة', image_url: 'https://x/scenes/image/1.webp', prompt: 'ماذا يحدث؟', prompt_audio_url: null,
  words: [{ w: 'فَرِحَ', gold: true }], tiles: [], starters: [], hotspots: [], what_if: [], feeling_q: null,
  modes: ['write', 'speak', 'photo'], band: 'auto', audience: 'all', is_active: true, publish_at: '2026-01-01T00:00:00Z',
  sort_order: 0, created_by: ADMIN, ...over,
});

const responseRoute = await import('../app/api/scenes/[id]/response/route.js');
const reviewRoute = await import('../app/api/scenes/responses/[id]/review/route.js');
const uploadRoute = await import('../app/api/scenes/upload-url/route.js');
const inboxRoute = await import('../app/api/scenes/inbox/route.js');
const listRoute = await import('../app/api/scenes/route.js');

const req = (path, body, method = 'PUT') => new Request(`https://www.aarem.net${path}`, body === undefined ? { method } : { method, body: JSON.stringify(body) });
const out = async (res) => ({ status: res.status, body: await res.json() });
const submit = (body, id = SCENE) => responseRoute.PUT(req(`/api/scenes/${id}/response`, body), { params: { id } }).then(out);
const review = (id, body) => reviewRoute.PUT(req(`/api/scenes/responses/${id}/review`, body), { params: { id } }).then(out);
const audioPath = (n) => `${KID}/${SCENE}/audio-17925000000${n}-abc12${n}.webm`;

beforeEach(() => {
  db.tables = {
    scenes: [sceneRow(), sceneRow({ id: PRIVATE, title: 'مشهد المعلم الثاني', audience: 'mine', created_by: T2 })],
    teacher_students: [{ teacher_id: T1, student_email: 'kid@x.com' }],
    scene_responses: [],
  };
  db.user = kid; db.removed = []; db.points = []; db.notes = []; db.seq = 0;
});

describe('PUT /api/scenes/[id]/response', () => {
  it('أول إرسال: يُحفظ الردّ + 15 نقطة مرة واحدة + إشعار المعلم ومنشئ المشهد', async () => {
    const r = await submit({ text: 'فرح فهيم بالطائرة', audio_path: audioPath(1), feeling: 'happy' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ first: true, points: 15 });
    expect(r.body.response).toMatchObject({ word_count: 3, gold_used: 1, status: 'submitted', student_name: 'سارة', audio_url: `https://signed/${audioPath(1)}` });
    expect(db.points).toEqual([{ userId: KID, reason: `scene_story:${SCENE}`, amount: 15 }]);
    expect(db.notes.map(n => n[0]).sort()).toEqual([ADMIN, T1].sort());
  });

  it('التعديل قبل التقييم: نفس الصف، بلا نقاط جديدة، والتسجيل القديم يُحذف', async () => {
    await submit({ text: 'نص أول', audio_path: audioPath(1) });
    const r = await submit({ text: 'نص معدَّل', audio_path: audioPath(2) });
    expect(r.body.first).toBe(false);
    expect(db.tables.scene_responses).toHaveLength(1);
    expect(db.points).toHaveLength(1);
    expect(db.notes).toHaveLength(2);
    expect(db.removed).toEqual([`student-work:${audioPath(1)}`]);
  });

  it('بعد التقييم ← 409 برسالة ودّية', async () => {
    await submit({ text: 'حكايتي' });
    db.tables.scene_responses[0].status = 'reviewed';
    const r = await submit({ text: 'تعديل' });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/قيّمها/);
  });

  it('ملف طالب آخر مرفوض', async () => {
    const r = await submit({ audio_path: `${OTHER_KID}/${SCENE}/audio-1792500000001-abc121.webm` });
    expect(r.status).toBe(400);
    expect(db.tables.scene_responses).toHaveLength(0);
  });

  it('مشهد معلم آخر لطلابه فقط ← 404', async () => {
    expect((await submit({ text: 'نص' }, PRIVATE)).status).toBe(404);
  });

  it('المعلم يعاين ولا يرسل ← 403', async () => {
    db.user = as(T1, 'teacher');
    expect((await submit({ text: 'نص' })).status).toBe(403);
  });
});

describe('PUT /api/scenes/responses/[id]/review', () => {
  const good = { idea: 3, words: 3, order: 3, stickers: ['brave'], comment: 'أحسنت' };
  const seed = async () => { await submit({ text: 'حكايتي' }); return db.tables.scene_responses[0].id; };

  it('معلم الطالب يقيّم: نجوم ← نقاط مرة واحدة + إشعار الطفل', async () => {
    const id = await seed();
    db.user = as(T1, 'teacher'); db.notes = [];
    const r = await review(id, good);
    expect(r.status).toBe(200);
    expect(r.body.response).toMatchObject({ status: 'reviewed', review: good, reviewed_by: T1 });
    expect(db.points.at(-1)).toEqual({ userId: KID, reason: `scene_review:${id}`, amount: 18 });
    expect(db.notes).toEqual([[KID, 'scene_review', '⭐ قرأ معلمك حكايتك!', '9 نجوم على «يومٌ على التلّة»', `/library/scenes/${SCENE}`]]);

    const again = await review(id, { ...good, idea: 1 });
    expect(again.status).toBe(200);
    expect(db.points.filter(p => p.reason.startsWith('scene_review'))).toHaveLength(1);
    expect(db.notes).toHaveLength(1);
  });

  it('معلم ليس معلم الطالب ولا صاحب المشهد ← 403', async () => {
    const id = await seed();
    db.user = as(T2, 'teacher');
    expect((await review(id, good)).status).toBe(403);
  });

  it('الإدارة تقيّم أي حكاية، والطالب لا يقيّم', async () => {
    const id = await seed();
    expect((await review(id, good)).status).toBe(403);
    db.user = as(ADMIN, 'admin');
    expect((await review(id, good)).status).toBe(200);
  });

  it('معيار ناقص ← 400', async () => {
    const id = await seed();
    db.user = as(T1, 'teacher');
    expect((await review(id, { idea: 2, words: 2 })).status).toBe(400);
  });
});

describe('POST /api/scenes/upload-url', () => {
  const up = (body) => uploadRoute.POST(req('/api/scenes/upload-url', body, 'POST')).then(out);

  it('الطالب يرفع لمجلده الخاص فقط', async () => {
    const r = await up({ kind: 'audio', type: 'audio/webm;codecs=opus', sceneId: SCENE });
    expect(r.status).toBe(200);
    expect(r.body.path).toMatch(new RegExp(`^${KID}/${SCENE}/audio-\\d+-[a-z0-9]{6}\\.webm$`));
    expect(r.body.contentType).toBe('audio/webm');
    expect(r.body.signedUrl).toContain('student-work');
  });
  it('الطالب لا يرفع صور المشاهد', async () => {
    expect((await up({ kind: 'image', type: 'image/webp' })).status).toBe(403);
  });
  it('المعلم يرفع صورة المشهد للدلو العام', async () => {
    db.user = as(T1, 'teacher');
    const r = await up({ kind: 'image', type: 'image/webp' });
    expect(r.status).toBe(200);
    expect(r.body.publicUrl).toMatch(/\/scenes\/image\/\d+-[a-z0-9]{6}\.webp$/);
  });
  it('نوع غير مدعوم ← 400', async () => {
    expect((await up({ kind: 'photo', type: 'image/gif', sceneId: SCENE })).status).toBe(400);
  });
});

describe('GET /api/scenes و /api/scenes/inbox', () => {
  it('الطالب يرى مشاهد الجميع ومشاهد معلمه فقط، مع حالة ردّه', async () => {
    await submit({ text: 'حكايتي' });
    const r = await out(await listRoute.GET(req('/api/scenes', undefined, 'GET')));
    expect(r.body.scenes.map(s => s.id)).toEqual([SCENE]);
    expect(r.body.scenes[0].mine).toMatchObject({ status: 'submitted', stars: null });
  });

  it('صندوق المعلم: ردود طلابه وردود مشاهده فقط', async () => {
    await submit({ text: 'حكاية سارة' });
    db.tables.scene_responses.push({ id: 'r-other', scene_id: SCENE, student_id: OTHER_KID, student_email: 'other@x.com', status: 'submitted', text: 'غريب' });
    db.tables.scene_responses.push({ id: 'r-own', scene_id: PRIVATE, student_id: OTHER_KID, student_email: 'other@x.com', status: 'submitted', text: 'لمشهدي' });

    db.user = as(T1, 'teacher');
    let r = await out(await inboxRoute.GET(req('/api/scenes/inbox', undefined, 'GET')));
    expect(r.body.responses.map(x => x.text)).toEqual(['حكاية سارة']);

    db.user = as(T2, 'teacher');
    r = await out(await inboxRoute.GET(req('/api/scenes/inbox', undefined, 'GET')));
    expect(r.body.responses.map(x => x.text)).toEqual(['لمشهدي']);

    db.user = as(ADMIN, 'admin');
    r = await out(await inboxRoute.GET(req('/api/scenes/inbox?status=submitted', undefined, 'GET')));
    expect(r.body.responses).toHaveLength(3);
  });
});
