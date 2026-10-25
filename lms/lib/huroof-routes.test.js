import { describe, it, expect, vi, beforeEach } from 'vitest';

/* تحدّي «الحروف الهجائية» — /api/huroof/progress و /api/huroof/settings و /api/huroof/[idx]
   بقاعدة وهمية في الذاكرة: الخادم يدقّق الإجابة بنفسه قبل تسجيل الحرف، النقاط مرة واحدة،
   وإعادة الضبط والإعدادات للمعلم/المدير وحدهما. */

const db = vi.hoisted(() => ({ tables: {}, user: null, child: null, seq: 0 }));

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined, getAll: () => [], set: () => {} }) }));
vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: db.user } }) } }) }));
vi.mock('./active-child', () => ({
  resolveActiveIdentity: async (user) => (db.child ? { effectiveUserId: db.child.id, viewingChild: db.child } : { effectiveUserId: user.id, viewingChild: null }),
}));
vi.mock('./supabase-admin', () => {
  class Q {
    constructor(name) { this.name = name; this.filters = []; this.op = 'select'; this.one = false; this.sort = null; this.after = false; }
    select() { if (this.op !== 'select') this.after = true; return this; }
    eq(c, v) { this.filters.push(r => r[c] === v); return this; }
    order(c, o = {}) { this.sort = [c, o.ascending !== false]; return this; }
    limit() { return this; }
    upsert(p, o = {}) { this.op = 'upsert'; this.payload = p; this.opts = o; return this; }
    insert(p) { this.op = 'insert'; this.payload = p; return this; }
    update(p) { this.op = 'update'; this.payload = p; return this; }
    delete() { this.op = 'delete'; return this; }
    maybeSingle() { this.one = true; return this; }
    single() { this.one = true; return this; }
    then(ok, fail) { return Promise.resolve(this.run()).then(ok, fail); }
    run() {
      const t = db.tables[this.name] || (db.tables[this.name] = []);
      const match = (r) => this.filters.every(f => f(r));
      if (this.op === 'insert') { t.push({ ...this.payload }); return { data: null, error: null }; }
      if (this.op === 'upsert') {
        const keys = (this.opts.onConflict ?? 'id').split(',');
        const cur = t.find(r => keys.every(k => r[k] === this.payload[k]));
        const row = { solved_at: new Date(Date.now() + (db.seq++)).toISOString(), ...this.payload };
        if (cur) { if (!this.opts.ignoreDuplicates) Object.assign(cur, this.payload); } else t.push(row);
        return { data: this.one ? { ...(cur || row) } : null, error: null };
      }
      if (this.op === 'update') {
        const rows = t.filter(match); rows.forEach(r => Object.assign(r, this.payload));
        return { data: this.one ? (rows[0] ? { ...rows[0] } : null) : rows, error: null };
      }
      if (this.op === 'delete') { db.tables[this.name] = t.filter(r => !match(r)); return { data: null, error: null }; }
      let rows = t.filter(match).map(r => ({ ...r }));
      if (this.sort) { const [c, asc] = this.sort; rows.sort((a, b) => (a[c] > b[c] ? 1 : -1) * (asc ? 1 : -1)); }
      return { data: this.one ? rows[0] || null : rows, error: null };
    }
  }
  return { createAdminClient: () => ({ from: (n) => new Q(n), storage: { from: () => ({ remove: async () => ({}) }) } }) };
});

const KID = 'f4db077e-8016-4abc-94b7-1f53e8b040b6';
const TEACHER = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const progress = await import('../app/api/huroof/progress/route.js');
const settingsRoute = await import('../app/api/huroof/settings/route.js');
const letterRoute = await import('../app/api/huroof/[idx]/route.js');
const listRoute = await import('../app/api/huroof/route.js');

const req = (path, body, method) => new Request(`https://www.aarem.net${path}`, body === undefined ? { method } : { method, body: JSON.stringify(body) });
const out = async (res) => ({ status: res.status, body: await res.json() });
const solve = (idx, answer, extra = {}) => progress.POST(req('/api/huroof/progress', { idx, answer, ...extra }, 'POST')).then(out);
const getProgress = (q = '') => progress.GET(req(`/api/huroof/progress${q}`, undefined, 'GET')).then(out);
const asKid = () => { db.user = { id: KID, email: 'kid@x.com', app_metadata: { role: 'student' }, user_metadata: { full_name: 'سارة' } }; };
const asTeacher = () => { db.user = { id: TEACHER, email: 't@x.com', app_metadata: { role: 'teacher' }, user_metadata: { full_name: 'أ. محمد' } }; };
const points = (uid = KID) => db.tables.user_points.find(r => r.user_id === uid)?.total ?? 0;

