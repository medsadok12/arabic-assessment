import { createHash } from 'node:crypto';
import { applyWaqf } from './arabic-waqf';

/* ════════════════════════════════════════════════════════════════
   صوت «فَهِيم» — نص عربي مشكول ← صوت بشري.
   الترتيب (أول صوت ينجح):
     1) Azure Neural — إن أُضيف AZURE_SPEECH_KEY (مجاني حتى 500 ألف حرف شهرياً).
     2) Gemini TTS  — بمفتاح GEMINI_API_KEY الموجود أصلاً (حصة مجانية يومية).
     3) Google Translate — آلي مسطّح بلا مفتاح؛ آخر حل كي لا يصمت فهيم.
   بلاغ الأستاذ محمد (2026-10-21): «صوت قراءة فهيم سيء… أريده كإنسان» — كان
   الإنتاج بلا مفتاح Azure، فكل ما سمعه الأطفال هو صوت Google Translate.
════════════════════════════════════════════════════════════════ */

// جواب فهيم كله في طلب واحد (3–6 جمل) — صوت واحد بلا فواصل بين أجزاء تولَّد منفصلة
export const TTS_MAX_CHARS = 1200;

const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts'; // نموذج بحصة مجانية
const GEMINI_DEFAULT_VOICE = 'Puck';                          // صوت مرح شاب
// تعليمات قصيرة بصيغة توثيق Google («Say cheerfully: …»). التعليمات الطويلة جعلت النموذج
// يظن أن المطلوب ردّ مكتوب (HTTP 400 «Model tried to generate text») فيُنتقل لنموذج آخر
// بصوت آخر وسرعة أخرى في منتصف الجواب — بلاغ الأستاذ محمد: «صوتان مختلفان، بطيء ثم يسرع».
// النص يصل مضبوطاً بالوقف مسبقاً (applyWaqf)، فلا حاجة لشرح القواعد هنا.
const GEMINI_PROMPTS = [
  (text) => `Say in a warm, cheerful and friendly voice, stopping on a silent final letter at every pause:\n${text}`,
  (text) => `Read aloud exactly this transcript, word for word, without answering it:\n${text}`,
];
const AZURE_DEFAULT_VOICE = 'ar-SA-HamedNeural';

