import { describe, it, expect, vi, beforeEach } from 'vitest';

/* «فَهِيم»: المعرفة (هوية + دليل + كتالوج حي) ومسار /api/faheem بنموذجين */

const s = vi.hoisted(() => ({ created: [], claude: null, user: { id: 'u1' }, fetches: [], gemini: null, tables: {} }));

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
  class RateLimitError extends APIError {}
  class AuthenticationError extends APIError {}
  class APIConnectionTimeoutError extends Error {}
  class Anthropic {
    constructor(opts) { this.opts = opts; this.beta = { messages: { create: async (p) => { s.created.push({ opts, p }); return s.claude(p); } } }; }
  }
  Object.assign(Anthropic, { APIError, RateLimitError, AuthenticationError, APIConnectionTimeoutError });
  return { default: Anthropic };
});
vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: s.user } }) } }) }));
vi.mock('./supabase-admin', () => {
  const q = (name) => {
    const b = { select: () => b, eq: () => b, order: () => b, limit: () => b, then: (ok) => Promise.resolve({ data: s.tables[name] || [] }).then(ok) };
    return b;
  };
  return { createAdminClient: () => ({ rpc: async () => ({ data: true }), from: q }) };
});

const K = await import('./faheem-knowledge.js');
const { POST } = await import('../app/api/faheem/route.js');
const ask = async (body) => {
  const res = await POST(new Request('https://www.aarem.net/api/faheem', { method: 'POST', body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
};

beforeEach(() => {
  s.created = []; s.fetches = []; s.user = { id: 'u1' }; s.tables = {};
  s.claude = async () => ({ stop_reason: 'end_turn', model: 'claude-opus-5-5', content: [{ type: 'text', text: 'أَنَا فِيلٌ صَغِير 🐘' }], usage: {} });
  s.gemini = { ok: true, json: { candidates: [{ content: { parts: [{ text: 'رَدُّ جِيمِنَاي' }] } }] } };
  globalThis.fetch = vi.fn(async (url, init) => { s.fetches.push({ url, body: JSON.parse(init.body) }); return { ok: s.gemini.ok, status: s.gemini.ok ? 200 : 500, json: async () => s.gemini.json, text: async () => 'err' }; });
  K._resetCatalogCache();
  delete process.env.ANTHROPIC_API_KEY;
  process.env.GEMINI_API_KEY = 'g-test';
});

describe('معرفة فهيم', () => {
  it('هويته فيلٌ رمادي بنظارة — لا «ليس لي شكل»', () => {
    expect(K.FAHEEM_STATIC_PROMPT).toContain('ELEPHANT');
    expect(K.FAHEEM_STATIC_PROMPT).toContain('فِيلٌ صَغِيرٌ');
    expect(K.FAHEEM_STATIC_PROMPT).toContain('نَظَّارَةً');
    expect(K.FAHEEM_STATIC_PROMPT).toContain('PLATFORM GUIDE');
  });
  it('دليل المنصة يغطي كل أقسامها بأسمائها ونقاطها الفعلية', () => {
    const g = K.PLATFORM_GUIDE;
    for (const part of ['📚 المكتبة', '📊 تقدمي', '✨ استوديو الأبطال', 'مشهدٌ وحكاية', 'اسْتَمِعْ وَعَبِّرْ', 'أرسل لتقييم عملك',
      '🎡 عجلة الكلمات', '⚡ وضع التحدي', '🃏 بطاقات الحفظ', '🧩 الأحجية السحرية', '🎭 مسرح التعبير', '🌟 كلمة اليوم',
      '🧊 تجميد السلسلة', '📖 بنك الكلمات', '📅 تقويمي', '👤 الملف الشخصي', '🟢 سجّل حضورك', '➕ إضافة طفل']) {
      expect(g).toContain(part);
    }
    expect(g).toMatch(/مبتدئ \(0\)، ⚡ مستكشف \(1000\)، ⭐ بطل \(2000\)، 💎 محترف \(3000\)، 🚀 أسطورة/);
    expect(g).toContain('Daily login: +10');
    expect(g).toContain('+15 per homework');
    expect(g).toContain('+20 per class');
    expect(g).toContain('NO notification bell');
    expect(g).not.toMatch(/\/dashboard\/profile|\/assessment|ماذا لو|سلة الكلمات/);
    // قواعد الإعراب: المنصوب بعد «أَنْ» (الخطأ الذي لاحظه الأستاذ محمد: «أَنْ تَعْنِي»)
    expect(K.FAHEEM_STATIC_PROMPT).toContain('أَنْ تَعْنِيَ');
    expect(K.FAHEEM_STATIC_PROMPT).toContain("I'RAB CHECK");
  });
  it('القسم الثابت لا يتغيّر بين الطلبات (شرط التخزين المؤقت)، والمتغيّر يحمل الطالب والتاريخ', () => {
    expect(K.FAHEEM_STATIC_PROMPT).not.toMatch(/2026|Student name/);
    const girl = K.buildStudentContext({ studentName: 'سارة', studentGender: 'female', now: new Date('2026-10-21T10:00:00Z') });
    expect(girl).toContain('يَا سارة الْبَطَلَةُ');
    expect(girl).toContain('FEMALE');
    expect(girl).toContain('الأربعاء 21 أكتوبر 2026');
    expect(K.buildStudentContext({ studentName: 'يوسف' })).toContain('MALE');
    // الاسم الأول فقط، ويُكتب بحروف عربية إن كان لاتينياً
    const latin = K.buildStudentContext({ studentName: 'Mohamed Gandouzi' });
    expect(latin).toContain('«يَا Mohamed الْبَطَلُ»');
    expect(latin).toContain('Arabic letters with full harakat');
  });
  it('الكتالوج الحي: عناوين البطاقات المعدّلة والقصص المنشورة ومشاهد الجميع فقط', async () => {
    s.tables = {
      library_card_meta: [{ card_key: 'huroof', title: 'عالم الحروف', description: 'ابدأ من هنا' }],
      stories: [{ title: 'فهيم والقمر', level: 'مستوى 1' }],
      scenes: [{ title: 'يوم ممتع', publish_at: '2026-01-01T00:00:00Z' }, { title: 'لاحقاً', publish_at: '2099-01-01T00:00:00Z' }],
    };
    const a = { from: (n) => { const b = { select: () => b, eq: () => b, order: () => b, limit: () => b, then: (ok) => Promise.resolve({ data: s.tables[n] }).then(ok) }; return b; } };
    const text = await K.loadLiveCatalog(a, { force: true });
    expect(text).toContain('[huroof] «عالم الحروف» — ابدأ من هنا');
    expect(text).toContain('«فهيم والقمر» (مستوى 1)');
    expect(text).toContain('«يوم ممتع»');
    expect(text).not.toContain('لاحقاً');
  });
  it('الكتالوج يُخزَّن 5 دقائق ولا تُسقطه أعطال القاعدة', async () => {
    let calls = 0;
    const a = { from: () => { calls++; throw new Error('db down'); } };
    const t1 = await K.loadLiveCatalog(a, { now: 1_000 });
    await K.loadLiveCatalog(a, { now: 2_000 });
    expect(calls).toBe(3);
    expect(t1).toContain('none right now');
    await K.loadLiveCatalog(a, { now: 1_000 + 6 * 60 * 1000 });
    expect(calls).toBe(6);
  });
  it('سجل المحادثة: يبدأ بالطفل، يُدمج المتتالي، ويُختم بالسؤال الحالي', () => {
    const turns = K.toTurns([
      { role: 'ai', text: 'أهلاً! أنا فهيم' }, { role: 'user', text: 'سؤال 1' }, { role: 'ai', text: 'جواب 1' }, { role: 'user', text: '  ' },
    ], 'سؤال 2');
    expect(turns).toEqual([
      { role: 'user', content: 'سؤال 1' }, { role: 'assistant', content: 'جواب 1' }, { role: 'user', content: 'سؤال 2' },
    ]);
    expect(K.toTurns([], 'مرحبا')).toEqual([{ role: 'user', content: 'مرحبا' }]);
  });
});

describe('POST /api/faheem', () => {
  it('مع مفتاح Anthropic: Claude بجهد منخفض، احتياط الرفض، والقسم الثابت مخزَّن ومطابق بين طالبين', async () => {
    process.env.ANTHROPIC_API_KEY = 'a-test';
    const r1 = await ask({ message: 'أي حيوان أنت؟', studentName: 'سارة', studentGender: 'female', history: [] });
    await ask({ message: 'ما الألعاب؟', studentName: 'يوسف', history: [{ role: 'ai', text: 'أهلاً' }] });
    expect(r1.body.reply).toContain('فِيلٌ');
    const [a, b] = s.created;
    expect(a.p).toMatchObject({ model: 'claude-opus-5-5', betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default', output_config: { effort: 'low' } });
    expect(a.opts).toMatchObject({ apiKey: 'a-test', maxRetries: 0 });
    expect(a.p.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(a.p.system[0].text).toBe(b.p.system[0].text);
    expect(a.p.system[1].text).toContain('سارة');
    expect(b.p.system[1].text).toContain('يوسف');
    expect(b.p.messages).toEqual([{ role: 'user', content: 'ما الألعاب؟' }]);
    expect(a.p.thinking).toBeUndefined();
    expect(s.fetches).toHaveLength(0);
  });
  it('فشل Claude أو رفضه ← Gemini بنفس التعليمات وبحرارة منخفضة', async () => {
    process.env.ANTHROPIC_API_KEY = 'a-test';
    s.claude = async () => { throw new Error('boom'); };
    let r = await ask({ message: 'سؤال' });
    expect(r.body.reply).toBe('رَدُّ جِيمِنَاي');
    expect(s.fetches[0].url).toContain('gemini-2.5-flash');
    expect(s.fetches[0].body.systemInstruction.parts[0].text).toContain('ELEPHANT');
    expect(s.fetches[0].body.generationConfig.temperature).toBeLessThanOrEqual(0.3);
    s.claude = async () => ({ stop_reason: 'refusal', stop_details: { category: 'bio' }, content: [] });
    r = await ask({ message: 'سؤال' });
    expect(r.body.reply).toBe('رَدُّ جِيمِنَاي');
  });
  it('بلا مفتاح Anthropic ← Gemini مباشرة؛ وفشل الاثنين ← رسالة ودّية', async () => {
    let r = await ask({ message: 'سؤال' });
    expect(s.created).toHaveLength(0);
    expect(r.body.reply).toBe('رَدُّ جِيمِنَاي');
    s.gemini = { ok: false, json: {} };
    r = await ask({ message: 'سؤال' });
    expect(r.body.reply).toMatch(/أَعِدِ الْمُحَاوَلَةَ/);
  });
  it('غير مسجّل ← 401', async () => {
    s.user = null;
    expect((await ask({ message: 'سؤال' })).status).toBe(401);
  });
});
