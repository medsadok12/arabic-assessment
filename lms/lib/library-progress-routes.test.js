import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ tables: {}, user: null, cookie: null, failures: new Set(), queries: [] }));
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => db.cookie ? { value: db.cookie } : undefined }) }));
vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: db.user } }) } }) }));
vi.mock('./supabase-admin', () => {
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.bounds = null; this.maximum = null; this.sort = null; this.one = false; }
    select() { return this; }
    eq(key, value) { this.filters.push(r => r[key] === value); return this; }
    like(key, value) {
      // SQL LIKE مع دعم الهروب كما في PostgREST.
      let pattern = '^';
      for (let i = 0; i < value.length; i++) {
        const c = value[i];
        if (c === '\\') pattern += value[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        else pattern += c === '%' ? '.*' : c === '_' ? '.' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      this.filters.push(r => new RegExp(pattern + '$').test(r[key] || '')); return this;
    }
    order(key) { this.sort = key; return this; }
    range(from, to) { this.bounds = [from, to + 1]; return this; }
    limit(n) { this.maximum = n; return this; }
    maybeSingle() { this.one = true; return this; }
    then(resolve, reject) {
      return Promise.resolve().then(() => {
        db.queries.push(this.table);
        if (db.failures.has(this.table)) return { data: null, error: { message: 'read failed' } };
        let data = (db.tables[this.table] || []).filter(r => this.filters.every(f => f(r)));
        if (this.sort) data = data.toSorted((a, b) => String(a[this.sort]).localeCompare(String(b[this.sort])));
        if (this.bounds) data = data.slice(...this.bounds);
        if (this.maximum !== null) data = data.slice(0, this.maximum);
        return { data: this.one ? data[0] || null : data, error: null };
      }).then(resolve, reject);
    }
  }
  return { createAdminClient: () => ({ from: table => new Query(table), auth: { admin: { getUserById: async id => ({ data: { user: { id, email: `${id}@test.local` } } }) } } }) };
});
const { GET } = await import('../app/api/library/progress/route');
const { freshDiscover } = await import('./discover-objects');
const request = child => new Request(`https://www.aarem.net/api/library/progress${child ? `?child=${child}` : ''}`);
const result = async child => { const r = await GET(request(child)); return { status: r.status, headers: r.headers, body: await r.json() }; };
const claim = (id, user = 'student') => ({ game_id: `discover_objects:completed:${user}:${id}`, settings: {} });
beforeEach(() => {
  db.user = { id: 'student', email: 'student@test.local', app_metadata: { role: 'student' }, user_metadata: {} };
  db.tables = { game_settings: [], huroof_progress: [], puzzles: [{ id: 'one', is_active: true }], puzzle_progress: [], students: [] };
  db.failures = new Set(); db.queries = []; db.cookie = null;
});
describe('API إنجاز المكتبة — قراءة فقط ومعزول لكل طفل', () => {
  it('بلا جلسة أو حساب معلق لا يكشف إنجازات؛ لا يثق بالدور الذي يعدّله المستخدم', async () => {
    db.user = null; expect((await result()).status).toBe(401); expect(db.queries).toEqual([]);
    db.user = { id: 'student', app_metadata: { role: 'student', status: 'suspended' } }; expect((await result()).status).toBe(401);
    db.user.app_metadata.status = 'active'; db.user.user_metadata = { role: 'admin' };
    expect((await result()).body.preview).toBeUndefined();
  });
  it.each(['teacher', 'admin', 'super_admin', 'supervisor'])('معاينة %s لا تقرأ ولا تكتب نتائج طلاب', async role => {
    db.user.app_metadata.role = role;
    expect((await result('other')).body).toEqual({ preview: true, progress: {} }); expect(db.queries).toEqual([]);
  });
  it('النتائج القديمة والمزورّة لا تكمل التدريب أو تفتح إنجازًا بلا دليل', async () => {
    db.tables.game_results = [{ user_id: 'student', game_id: 'discover_objects', category: 'garden-ball', correct: 999 }, { user_id: 'student', game_id: 'letter_catcher' }];
    db.tables.points_log = [{ user_id: 'student', reason: 'huroof_all_complete' }];
    const r = await result();
    expect(r.body.progress['discover-objects']).toMatchObject({ status: 'not-started', completed: 0, total: 48 });
    expect(r.body.progress.huroof.status).toBe('not-started');
    expect(r.body.progress['letter-catcher'].status).toBe('practiced');
    expect(r.headers.get('Cache-Control')).toContain('no-store');
  });
  it('يستعيد الإنجاز الموثوق دون تغيير البيانات أو النقاط، والإكمال يتطلب جميع الألغاز', async () => {
    db.tables.game_settings.push(claim('garden-ball'), claim('removed'), { game_id: 'discoverXobjects:completed:student:garden-book' });
    const before = structuredClone(db.tables);
    expect((await result()).body.progress['discover-objects']).toMatchObject({ completed: 1, status: 'in-progress' });
    expect(db.tables).toEqual(before);
    db.tables.game_settings.push(...freshDiscover().scenes.flatMap(s => s.rounds).filter(r => r.id !== 'garden-ball').map(r => claim(r.id)));
    expect((await result()).body.progress['discover-objects']).toMatchObject({ status: 'completed', total: 48, completed: 48 });
  });
  it('يطبّق ملكية العائلة وهوية التبويب؛ self يتجاوز كوكي طفل آخر', async () => {
    db.tables.students = [{ id: 'child-a', parent_user_id: 'student' }, { id: 'child-b', parent_user_id: 'student' }, { id: 'stranger', parent_user_id: 'other' }];
    db.tables.game_settings = [claim('garden-ball', 'child-a')];
    db.cookie = 'child-a';
    expect((await result()).body.progress['discover-objects'].completed).toBe(1);
    expect((await result('child-b')).body).toMatchObject({ identity: 'child-b', progress: { 'discover-objects': { completed: 0 } } });
    expect((await result('self')).body.identity).toBe('student');
    expect((await result('stranger')).body.identity).toBe('student');
    expect((await result('child-a')).body.progress['discover-objects'].completed).toBe(1);
  });
  it('الجولة الجديدة للحروف لا ترث شهادة الجولة القديمة', async () => {
    db.tables.game_settings = [{ game_id: 'huroof', settings: { epoch: 2 } }];
    db.tables.huroof_progress = Array.from({ length: 28 }, (_, idx) => ({ user_id: 'student', epoch: 1, idx }));
    expect((await result()).body.progress.huroof).toMatchObject({ completed: 0, total: 28 });
    db.tables.huroof_progress.push({ user_id: 'student', epoch: 2, idx: 0 });
    expect((await result()).body.progress.huroof.completed).toBe(1);
  });
  it('إخفاق مصدر لا يتحوّل إلى صفر إنجاز ولا يمنع المصادر السليمة', async () => {
    db.failures.add('huroof_progress');
    const r = await result(); expect(r.status).toBe(200);
    expect(r.body.progress.huroof.status).toBe('unknown');
    expect(r.body.progress['discover-objects'].status).toBe('not-started');
    db.failures.add('game_settings'); expect((await result()).body.progress['discover-objects'].status).toBe('unknown');
  });
  it('يتجاوز 1000 كلمة وأحجية دون إسقاط آخر سجل', async () => {
    db.tables.flashcard_progress = Array.from({ length: 1001 }, (_, n) => ({ user_id: 'student', word_id: `w${n}` }));
    db.tables.puzzles = Array.from({ length: 1001 }, (_, n) => ({ id: `p${n}`, is_active: true }));
    db.tables.puzzle_progress = db.tables.puzzles.map(p => ({ id: p.id, user_id: 'student', puzzle_id: p.id, completed_at: 'now' }));
    const r = await result(); expect(r.body.progress.flashcards.label).toBe('راجعت 1001 كلمة');
    expect(r.body.progress.puzzle).toMatchObject({ status: 'completed', total: 1001, completed: 1001 });
  });
});