/* ── PCM خام (16-bit mono) ← ملف WAV يشغّله أي متصفح ── */
export function pcmToWav(pcm, sampleRate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);           // حجم قسم fmt
  h.writeUInt16LE(1, 20);            // PCM
  h.writeUInt16LE(1, 22);            // قناة واحدة
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/* ── تقسيم عند حدود الجمل/الكلمات (Google Translate لا يقبل أكثر من ~200 حرف) ── */
export function splitText(text, max) {
  const parts = [];
  let rest = text.trim();
  while (rest.length > max) {
    const slice = rest.slice(0, max);
    const cut = Math.max(slice.search(/[.!?؟،؛\n](?!.*[.!?؟،؛\n])/s) + 1, slice.lastIndexOf(' '));
    const at = cut > max / 3 ? cut : max;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/* ── 1) Azure Neural ── */
async function azureTTS(text, deadline) {
  const key = process.env.AZURE_SPEECH_KEY;
  if (!key) return null;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';
  const voice = process.env.AZURE_SPEECH_VOICE || AZURE_DEFAULT_VOICE;
  const t0 = Date.now();
  try {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      signal: AbortSignal.timeout(Math.max(3000, deadline - Date.now())),
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'faheem-tts',
      },
      body: `<speak version='1.0' xml:lang='ar-SA'><voice name='${voice}'><prosody rate='-4%' pitch='+8%'>${xmlEscape(text)}</prosody></voice></speak>`,
    });
    if (!res.ok) {
      console.error(`[tts] ✗ azure HTTP ${res.status} (${Date.now() - t0}ms) — ${(await res.text().catch(() => '')).slice(0, 150)}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`[tts] ✓ azure ${voice} (${Date.now() - t0}ms) chars=${text.length}`);
    return { buf, type: 'audio/mpeg' };
  } catch (e) {
    console.error(`[tts] ✗ azure ${e?.name} (${Date.now() - t0}ms): ${e?.message}`);
    return null;
  }
}

/* ── 2) Gemini TTS ──
   النموذج المجاني المعروف أولاً، ثم أي نموذج TTS آخر يعلنه الحساب (احتياطاً إن
   سُحب النموذج). النموذج الذي نفدت حصته أو رُفض يُستبعد مؤقتاً في هذه النسخة
   من الدالة، فلا ينتظر الطفل محاولة نعرف أنها ستفشل. */
const geminiState = { models: null, at: 0, blocked: new Map() };
export const _resetGeminiTtsState = () => { geminiState.models = null; geminiState.at = 0; geminiState.blocked.clear(); };

async function geminiModels(apiKey) {
  if (process.env.GEMINI_TTS_MODEL) return [process.env.GEMINI_TTS_MODEL];
  if (geminiState.models && Date.now() - geminiState.at < 6 * 3600e3) return geminiState.models;
  let others = [];
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
      headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const json = await res.json();
      const version = (id) => Number(/(\d+(?:\.\d+)?)/.exec(id)?.[1] || 0);
      others = (json.models || [])
        .filter(m => /tts/i.test(m.name || '') && (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''))
        .filter(id => id !== GEMINI_DEFAULT_MODEL)
        .sort((a, b) => (/lite/.test(a) - /lite/.test(b)) || version(b) - version(a));
    }
  } catch { /* القائمة اختيارية — النموذج الافتراضي يكفي */ }
  geminiState.models = [GEMINI_DEFAULT_MODEL, ...others];
  geminiState.at = Date.now();
  return geminiState.models;
}

// كم يُستبعد النموذج بعد الفشل: الحصة اليومية ساعة، حصة الدقيقة ما يطلبه الخادم، النموذج غير الموجود يوماً
export function blockMs(status, body = '') {
  if (status === 429) {
    if (/PerDay/i.test(body)) return 60 * 60e3;
    const s = Number(/"retryDelay":\s*"(\d+)/.exec(body)?.[1]);
    return Math.min(Math.max(s || 60, 10), 300) * 1000;
  }
  if (status === 404 || (status === 400 && /not (found|supported)/i.test(body))) return 24 * 3600e3;
  if (status === 401 || status === 403) return 60 * 60e3;
  return 0;
}

async function callGemini(apiKey, model, voice, prompt, timeoutMs) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  });
  if (!res.ok) return { status: res.status, body: await res.text().catch(() => '') };
  const json = await res.json().catch(() => null);
  const audio = json?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data)?.inlineData;
  if (!audio) return { status: 200, body: `no audio finishReason=${json?.candidates?.[0]?.finishReason ?? 'unknown'}` };
  const rate = Number(/rate=(\d+)/.exec(audio.mimeType || '')?.[1]) || 24000;
  return { buf: pcmToWav(Buffer.from(audio.data, 'base64'), rate) };
}

/* صوت واحد للجواب كله: الفشل العابر يُعاد على النموذج نفسه بصيغة أخرى، ولا يُنتقل لنموذج
   آخر (صوت آخر) إلا إذا كان النموذج غير متاح فعلاً (حصة نفدت، أو سُحب). */
async function geminiTTS(text, deadline) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const voice = process.env.GEMINI_TTS_VOICE || GEMINI_DEFAULT_VOICE;
  const models = (await geminiModels(apiKey)).filter(m => !(geminiState.blocked.get(m) > Date.now()));
  for (const model of models.slice(0, 2)) {
    for (const [i, prompt] of GEMINI_PROMPTS.entries()) {
      const left = deadline - Date.now();
      if (left < 3000) return null;
      const t0 = Date.now();
      try {
        const r = await callGemini(apiKey, model, voice, prompt(text), left);
        if (r.buf) {
          console.log(`[tts] ✓ gemini ${model} ${voice} prompt=${i + 1} (${Date.now() - t0}ms) chars=${text.length} bytes=${r.buf.length}`);
          return { buf: r.buf, type: 'audio/wav' };
        }
        const ms = blockMs(r.status, r.body);
        console.error(`[tts] ✗ gemini ${model} prompt=${i + 1} HTTP ${r.status} (${Date.now() - t0}ms) blocked=${Math.round(ms / 1000)}s — ${r.body.slice(0, 200)}`);
        if (ms) { geminiState.blocked.set(model, Date.now() + ms); break; } // غير متاح ← النموذج التالي
      } catch (e) {
        console.error(`[tts] ✗ gemini ${model} prompt=${i + 1} ${e?.name} (${Date.now() - t0}ms): ${e?.message}`);
      }
    }
  }
  return null;
}

/* ── 3) Google Translate — مسطّح لكنه مجاني بلا مفتاح ── */
async function googleOne(text) {
  const res = await fetch(
    `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&ttsspeed=0.9&q=${encodeURIComponent(text)}`,
    {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
        'Accept-Language': 'ar,en;q=0.9',
      },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function googleTTS(text) {
  try {
    // ملفات MP3 تُلصق متتابعة فتُشغَّل كملف واحد
    const bufs = await Promise.all(splitText(text, 190).map(googleOne));
    console.log(`[tts] ✓ google-translate (fallback) chars=${text.length}`);
    return { buf: Buffer.concat(bufs), type: 'audio/mpeg' };
  } catch (e) {
    console.error(`[tts] ✗ google-translate ${e?.message}`);
    return null;
  }
}

/* ── تخزين دائم للنصوص المشتركة (كلمة اليوم): صوت واحد لكل الطلاب بدل طلب لكل طالب ── */
function voiceId() {
  return process.env.AZURE_SPEECH_KEY
    ? `azure:${process.env.AZURE_SPEECH_VOICE || AZURE_DEFAULT_VOICE}`
    : `gemini:${process.env.GEMINI_TTS_VOICE || GEMINI_DEFAULT_VOICE}`;
}
// «w1» = نسخة قواعد الوقف — تُرفع عند تغيير applyWaqf كي لا يُخدم صوت قديم
export const cachePath = (text) => `tts-cache/${createHash('sha256').update(`w1|${voiceId()}|${text}`).digest('hex')}`;

async function readCache(admin, path) {
  try {
    const { data, error } = await admin.storage.from('media').download(path);
    if (error || !data) return null;
    return { buf: Buffer.from(await data.arrayBuffer()), type: data.type || 'audio/wav' };
  } catch { return null; }
}

async function writeCache(admin, path, out) {
  try {
    await admin.storage.from('media').upload(path, out.buf, { contentType: out.type, upsert: true, cacheControl: '31536000' });
  } catch { /* التخزين تحسين فقط */ }
}

export async function synthesize(rawText, { admin = null, shared = false, budgetMs = 25000 } = {}) {
  const deadline = Date.now() + budgetMs;
  const text = applyWaqf(rawText); // الوقف بالسكون قبل أي مزوّد
  const path = shared && admin ? cachePath(text) : null;
  if (path) {
    const hit = await readCache(admin, path);
    if (hit) return hit;
  }
  const human = (await azureTTS(text, deadline)) ?? (await geminiTTS(text, deadline));
  if (human) {
    if (path) await writeCache(admin, path, human); // الصوت البشري فقط يُخزَّن
    return human;
  }
  return googleTTS(text);
}
