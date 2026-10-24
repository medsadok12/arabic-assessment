import { describe, it, expect, vi, beforeEach } from 'vitest';

/* استوديو الأبطال — /api/hero-config و /api/hero-config/shop بقاعدة وهمية في الذاكرة:
   السعر من الخادم فقط، لا حفظ لبطل يلبس قطعة لم تُشترَ، والمظهر يُنظَّف قبل الحفظ. */

const db = vi.hoisted(() => ({ tables: {}, user: null, rpcCalls: [] }));

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined, getAll: () => [], set: () => {} }) }));
vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: db.user } }) } }) }));
vi.mock('./active-child', () => ({ resolveActiveIdentity: async (user) => ({ effectiveUserId: user.id }) }));
vi.mock('./supabase-admin', () => {
  class Q {
    constructor(name) { this.name = name; this.filters = []; this.op = 'select'; this.payload = null; this.one = false; }
    select() { return this; }
    eq(c, v) { this.filters.push(r => r[c] === v); return this; }
    upsert(p) { this.op = 'upsert'; this.payload = p; return this; }
    maybeSingle() { this.one = true; return this; }
    then(ok, fail) { return Promise.resolve(this.run()).then(ok, fail); }
    run() {
      const t = db.tables[this.name] || (db.tables[this.name] = []);
      if (this.op === 'upsert') {
        const cur = t.find(r => r.user_id === this.payload.user_id);
        if (cur) Object.assign(cur, this.payload); else t.push({ ...this.payload });
        return { data: null, error: null };
      }
      const rows = t.filter(r => this.filters.every(f => f(r))).map(r => ({ ...r }));
      return { data: this.one ? rows[0] || null : rows, error: null };
    }
  }
  // نسخة JS من buy_hero_items لتثبيت ما يرسله المسار إليها
  const rpc = async (name, args) => {
    db.rpcCalls.push({ name, args });
    const pts = db.tables.user_points.find(r => r.user_id === args.p_user);
    const owned = db.tables.avatar_items.filter(r => r.user_id === args.p_user).map(r => r.item_id);
    const fresh = args.p_items.map((k, i) => [k, args.p_prices[i]]).filter(([k]) => !owned.includes(k));
    const total = fresh.reduce((s, [, p]) => s + p, 0);
    const points = pts?.total ?? 0;
    if (total > points) return { data: { ok: false, reason: 'insufficient', points, needed: total }, error: null };
    fresh.forEach(([k]) => db.tables.avatar_items.push({ user_id: args.p_user, item_id: k }));
    if (pts) pts.total -= total;
    return { data: { ok: true, points: points - total, charged: total, bought: fresh.map(([k]) => k) }, error: null };
  };
  return { createAdminClient: () => ({ from: (n) => new Q(n), rpc }) };
});

const KID = 'f4db077e-8016-4abc-94b7-1f53e8b040b6';
const cfgRoute = await import('../app/api/hero-config/route.js');
const shopRoute = await import('../app/api/hero-config/shop/route.js');
const { DEFAULT_LOOK } = await import('./hero-catalog.js');

const req = (path, body, method) => new Request(`https://www.aarem.net${path}`, body === undefined ? { method } : { method, body: JSON.stringify(body) });
const out = async (res) => ({ status: res.status, body: await res.json() });
const buy = (items) => shopRoute.POST(req('/api/hero-config/shop', { items }, 'POST')).then(out);
const save = (body) => cfgRoute.PATCH(req('/api/hero-config', body, 'PATCH')).then(out);
const get = () => cfgRoute.GET(req('/api/hero-config', undefined, 'GET')).then(out);

beforeEach(() => {
  db.user = { id: KID, email: 'kid@x.com', app_metadata: { role: 'student' } };
  db.rpcCalls = [];
  db.tables = {
    hero_config: [],
    avatar_items: [{ user_id: KID, item_id: 'astronaut' }],
    user_points: [{ user_id: KID, total: 1500 }],
  };
});

