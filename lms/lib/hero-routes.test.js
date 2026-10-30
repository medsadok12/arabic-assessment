import { describe, it, expect, vi, beforeEach } from 'vitest';

/* استوديو الأبطال — /api/hero-config و /api/hero-config/shop بقاعدة وهمية في الذاكرة:
   السعر من الخادم فقط، لا حفظ لبطل يلبس قطعة لم تُشترَ، والمظهر يُنظَّف قبل الحفظ. */

const db = vi.hoisted(() => ({ tables: {}, user: null, rpcCalls: [], stats: {} }));

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined, getAll: () => [], set: () => {} }) }));
vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: db.user } }) } }) }));
vi.mock('./active-child', () => ({ resolveActiveIdentity: async (user) => ({ effectiveUserId: user.id }) }));
vi.mock('./supabase-admin', () => {
  class Q {
    constructor(name) { this.name = name; this.filters = []; this.op = 'select'; this.payload = null; this.one = false; }
    select() { return this; }
    eq(c, v) { this.filters.push(r => r[c] === v); return this; }
    upsert(p, o = {}) { this.op = 'upsert'; this.payload = p; this.opts = o; return this; }
    maybeSingle() { this.one = true; return this; }
    then(ok, fail) { return Promise.resolve(this.run()).then(ok, fail); }
    run() {
      const t = db.tables[this.name] || (db.tables[this.name] = []);
      if (this.op === 'upsert') {
        const keys = (this.opts.onConflict ?? 'user_id').split(',');
        const cur = t.find(r => keys.every(k => r[k] === this.payload[k]));
        if (cur) { if (!this.opts.ignoreDuplicates) Object.assign(cur, this.payload); } else t.push({ ...this.payload });
        return { data: null, error: null };
      }
      const rows = t.filter(r => this.filters.every(f => f(r))).map(r => ({ ...r }));
      return { data: this.one ? rows[0] || null : rows, error: null };
    }
  }
  // نسخة JS من buy_hero_items لتثبيت ما يرسله المسار إليها
  const rpc = async (name, args) => {
    if (name === 'hero_stats') { db.statsArgs = args; return { data: db.stats, error: null }; }
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
const eggRoute = await import('../app/api/hero-config/egg/route.js');
const claimRoute = await import('../app/api/hero-config/claim/route.js');
const cat = await import('./hero-catalog.js');
const { DEFAULT_LOOK } = await import('./hero-catalog.js');

const req = (path, body, method) => new Request(`https://www.aarem.net${path}`, body === undefined ? { method } : { method, body: JSON.stringify(body) });
const out = async (res) => ({ status: res.status, body: await res.json() });
const buy = (items) => shopRoute.POST(req('/api/hero-config/shop', { items }, 'POST')).then(out);
const save = (body) => cfgRoute.PATCH(req('/api/hero-config', body, 'PATCH')).then(out);
const get = () => cfgRoute.GET(req('/api/hero-config', undefined, 'GET')).then(out);
const egg = (action) => eggRoute.POST(req('/api/hero-config/egg', { action }, 'POST')).then(out);
const claim = () => claimRoute.POST(req('/api/hero-config/claim', {}, 'POST')).then(out);

beforeEach(() => {
  db.user = { id: KID, email: 'kid@x.com', app_metadata: { role: 'student' } };
  db.rpcCalls = [];
  db.stats = { p: {}, letters: [], earned: 0 };
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

describe('التقدّم الحقيقي في GET', () => {
  it('المستوى والحروف والألقاب والقطع المكتسبة من hero_stats', async () => {
    db.stats = { p: { daily_login: { n: 9 }, letter_catcher: { sum: 300, ws: 20 } }, letters: [3, 0, 1, 2, 4, 99], earned: 2600 };
    const r = (await get()).body;
    expect(r.level).toBe(2);
    expect(r.letters).toEqual([0, 1, 2, 3, 4]);
    expect(r.achievements.sort()).toEqual(['catcher', 'letters5', 'loyal']);
    expect(r.owned).toContain('head:laurel');
    expect(r.egg).toMatchObject({ started: false, goal: cat.EGG_GOAL });
    expect(r.weekly).toMatchObject({ goal: expect.any(Number), claimed: false });
    expect(db.statsArgs.p_week).toBe(cat.weekStart().toISOString());
  });
});

describe('PATCH: القطع المكتسبة واللقب والبيضة', () => {
  it('الإكليل يُلبس بلا شراء لمن كسبه، ولا يُلبس لغيره', async () => {
    expect((await save({ look: { ...DEFAULT_LOOK, head: 'laurel' } })).status).toBe(400);
    db.stats = { p: { daily_login: { n: 7 } }, letters: [], earned: 0 };
    expect((await save({ look: { ...DEFAULT_LOOK, head: 'laurel' } })).status).toBe(200);
  });

  it('اللقب يُقبل فقط إن كان مكتسباً، وnull يزيله', async () => {
    expect((await save({ look: DEFAULT_LOOK, title: 'legend' })).status).toBe(400);
    expect((await save({ look: DEFAULT_LOOK, title: 'hacker' })).status).toBe(400);
    db.stats = { p: {}, letters: [0, 1, 2, 3, 4], earned: 0 };
    expect((await save({ look: DEFAULT_LOOK, title: 'letters5' })).status).toBe(200);
    expect(db.tables.hero_config[0].title).toBe('letters5');
    await save({ look: DEFAULT_LOOK, title: null });
    expect(db.tables.hero_config[0].title).toBeNull();
  });

  it('حفظ البطل مع البيضة يبدأ عدّها مرة واحدة', async () => {
    await save({ look: { ...DEFAULT_LOOK, pet: 'egg' } });
    const t0 = db.tables.hero_config[0].egg_started_at;
    expect(t0).toBeTruthy();
    await save({ look: { ...DEFAULT_LOOK, pet: 'egg' } });
    expect(db.tables.hero_config[0].egg_started_at).toBe(t0);
  });
});

describe('البيضة الغامضة', () => {
  it('start ثم hatch: لا فقس قبل اكتمال النجوم، وبعدها يُمنح التنين ويصير الرفيق', async () => {
    expect((await egg('hatch')).status).toBe(400);
    expect((await egg('start')).status).toBe(200);
    expect(db.tables.hero_config[0].look.pet).toBe('egg');
    db.stats = { p: { letter_catcher: { es: 20 } }, letters: [], earned: 20 };
    const early = await egg('hatch');
    expect(early.status).toBe(400);
    expect(early.body.error).toContain(String(cat.EGG_GOAL - 20));
    db.stats = { p: { letter_catcher: { es: 45 }, fc: { es: 30 } }, letters: [], earned: 75 };
    const r = await egg('hatch');
    expect(r.status).toBe(200);
    expect(db.tables.avatar_items.map(x => x.item_id).sort()).toEqual(['astronaut', 'pet:dragon']);
    expect(db.tables.hero_config[0].look.pet).toBe('dragon');
    expect(db.tables.hero_config[0].egg_started_at).toBeNull();
    expect((await egg('hatch')).status).toBe(409);
    expect((await save({ look: { ...DEFAULT_LOOK, pet: 'dragon' } })).status).toBe(200);
  });

  it('التنين لا يُلبس قبل الفقس، وطلب غريب يُرفض', async () => {
    expect((await save({ look: { ...DEFAULT_LOOK, pet: 'dragon' } })).status).toBe(400);
    expect((await egg('cheat')).status).toBe(400);
  });
});

describe('تحدّي الأسبوع والمواسم', () => {
  it('الجائزة لا تُستلم قبل الهدف، وتُمنح مرة واحدة بعده', async () => {
    const w = cat.weeklyOf();
    const p0 = Object.fromEntries(w.prefixes.map(k => [k, { ws: 1 }]));
    db.stats = { p: p0, letters: [], earned: 0 };
    expect((await claim()).status).toBe(400);
    db.stats = { p: { [w.prefixes[0]]: { ws: w.goal } }, letters: [], earned: 0 };
    expect((await claim()).status).toBe(200);
    expect(db.tables.avatar_items.filter(x => x.item_id === w.reward).length).toBe(1);
    expect((await claim()).body.already).toBe(true);
  });

  it('القطعة الموسمية خارج موسمها لا تُشترى', async () => {
    const off = cat.ITEMS.aura.find(it => it.season && !cat.seasonActive(it.season));
    const r = await buy([`aura:${off.id}`]);
    expect(r.status).toBe(400);
    expect(db.rpcCalls).toEqual([]);
  });
});
