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
  delete process.env.AZURE_SPEECH_KEY; delete process.env.AZURE_SPEECH_REGION;
  delete process.env.GEMINI_TTS_MODEL; delete process.env.GEMINI_TTS_VOICE;
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
    expect(g.body.contents[0].parts[0].text).toBe('Say in a warm, cheerful and friendly voice, stopping on a silent final letter at every pause:\nأَهْلًا يَا بَطَلْ');
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
  it('«Model tried to generate text» ← يُعاد على النموذج نفسه بصيغة أخرى، لا ينتقل لصوت آخر', async () => {
    s.models = [{ name: 'models/gemini-9-flash-tts', supportedGenerationMethods: ['generateContent'] }];
    const ok = s.gemini;
    let n = 0;
    s.gemini = (u) => (n++ === 0 ? reply(400, '{"error":{"message":"Model tried to generate text, but it should only be used for TTS."}}') : ok(u));
    const out = await T.synthesize('هَلْ تُرِيدُ أَنْ تَلْعَبَ؟');
    expect(out.type).toBe('audio/wav');
    const calls = geminiCalls();
    expect(calls).toHaveLength(2);
    expect(calls.every(c => c.url.includes('gemini-2.5-flash-preview-tts'))).toBe(true);
    expect(calls[1].body.contents[0].parts[0].text).toMatch(/^Read aloud exactly this transcript[\s\S]*\nهَلْ تُرِيدُ أَنْ تَلْعَبْ؟$/);
    expect(googleCalls()).toHaveLength(0);
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
  it('مفتاح ومنطقة لُصقا بفراغات أو سطر زائد في آخرهما ← يُنظَّفان ويعمل Azure', async () => {
    process.env.AZURE_SPEECH_KEY = ' az\n';
    process.env.AZURE_SPEECH_REGION = ' EastUS \n';
    const out = await T.synthesize('نص');
    expect(out.type).toBe('audio/mpeg');
    expect(s.calls[0].url).toBe('https://eastus.tts.speech.microsoft.com/cognitiveservices/v1');
    expect(globalThis.fetch.mock.calls[0][1].headers['Ocp-Apim-Subscription-Key']).toBe('az');
  });
  it('منطقة فيها سطران (المفتاح لُصق فيها بالخطأ) ← لا طلب لـ Azure، ولا تُطبع القيمة، ويكمل Gemini', async () => {
    process.env.AZURE_SPEECH_KEY = 'az';
    process.env.AZURE_SPEECH_REGION = 'SECRETKEY123\neastus';
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await T.synthesize('نص');
    expect(out.type).toBe('audio/wav');
    expect(s.calls.some(c => c.url.includes('microsoft'))).toBe(false);
    expect(err.mock.calls.flat().join(' ')).toContain('AZURE_SPEECH_REGION غير صالح');
    expect(err.mock.calls.flat().join(' ')).not.toContain('SECRETKEY123');
    err.mockRestore();
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
    expect(s.store.has(T.cachePath('قَمَرْ'))).toBe(true); // يُخزَّن بعد الوقف
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
  it('Azure متعثّر ومفتاحه موجود ← صوت Gemini البديل يُسمع ولا يُخزَّن باسم Azure', async () => {
    process.env.AZURE_SPEECH_KEY = 'az';
    process.env.AZURE_SPEECH_REGION = 'bad\nregion';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await T.synthesize('نَهْرٌ', { admin, shared: true });
    expect(out.type).toBe('audio/wav');
    expect(s.store.size).toBe(0);
    console.error.mockRestore();
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
  it('يعيد نوع الملف الصحيح، يقصّ عند 1200 حرف (جواب فهيم كله في طلب واحد)، ولا يُخزَّن إلا في متصفح الطفل', async () => {
    const res = await get(`t=${encodeURIComponent('ب'.repeat(1500))}`);
    expect(res.headers.get('Content-Type')).toBe('audio/wav');
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=86400');
    expect(geminiCalls()[0].body.contents[0].parts[0].text.split('\n')[1]).toBe(`${'ب'.repeat(1200)}\u0652`); // 1200 + سكون الوقف
  });
});

describe('صوت فهيم المعتمد وعيّنات الاختيار', async () => {
  const V = await import('./faheem-voices.js');
  const { GET: LAB } = await import('../app/api/faheem/voice-lab/route.js');
  const azureCalls = () => s.calls.filter(c => c.url.includes('microsoft'));

  it('كل الأصوات المرشّحة بأسماء Azure صالحة وطبقة وسرعة بصيغة SSML، والمعتمد منها', () => {
    expect(V.currentVoice()).toBeTruthy();
    expect(new Set(V.FAHEEM_VOICES.map(v => v.id)).size).toBe(V.FAHEEM_VOICES.length);
    for (const v of V.FAHEEM_VOICES) {
      expect(v.name).toMatch(/^ar-(SA|AE|QA|KW)-[A-Za-z]+Neural$/); // فصحى خليجية — لا مصرية ولا مغاربية
      expect(v.pitch).toMatch(/^[+-]\d{1,2}%$/);
      expect(v.rate).toMatch(/^[+-]\d{1,2}%$/);
    }
  });
  it('Azure يقرأ بصوت فهيم المعتمد وطبقته وسرعته', async () => {
    process.env.AZURE_SPEECH_KEY = 'az';
    await T.synthesize('نص');
    const v = V.currentVoice();
    expect(azureCalls()[0].body).toContain(`<voice name='${v.name}'>`);
    expect(azureCalls()[0].body).toContain(`<prosody rate='${v.rate}' pitch='${v.pitch}'>`);
  });
  it('لا صمت قبل الكلام، وصمت قصير بعده وبين الجمل — لا وقفة ثانية عند كل نقطة', async () => {
    process.env.AZURE_SPEECH_KEY = 'az';
    await T.synthesize('جُمْلَةٌ أُولَى. جُمْلَةٌ ثَانِيَةٌ.');
    const ssml = azureCalls()[0].body;
    expect(ssml).toContain("xmlns:mstts='http://www.w3.org/2001/mstts'");
    expect(ssml).toContain("<mstts:silence type='Leading-exact' value='0ms'/>");
    const ms = (type) => Number(ssml.match(new RegExp(`type='${type}' value='(\\d+)ms'`))[1]);
    expect(ms('Tailing-exact')).toBeLessThanOrEqual(200);
    expect(ms('Sentenceboundary-exact')).toBeLessThanOrEqual(300);
    // عناصر الصمت داخل <voice> قبل الكلام (شرط Azure)
    expect(ssml.indexOf('<mstts:silence')).toBeGreaterThan(ssml.indexOf('<voice'));
    expect(ssml.lastIndexOf('<mstts:silence')).toBeLessThan(ssml.indexOf('<prosody'));
  });
  it('إن رفض Azure إعدادات الصمت (400) يُعاد الطلب بدونها بصوت فهيم نفسه — لا Gemini', async () => {
    process.env.AZURE_SPEECH_KEY = 'az';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const base = globalThis.fetch.getMockImplementation();
    globalThis.fetch.mockImplementation(async (url, init = {}) => (
      String(url).includes('microsoft') && init.body.includes('mstts:silence')
        ? (s.calls.push({ url: String(url), body: init.body }), reply(400, 'bad ssml'))
        : base(url, init)));
    const out = await T.synthesize('نص');
    expect(out.type).toBe('audio/mpeg');
    expect(azureCalls()).toHaveLength(2);
    expect(azureCalls()[1].body).not.toContain('mstts:silence');
    expect(geminiCalls()).toHaveLength(0);
    console.error.mockRestore();
  });
  it('مسار تخزين كلمة اليوم يتبع الصوت وطبقته — تغيير الصوت لا يُخدم بعده الصوت القديم', async () => {
    process.env.AZURE_SPEECH_KEY = 'az';
    const a = T.cachePath('قَمَرْ');
    process.env.AZURE_SPEECH_VOICE = 'ar-SA-ZariyahNeural';
    const b = T.cachePath('قَمَرْ');
    delete process.env.AZURE_SPEECH_VOICE;
    expect(a).not.toBe(b);
  });
  it('العيّنة تُولَّد بصوتها هي (لا المعتمد) مرة واحدة ثم تُخدم من التخزين', async () => {
    process.env.AZURE_SPEECH_KEY = 'az';
    const z = V.voiceById('zariyah40');
    const out = await T.voiceSample('zariyah40', admin);
    expect(out.type).toBe('audio/mpeg');
    expect(azureCalls()[0].body).toContain(`<voice name='${z.name}'>`);
    expect(azureCalls()[0].body).toContain(`<prosody rate='${z.rate}' pitch='${z.pitch}'>`);
    await T.voiceSample('zariyah40', admin);
    expect(azureCalls()).toHaveLength(1);
    expect(await T.voiceSample('غير-موجود', admin)).toBeNull();
  });
  it('GET /api/faheem/voice-lab: غير مسجّل 401، بلا صوت 400، صوت معروف ← mp3', async () => {
    process.env.AZURE_SPEECH_KEY = 'az';
    const lab = (q) => LAB(new Request(`https://www.aarem.net/api/faheem/voice-lab?${q}`));
    expect((await lab('v=amal40')).headers.get('Content-Type')).toBe('audio/mpeg');
    expect((await lab('')).status).toBe(400);
    s.user = null;
    expect((await lab('v=amal40')).status).toBe(401);
  });
});