describe('GET /api/hero-config', () => {
  it('طالب جديد: لا بطل محفوظ بعد، ونقاطه ومشترياته تظهر', async () => {
    const r = await get();
    expect(r.body.look).toBeNull();
    expect(r.body.points).toBe(1500);
    expect(r.body.owned).toEqual(['astronaut']);
  });

  it('مظهر محفوظ تالف يُنظَّف قبل الإرسال', async () => {
    db.tables.hero_config.push({ user_id: KID, look: { top: 'space', skin: 77, head: 'ninja' }, preview_url: 'data:image/webp;base64,AA==' });
    const r = await get();
    expect(r.body.look).toEqual({ ...DEFAULT_LOOK, top: 'space' });
    expect(r.body.preview_url).toBe('data:image/webp;base64,AA==');
  });

  it('زائر غير مسجل يحصل على رد فارغ', async () => {
    db.user = null;
    expect((await get()).body).toMatchObject({ look: null, points: 0, owned: [] });
  });
});

describe('POST /api/hero-config/shop', () => {
  it('يشتري عدة قطع بسعر الكتالوج لا بسعر المتصفح', async () => {
    const r = await buy(['head:crown', 'back:bag']);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ success: true, points: 200, charged: 1300 });
    expect(db.rpcCalls[0].args).toEqual({ p_user: KID, p_items: ['head:crown', 'back:bag'], p_prices: [1000, 300] });
  });

  it('النجوم لا تكفي ← رسالة مشجعة بالمقدار الناقص ولا خصم', async () => {
    const r = await buy(['pet:faheem', 'head:astro']);
    expect(r.status).toBe(400);
    expect(r.body.error).toContain('600');
    expect(db.tables.user_points[0].total).toBe(1500);
  });

  it('يرفض القطع المجهولة والمجانية والقائمة الفارغة دون لمس قاعدة البيانات', async () => {
    for (const items of [['head:ninja'], ['top:tee'], [], 'head:crown', undefined]) {
      expect((await buy(items)).status).toBe(400);
    }
    expect(db.rpcCalls).toEqual([]);
  });

  it('غير مسجل ← 401', async () => {
    db.user = null;
    expect((await buy(['head:cap'])).status).toBe(401);
  });
});

describe('PATCH /api/hero-config', () => {
  it('لا يحفظ بطلاً يلبس قطعة لم تُشترَ', async () => {
    const r = await save({ look: { ...DEFAULT_LOOK, head: 'crown' } });
    expect(r.status).toBe(400);
    expect(r.body.unpaid).toEqual(['head:crown']);
    expect(db.tables.hero_config).toEqual([]);
  });

  it('يحفظ بعد الشراء، وينظف القيم الغريبة، ويقبل صورة مصغّرة صالحة فقط', async () => {
    await buy(['head:crown']);
    const r = await save({ look: { ...DEFAULT_LOOK, head: 'crown', skin: 3, hack: 1 }, preview_url: 'data:image/webp;base64,UklGRg==' });
    expect(r.status).toBe(200);
    const row = db.tables.hero_config[0];
    expect(row.look).toEqual({ ...DEFAULT_LOOK, head: 'crown', skin: 3 });
    expect(row.preview_url).toBe('data:image/webp;base64,UklGRg==');
    expect(row.avatar_id).toBe('studio3d');

    await save({ look: row.look, preview_url: 'https://evil.example/a.png' });
    expect(db.tables.hero_config[0].preview_url).toBe('data:image/webp;base64,UklGRg==');
  });

  it('البطل المجاني يُحفظ مباشرة بلا شراء', async () => {
    expect((await save({ look: { ...DEFAULT_LOOK, top: 'tee', hair: 'hijab', bottom: 'shorts' } })).status).toBe(200);
  });

  it('طلب بلا مظهر ← 400', async () => {
    expect((await save({})).status).toBe(400);
    expect((await save({ look: 'crown' })).status).toBe(400);
  });
});