beforeEach(() => {
  asKid();
  db.child = null;
  db.tables = { huroof_letters: [], huroof_progress: [], game_settings: [], points_log: [], user_points: [{ user_id: KID, total: 100 }] };
});

describe('POST /api/huroof/progress — الخادم يدقّق الإجابة', () => {
  it('إجابة صحيحة ← يُسجَّل الحرف بمحاولاته وتُمنح نقطتاه', async () => {
    const r = await solve(0, 'أسد', { attempts: 2, hints: 1 });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, complete: false });
    expect(r.body.solved.map(s => s.idx)).toEqual([0]);
    expect(db.tables.huroof_progress[0]).toMatchObject({ user_id: KID, epoch: 0, idx: 0, attempts: 2, hints: 1, student_name: 'سارة' });
    expect(points()).toBe(102);
    expect(db.tables.points_log).toEqual([{ user_id: KID, delta: 2, reason: 'huroof_letter:0' }]);
  });

  it('خطأ إملائي ← لا تسجيل ولا نقاط، ورسالة فهيم نفسها', async () => {
    const r = await solve(0, 'اسد');
    expect(r.body.ok).toBe(false);
    expect(r.body.result).toMatchObject({ kind: 'hamza_missing', msg: 'أحسنت المحاولة، لكن لا تنسَ إضافة الهمزة: أَسَد!' });
    expect(db.tables.huroof_progress).toEqual([]);
    expect(points()).toBe(100);
  });

  it('حلّ الحرف مرة ثانية لا يمنح نقاطاً ولا يكرّر الصف', async () => {
    await solve(3, 'ثعلب');
    await solve(3, 'ثعلب');
    expect(db.tables.huroof_progress).toHaveLength(1);
    expect(points()).toBe(102);
  });

  it('يتبع إعدادات المعلم وتعديلاته: «ال» مرفوضة إن أطفأها، وإجابة جديدة للحرف', async () => {
    db.tables.game_settings.push({ game_id: 'huroof', settings: { accept_al: false } });
    expect((await solve(0, 'الأسد')).body.result.kind).toBe('al');
    db.tables.huroof_letters.push({ idx: 1, word: 'بَطَّةٌ' });
    expect((await solve(1, 'بيت')).body.ok).toBe(false);
    expect((await solve(1, 'بطة')).body.ok).toBe(true);
  });

  it('الحرف الثامن والعشرون ← اكتمال + نقاط الإكمال مرة واحدة', async () => {
    for (let i = 0; i < 27; i++) db.tables.huroof_progress.push({ user_id: KID, epoch: 0, idx: i, solved_at: `2026-10-25T00:00:${String(i).padStart(2, '0')}Z` });
    const r = await solve(27, 'يمامة');
    expect(r.body).toMatchObject({ ok: true, complete: true });
    expect(db.tables.points_log.map(p => p.reason)).toEqual(['huroof_letter:27', 'huroof_all_complete']);
  });

  it('الطفل النشط في حساب العائلة يُسجَّل باسمه هو', async () => {
    db.child = { id: 'c0c0c0c0-1111-4222-8333-444455556666', full_name: 'يوسف' };
    await solve(4, 'جمل');
    expect(db.tables.huroof_progress[0]).toMatchObject({ user_id: db.child.id, student_name: 'يوسف' });
  });

  it('مدخلات غير صالحة ← 400، وغير مسجل ← 401', async () => {
    expect((await solve(28, 'x')).status).toBe(400);
    expect((await solve(-1, 'x')).status).toBe(400);
    expect((await solve(0, 5)).status).toBe(400);
    expect((await solve(0, 'ا'.repeat(81))).status).toBe(400);
    db.user = null;
    expect((await solve(0, 'أسد')).status).toBe(401);
  });
});

describe('GET /api/huroof/progress', () => {
  it('مسار الطالب في الجولة الحالية فقط + بذرة الخلط', async () => {
    db.tables.huroof_progress.push(
      { user_id: KID, epoch: 0, idx: 5, solved_at: '2026-10-25T01:00:00Z' },
      { user_id: KID, epoch: 1, idx: 7, solved_at: '2026-10-25T02:00:00Z' },
    );
    db.tables.game_settings.push({ game_id: 'huroof', settings: { epoch: 1 } });
    const r = await getProgress();
    expect(r.body).toMatchObject({ epoch: 1, seed: `${KID}:1` });
    expect(r.body.solved.map(s => s.idx)).toEqual([7]);
  });

  it('قائمة الطلاب للمعلم فقط', async () => {
    db.tables.huroof_progress.push(
      { user_id: KID, epoch: 0, idx: 1, student_name: 'سارة', solved_at: '2026-10-25T01:00:00Z' },
      { user_id: KID, epoch: 0, idx: 2, student_name: 'سارة', solved_at: '2026-10-25T02:00:00Z' },
    );
    expect((await getProgress('?students=1')).status).toBe(403);
    asTeacher();
    const r = await getProgress('?students=1');
    expect(r.body.students).toEqual([{ user_id: KID, name: 'سارة', solved: 2, last_at: '2026-10-25T02:00:00Z' }]);
  });
});

