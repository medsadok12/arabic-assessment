import { describe, it, expect, vi, beforeEach } from 'vitest';
import { freshDiscover, DEFAULT_DISCOVER } from './discover-objects';
const db = vi.hoisted(() => ({ user: null, rows: {}, child: null, awards: [], failRead: false, conflict: false, uploads: [] }));
vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: db.user } }) } }) }));
vi.mock('./active-child', () => ({ resolveActiveIdentity: async user => ({ effectiveUserId: db.child || user.id }) }));
vi.mock('./points-server', () => ({ awardPoints: async (_, id, reason, amount) => { if (db.conflict) return { conflict: true }; db.awards.push({ id, reason, amount }); return { success: true }; } }));
vi.mock('./supabase-admin', () => {
  class Q {
    constructor(table) { this.table = table; this.op = 'read'; this.filters = []; this.one = false; }
    select() { return this; }
    eq(k, v) { this.filters.push(r => r[k] === v); return this; }
    like(k, v) { const prefix = v.slice(0, -1).replace(/\\(.)/g, '$1'); this.filters.push(r => typeof r[k] === 'string' && r[k].startsWith(prefix)); return this; }
    order(k) { this.sortBy = k; return this; }
    range(a, b) { this.slice = [a, b + 1]; return this; }
    maybeSingle() { this.one = true; return this; }
    single() { this.one = true; return this; }
    insert(p) { this.op = 'insert'; this.payload = p; return this; }
    update(p) { this.op = 'update'; this.payload = p; return this; }
    delete() { this.op = 'delete'; return this; }
    then(ok, fail) { return Promise.resolve(this.run()).then(ok, fail); }
    run() {
      const rows = db.rows[this.table] || (db.rows[this.table] = []);
      if (db.failRead && this.op === 'read') return { error: { code: '503' } };
      let matches = rows.filter(r => this.filters.every(f => f(r)));
      if (this.op === 'insert') {
        const key = this.table === 'game_settings' ? 'game_id' : 'id';
        if (this.payload[key] && rows.some(r => r[key] === this.payload[key])) return { error: { code: '23505' } };
        rows.push(structuredClone(this.payload)); matches = [this.payload];
      }
      if (this.op === 'update') matches.forEach(r => Object.assign(r, structuredClone(this.payload)));
      if (this.op === 'delete') db.rows[this.table] = rows.filter(r => !matches.includes(r));
      if (this.op === 'read') { if (this.sortBy) matches.sort((a, b) => a[this.sortBy].localeCompare(b[this.sortBy])); if (this.slice) matches = matches.slice(...this.slice); }
      return { error: null, data: this.one ? matches[0] || null : matches };
    }
  }
  return { createAdminClient: () => ({ from: name => new Q(name), storage: { from: bucket => ({ upload: async (path, bytes, options) => { db.uploads.push({ bucket, path, bytes, options }); return { error: null }; } }) } }) };
});
const configRoute = await import('../app/api/discover-objects/route.js');
const completeRoute = await import('../app/api/discover-objects/complete/route.js');
const uploadRoute = await import('../app/api/discover-objects/upload/route.js');
const progressRoute = await import('../app/api/discover-objects/progress/route.js');
const request = (body, method = 'POST') => new Request('https://www.aarem.net/api/discover-objects', { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
const out = async r => ({ status: r.status, body: await r.json() });
const teacher = () => { db.user.app_metadata.role = 'teacher'; };
const answer = () => ({ roundId: 'garden-ball', found: 'ball', word: 'كرة', sentence: 0, version: null });
beforeEach(() => { db.user = { id: 'student-1', app_metadata: { role: 'student' }, user_metadata: {} }; db.rows = { game_settings: [{ game_id: 'huroof', settings: { untouched: true }, updated_at: 'old' }] }; db.child = null; db.awards = []; db.failRead = false; db.conflict = false; db.uploads = []; });

describe('أكتشف الأشياء — صلاحيات وحفظ مستقل', () => {
  it('صف قديم محفوظ: تصل المشاهد الجديدة دون الكتابة فوق بيانات المعلم', async () => {
    const old = structuredClone(DEFAULT_DISCOVER);
    old.scenes[0].rounds[0].wordAudio = '/teacher-word.mp3'; old.title = 'عنوان خاص';
    db.rows.game_settings.push({ game_id: 'discover_objects', settings: old, updated_at: 'v-old' });
    const before = structuredClone(db.rows);
    const r = await out(await configRoute.GET());
    expect(r.body.config.scenes).toHaveLength(10);
    expect(r.body.config.scenes[0]).toEqual(old.scenes[0]);
    expect(r.body.config.title).toBe('عنوان خاص'); expect(r.body.version).toBe('v-old');
    expect(db.rows).toEqual(before);
    teacher(); const config = r.body.config; config.scenes = config.scenes.filter(s => s.id !== 'bedroom');
    expect((await configRoute.PUT(request({ config, version: 'v-old' }, 'PUT'))).status).toBe(200);
    expect((await out(await configRoute.GET())).body.config.scenes.some(s => s.id === 'bedroom')).toBe(false);
  });
  it('القراءة مسجّلة وبلا كاش، والافتراضي فقط عند غياب الصف', async () => {
    let r = await configRoute.GET(); expect(r.headers.get('Cache-Control')).toContain('no-store');
    expect((await r.json()).config.title).toBe('أكتشف الأشياء');
    db.failRead = true; expect((await configRoute.GET()).status).toBe(503);
    db.user = null; expect((await configRoute.GET()).status).toBe(401);
  });
  it('الطالب لا يكتب حتى لو زوّر user_metadata؛ الحساب المعلّق لا يدخل', async () => {
    db.user.user_metadata.role = 'super_admin';
    expect((await configRoute.PUT(request({ config: freshDiscover(), version: null }, 'PUT'))).status).toBe(403);
    db.user.app_metadata.status = 'suspended'; expect((await configRoute.GET()).status).toBe(401);
  });
  it.each(['teacher', 'admin', 'super_admin'])('الدور %s يحفظ صف اللعبة فقط وتصل تعديلاته حيّة', async role => {
    db.user.app_metadata.role = role; const config = freshDiscover(); config.title = 'عنوان المعلم';
    const saved = await out(await configRoute.PUT(request({ config, version: null }, 'PUT')));
    expect(saved.status).toBe(200); expect(db.rows.game_settings.find(x => x.game_id === 'huroof')).toEqual({ game_id: 'huroof', settings: { untouched: true }, updated_at: 'old' });
    expect((await out(await configRoute.GET())).body.config.title).toBe('عنوان المعلم');
  });
  it('حفظ متعارض أو مدخل غير صالح لا يمحو تعديل زميل آخر', async () => {
    teacher(); const config = freshDiscover();
    await configRoute.PUT(request({ config, version: null }, 'PUT'));
    expect((await configRoute.PUT(request({ config, version: null }, 'PUT'))).status).toBe(409);
    expect((await configRoute.PUT(request({ config, version: 'stale' }, 'PUT'))).status).toBe(409);
    config.scenes[0].rounds[0].target = 'missing';
    expect((await configRoute.PUT(request({ config, version: null }, 'PUT'))).status).toBe(400);
  });
  it('يحفظ صوت الكلمة والدليل والموسيقى مستقلة دون تغيير النصوص والمواضع', async () => {
    teacher(); const config = freshDiscover();
    config.scenes[0].rounds[0].wordAudio = 'https://media.test/word.mp3';
    config.scenes[0].rounds[0].audio = 'https://media.test/clue.mp3';
    config.sounds = { ...config.sounds, background: 'clouds', success: 'bell', backgroundVolume: .12, wordVolume: .9 };
    expect((await configRoute.PUT(request({ config, version: null }, 'PUT'))).status).toBe(200);
    const r = await out(await configRoute.GET());
    expect(r.body.config.sounds).toEqual(config.sounds);
    expect(r.body.config.scenes).toEqual(config.scenes);
  });
});
describe('أكتشف الأشياء — نتيجة ونقاط مدقّقة على الخادم', () => {
  it('لا يمكن إرسال إجابة مشهد مقفل، ولو أرسل المتصفح الإجابة الصحيحة', async () => {
    const c = freshDiscover(), round = c.scenes[1].rounds[0];
    const body = { roundId: round.id, found: round.target, word: round.word, sentence: round.correct, version: null };
    expect((await completeRoute.POST(request(body))).status).toBe(403);
    expect(db.awards).toEqual([]);
    for (const r of c.scenes[0].rounds) expect((await completeRoute.POST(request({ roundId: r.id, found: r.target, word: r.word, sentence: r.correct, version: null }))).status).toBe(200);
    expect((await completeRoute.POST(request(body))).status).toBe(200);
  });
  it('المسار يُستعاد من إنجازات الخادم المعزولة لكل طفل؛ نتائج متصفح مزوّرة لا تفتح المشاهد', async () => {
    db.rows.game_results = [{ user_id: 'student-1', game_id: 'discover_objects', category: 'garden-ball' }];
    let r = await out(await progressRoute.GET(request(undefined, 'GET'))); expect(r.body.solved).toEqual([]);
    await completeRoute.POST(request(answer()));
    r = await out(await progressRoute.GET(request(undefined, 'GET'))); expect(r.body.solved).toEqual(['garden-ball']);
    expect(r.body.identity).toBe('student-1');
    db.child = 'sibling'; r = await out(await progressRoute.GET(request(undefined, 'GET'))); expect(r.body.solved).toEqual([]);
    db.child = null; r = await out(await progressRoute.GET(request(undefined, 'GET'))); expect(r.body.solved).toEqual(['garden-ball']);
  });
  it('فشل قراءة المسار لا يفتح المشاهد، ومعاينة المعلم لا تتطلب إنهاء المشاهد السابقة', async () => {
    db.failRead = true; expect((await progressRoute.GET(request(undefined, 'GET'))).status).toBe(503); db.failRead = false;
    teacher(); const r = freshDiscover().scenes[4].rounds[0];
    expect((await out(await completeRoute.POST(request({ roundId: r.id, found: r.target, word: r.word, sentence: r.correct, version: null })))).body.preview).toBe(true);
    expect((await out(await progressRoute.GET(request(undefined, 'GET')))).body.preview).toBe(true);
    expect(db.awards).toEqual([]);
  });
  it('الإجابة الخاطئة والنسخة القديمة لا تُحفظان ولا تمنحان نقاطًا', async () => {
    expect((await completeRoute.POST(request({ ...answer(), word: 'كتاب' }))).status).toBe(400);
    expect((await completeRoute.POST(request({ ...answer(), version: 'old' }))).status).toBe(409);
    expect(db.awards).toEqual([]); expect(db.rows.game_results || []).toEqual([]);
  });
  it('هوية الطفل النشط ومكافأة الخادم، لا مكافأة يرسلها المتصفح', async () => {
    db.child = 'child-2'; const r = await out(await completeRoute.POST(request({ ...answer(), points: 9999 })));
    expect(r.body).toMatchObject({ success: true, awarded: 3 });
    expect(db.awards).toEqual([{ id: 'child-2', reason: 'discover_objects:garden-ball', amount: 3 }]);
    expect(db.rows.game_results[0]).toMatchObject({ user_id: 'child-2', game_id: 'discover_objects', category: 'garden-ball' });
  });
  it('المطالبتان المتزامنتان تمنحان مكافأة واحدة؛ والطفل الآخر مستقل', async () => {
    const results = await Promise.all([completeRoute.POST(request(answer())), completeRoute.POST(request(answer()))]);
    expect(results.map(r => r.status)).toEqual([200, 200]); expect(db.awards).toHaveLength(1);
    db.child = 'another-child'; await completeRoute.POST(request(answer())); expect(db.awards).toHaveLength(2);
  });
  it('تجارب المعلم لا تكتب نتائج ولا تمسّ النقاط', async () => {
    teacher(); expect((await out(await completeRoute.POST(request(answer())))).body.preview).toBe(true);
    expect(db.awards).toEqual([]); expect(db.rows.game_results || []).toEqual([]);
  });
  it('التعارض المالي يُحرّر النتيجة لإعادة المحاولة دون ضياع النجوم', async () => {
    db.conflict = true; expect((await completeRoute.POST(request(answer()))).status).toBe(409);
    expect(db.rows.game_results || []).toEqual([]);
    expect(db.rows.game_settings.some(r => r.game_id.startsWith('discover_objects:completed:'))).toBe(false); db.conflict = false;
    expect((await out(await completeRoute.POST(request(answer())))).body.awarded).toBe(3);
  });
  it('إخفاء التدريب يمنع إرسال الطالب، مع بقاء معاينة المعلم', async () => {
    const config = freshDiscover(); config.enabled = false;
    db.rows.game_settings.push({ game_id: 'discover_objects', settings: config, updated_at: 'v1' });
    expect((await completeRoute.POST(request({ ...answer(), version: 'v1' }))).status).toBe(403);
    teacher(); expect((await completeRoute.POST(request({ ...answer(), version: 'v1' }))).status).toBe(200);
  });
});
describe('أكتشف الأشياء — الوسائط', () => {
  const upload = (bytes, type, name) => { const f = new FormData(); f.set('kind', 'image'); f.set('file', new Blob([new Uint8Array(bytes)], { type }), name); return uploadRoute.POST(new Request('https://www.aarem.net/api/discover-objects/upload', { method: 'POST', body: f })); };
  it('الرفع للطاقم وحده، ويرفض SVG أو صورة مزوّرة', async () => {
    expect((await upload([1, 2, 3], 'image/png', 'x.png')).status).toBe(403); teacher();
    expect((await upload([1, 2, 3], 'image/png', 'x.png')).status).toBe(400);
    expect((await upload([1, 2, 3], 'image/svg+xml', 'x.svg')).status).toBe(400);
    expect(db.uploads).toEqual([]);
  });
  it('ملف الصورة الصحيح يُرفع في مجلد التدريب فقط، لا base64 في الإعدادات', async () => {
    teacher(); expect((await upload([137, 80, 78, 71, 13, 10, 26, 10], 'image/png', 'x.png')).status).toBe(200);
    expect(db.uploads[0].path).toMatch(/^discover-objects\/image\//); expect(db.uploads[0].bucket).toBe('media');
  });
});
