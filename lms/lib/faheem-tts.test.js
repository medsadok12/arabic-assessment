import { describe, it, expect, vi, beforeEach } from 'vitest';

/* صوت «فَهِيم»: Azure ← Gemini TTS ← Google Translate، وتخزين النصوص المشتركة */

const s = vi.hoisted(() => ({ user: { id: 'u1' }, calls: [], gemini: null, models: [], store: new Map() }));

vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: s.user } }) } }) }));
vi.mock('./supabase-admin', () => ({ createAdminClient: () => admin }));

const admin = {
  rpc: async () => ({ data: true }),
  storage: {
    from: () => ({
      download: async (p) => (s.store.has(p)
        ? { data: new Blob([s.store.get(p).buf], { type: s.store.get(p).type }), error: null }
        : { data: null, error: { message: 'not found' } }),
      upload: async (p, buf, o) => { s.store.set(p, { buf, type: o.contentType }); return { error: null }; },
    }),
  },
};

const T = await import('./faheem-tts.js');
const { GET } = await import('../app/api/faheem/tts/route.js');

const PCM = Buffer.from([1, 2, 3, 4, 5, 6]);
const reply = (status, body, type = 'application/json') => ({
  ok: status < 300, status,
  json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  arrayBuffer: async () => new TextEncoder().encode(typeof body === 'string' ? body : 'x').buffer, headers: { get: () => type },
});

beforeEach(() => {
  s.user = { id: 'u1' }; s.calls = []; s.store = new Map(); s.models = [];
  s.gemini = () => reply(200, { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: PCM.toString('base64') } }] } }] });
  T._resetGeminiTtsState();
  delete process.env.AZURE_SPEECH_KEY; delete process.env.GEMINI_TTS_MODEL; delete process.env.GEMINI_TTS_VOICE;
  process.env.GEMINI_API_KEY = 'g-test';
  globalThis.fetch = vi.fn(async (url, init = {}) => {
    const u = String(url);
    s.calls.push({ url: u, body: init.body ? (u.includes('microsoft') ? init.body : JSON.parse(init.body)) : null });
    if (u.includes('/v1beta/models?')) return reply(200, { models: s.models });
    if (u.includes(':generateContent')) return s.gemini(u);
    if (u.includes('microsoft.com')) return reply(200, 'AZURE');
    if (u.includes('translate.google.com')) return reply(200, 'G');
    return reply(404, {});
  });
});

const geminiCalls = () => s.calls.filter(c => c.url.includes(':generateContent'));
const googleCalls = () => s.calls.filter(c => c.url.includes('translate.google.com'));

describe('أدوات الصوت', () => {
  it('PCM ← WAV بترويسة صحيحة (24kHz، 16-bit، قناة واحدة)', () => {
    const wav = T.pcmToWav(PCM, 24000);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt32LE(24)).toBe(24000);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(PCM.length);
    expect(wav.length).toBe(44 + PCM.length);
  });
  it('التقسيم عند حدود الجمل والكلمات بلا ضياع حرف', () => {
    const text = 'فَهِيمٌ فِيلٌ صَغِيرٌ، يُحِبُّ الْقِصَصَ. '.repeat(12).trim();
    const parts = T.splitText(text, 190);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every(p => p.length <= 190)).toBe(true);
    expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(text.replace(/\s+/g, ' '));
  });
  it('مدة الاستبعاد: حصة يومية ساعة، حصة الدقيقة حسب الخادم، نموذج مفقود يوماً', () => {
    expect(T.blockMs(429, '"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"')).toBe(3600e3);
    expect(T.blockMs(429, '"retryDelay": "40s"')).toBe(40e3);
    expect(T.blockMs(404, '')).toBe(24 * 3600e3);
    expect(T.blockMs(500, '')).toBe(0);
  });
});