describe('إعادة الضبط والإعدادات — للمعلم/المدير فقط', () => {
  it('الطالب لا يعيد ضبط شيء ولا يغيّر الإعدادات', async () => {
    expect((await progress.DELETE(req('/api/huroof/progress', { scope: 'me' }, 'DELETE'))).status).toBe(403);
    expect((await settingsRoute.PUT(req('/api/huroof/settings', { mode: 'explore' }, 'PUT'))).status).toBe(403);
    expect((await settingsRoute.POST(req('/api/huroof/settings', { action: 'reset_all' }, 'POST'))).status).toBe(403);
  });

  it('إعادة ضبط طالب واحد تحذف صفوفه في الجولة الحالية فقط', async () => {
    db.tables.huroof_progress.push({ user_id: KID, epoch: 0, idx: 1 }, { user_id: TEACHER, epoch: 0, idx: 1 });
    asTeacher();
    const r = await out(await progress.DELETE(req('/api/huroof/progress', { scope: 'user', user_id: KID }, 'DELETE')));
    expect(r.status).toBe(200);
    expect(db.tables.huroof_progress).toEqual([{ user_id: TEACHER, epoch: 0, idx: 1 }]);
    expect((await progress.DELETE(req('/api/huroof/progress', { scope: 'user', user_id: 'x' }, 'DELETE'))).status).toBe(400);
    await progress.DELETE(req('/api/huroof/progress', { scope: 'me' }, 'DELETE'));
    expect(db.tables.huroof_progress).toEqual([]);
  });

  it('حفظ الإعدادات يتحقق من القيم ولا يغيّر الجولة، و«إعادة ضبط الجميع» تزيدها', async () => {
    asTeacher();
    let r = await out(await settingsRoute.PUT(req('/api/huroof/settings', { mode: 'explore', show_path: false, epoch: 9 }, 'PUT')));
    expect(r.body.settings).toMatchObject({ mode: 'explore', show_path: false, epoch: 0 });
    expect((await settingsRoute.PUT(req('/api/huroof/settings', { reveal_after: 'x' }, 'PUT'))).status).toBe(400);
    r = await out(await settingsRoute.POST(req('/api/huroof/settings', { action: 'reset_all' }, 'POST')));
    expect(r.body.settings).toMatchObject({ epoch: 1, mode: 'explore' });
    const list = await out(await listRoute.GET());
    expect(list.body.settings).toMatchObject({ epoch: 1, mode: 'explore', show_path: false });
  });
});

describe('PUT /api/huroof/[idx] — اللغز والإملاء', () => {
  const put = (idx, body) => letterRoute.PUT(req(`/api/huroof/${idx}`, body, 'PUT'), { params: { idx: String(idx) } }).then(out);
  it('يحفظ لغز المعلم وإجابته وإجاباته المقبولة وقواعده', async () => {
    asTeacher();
    const r = await put(20, { riddle: 'من يقول مياو؟', accept: ['قط', 'بسة'], spell_rules: [{ wrong: 'كلب', msg: 'الكلب ينبح!' }] });
    expect(r.status).toBe(200);
    expect(r.body.row).toMatchObject({ idx: 20, riddle: 'من يقول مياو؟', accept: ['قط', 'بسة'], spell_rules: [{ wrong: 'كلب', msg: 'الكلب ينبح!' }] });
    asKid();
    expect((await solve(20, 'بسة')).body.ok).toBe(true);
    expect((await solve(19, 'حصان')).body.result.kind).toBe('custom');
  });
  it('قائمة فارغة [] تُحفظ («لا شيء») وتبقي الصف', async () => {
    asTeacher();
    const r = await put(20, { accept: [] });
    expect(r.body.row).toMatchObject({ accept: [] });
    asKid();
    expect((await solve(20, 'قط')).body.ok).toBe(false);
  });
  it('الطالب لا يعدّل الألغاز', async () => {
    expect((await put(0, { riddle: 'x' })).status).toBe(403);
  });
});