describe('اختيار الصوت', () => {
  it('بلا Azure ← Gemini بصوت بشري: AUDIO، الصوت Puck، تعليمات الأداء + النص', async () => {
    const out = await T.synthesize('أَهْلًا يَا بَطَل');
    expect(out.type).toBe('audio/wav');
    expect(out.buf.toString('ascii', 0, 4)).toBe('RIFF');
    const [g] = geminiCalls();
    expect(g.url).toContain('gemini-2.5-flash-preview-tts:generateContent');
    expect(g.body.generationConfig.responseModalities).toEqual(['AUDIO']);
    expect(g.body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Puck');
    expect(g.body.contents[0].parts[0].text).toMatch(/storyteller[\s\S]*\nأَهْلًا يَا بَطَل$/);
    expect(googleCalls()).toHaveLength(0);
  });
  it('نفدت حصة Gemini ← صوت Google احتياطاً، ولا يُعاد طرق Gemini في الطلب التالي', async () => {
    s.gemini = () => reply(429, '{"error":{"details":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}}');
    expect((await T.synthesize('نص')).type).toBe('audio/mpeg');
    expect(geminiCalls()).toHaveLength(1);
    await T.synthesize('نص آخر');
    expect(geminiCalls()).toHaveLength(1);
    expect(googleCalls()).toHaveLength(2);
  });
  it('النموذج الافتراضي مسحوب ← يُجرَّب نموذج TTS آخر يعلنه الحساب', async () => {
    s.models = [
      { name: 'models/gemini-9-flash-lite-tts', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-9-flash-tts', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-9-flash', supportedGenerationMethods: ['generateContent'] },
    ];
    s.gemini = (u) => (u.includes('2.5-flash-preview-tts') ? reply(404, 'not found') : s.ok());
    s.ok = () => reply(200, { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: PCM.toString('base64') } }] } }] });
    const out = await T.synthesize('نص');
    expect(out.type).toBe('audio/wav');
    expect(geminiCalls().map(c => c.url.split('/models/')[1].split(':')[0])).toEqual(['gemini-2.5-flash-preview-tts', 'gemini-9-flash-tts']);
  });
  it('مع مفتاح Azure ← Azure أولاً ولا يُطلب Gemini', async () => {
    process.env.AZURE_SPEECH_KEY = 'az';
    const out = await T.synthesize('مرحبا & <أهلاً>');
    expect(out.type).toBe('audio/mpeg');
    expect(geminiCalls()).toHaveLength(0);
    expect(s.calls[0].body).toContain('&amp; &lt;أهلاً&gt;');
  });
  it('Google الاحتياطي يقسم النص الطويل ويلصق المقاطع', async () => {
    delete process.env.GEMINI_API_KEY;
    const out = await T.synthesize('كَلِمَةٌ '.repeat(60));
    expect(googleCalls().length).toBeGreaterThan(1);
    expect(out.buf.toString()).toBe('G'.repeat(googleCalls().length));
  });
});

describe('تخزين النصوص المشتركة (كلمة اليوم)', () => {
  it('أول طالب يولّد الصوت ويُخزَّن، والتالي يُخدم من التخزين بلا طلب', async () => {
    await T.synthesize('قَمَرٌ', { admin, shared: true });
    expect(geminiCalls()).toHaveLength(1);
    expect(s.store.has(T.cachePath('قَمَرٌ'))).toBe(true);
    const again = await T.synthesize('قَمَرٌ', { admin, shared: true });
    expect(geminiCalls()).toHaveLength(1);
    expect(again.type).toBe('audio/wav');
  });
  it('الصوت الآلي الاحتياطي لا يُخزَّن، والرسائل الخاصة لا تُخزَّن', async () => {
    s.gemini = () => reply(503, 'busy');
    await T.synthesize('شَمْسٌ', { admin, shared: true });
    expect(s.store.size).toBe(0);
    s.gemini = () => reply(200, { candidates: [{ content: { parts: [{ inlineData: { data: PCM.toString('base64') } }] } }] });
    await T.synthesize('يَا سَارَة', { admin });
    expect(s.store.size).toBe(0);
  });
});

describe('GET /api/faheem/tts', () => {
  const get = (q) => GET(new Request(`https://www.aarem.net/api/faheem/tts?${q}`));
  it('غير مسجّل ← 401، وبلا نص ← 400', async () => {
    expect((await get('t=x')).status).toBe(200);
    expect((await get('t=')).status).toBe(400);
    s.user = null;
    expect((await get('t=x')).status).toBe(401);
  });
  it('يعيد نوع الملف الصحيح، يقصّ عند 700 حرف، ولا يُخزَّن إلا في متصفح الطفل', async () => {
    const res = await get(`t=${encodeURIComponent('ب'.repeat(900))}`);
    expect(res.headers.get('Content-Type')).toBe('audio/wav');
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=86400');
    expect(geminiCalls()[0].body.contents[0].parts[0].text.split('\n')[1]).toHaveLength(700);
  });
});
