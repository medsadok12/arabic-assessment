import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { FAHEEM_STATIC_PROMPT, buildStudentContext, loadLiveCatalog, toTurns } from '../../../lib/faheem-knowledge';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/* ════════════════════════════════════════════════════════════════
   فَهِيم — المرافق الذكي للطالب.
   1) Claude (حين يوجد ANTHROPIC_API_KEY في Vercel): أدق إجابات، والقسم
      الثابت من التعليمات (الهوية + القواعد + دليل المنصة) مخزَّن مؤقتاً.
   2) Gemini 2.5 Flash احتياطاً: نفس التعليمات، بحرارة منخفضة وتفكير قصير للدقة،
      ويُبثّ الجواب للطفل وهو يُكتب (يظهر النص ويبدأ الصوت قبل اكتمال الجواب).
   ميزانية الطلب كله 30 ثانية (maxDuration): Claude حتى 17ث، ثم Gemini بالباقي.
════════════════════════════════════════════════════════════════ */

const CLAUDE_MODEL = 'claude-opus-5-5';
const CLAUDE_TIMEOUT_MS = 17000;
const TOTAL_BUDGET_MS   = 27000;
const GEMINI_MODEL      = 'gemini-2.5-flash';

const RATE_LIMITED = 'وااو يا بَطَل، أسئِلَتُكَ سَريعةٌ كالصّاروخ! 🚀 أَمْهِلْني دَقيقةً صَغيرةً لِأَلتَقِطَ أنفاسي، ثُمَّ عُدْ لِتَسْأَلَني وسأُجيبُكَ بِكُلِّ سُرورٍ 🌟';
const EMPTY = 'تَفَضَّلْ، اسْأَلْنِي مَا تُرِيدُ! 🌟';
const ALL_FAILED = 'يَبْدُو أَنَّ هُنَاكَ زِحَامًا فِي الْغَابَةِ اللُّغَوِيَّةِ الآنَ يَا بَطَل! أَعِدِ الْمُحَاوَلَةَ بَعْدَ لَحْظَةٍ صَغِيرَةٍ 🎈';

async function askClaude(apiKey, dynamicPrompt, turns) {
  const client = new Anthropic({ apiKey, timeout: CLAUDE_TIMEOUT_MS, maxRetries: 0 });
  const t0 = Date.now();
  try {
    const res = await client.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      // إن رفضت مصنّفات الأمان سؤالاً بريئاً يُعاد تلقائياً على النموذج الموصى به
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // محادثة طفل: جهد منخفض = إجابة أسرع، والدقة من المعرفة المرفقة
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: FAHEEM_STATIC_PROMPT, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: dynamicPrompt },
      ],
      messages: turns,
    });
    if (res.stop_reason === 'refusal') {
      console.error(`[faheem] ✗ Claude refusal (${Date.now() - t0}ms) category=${res.stop_details?.category ?? 'unknown'}`);
      return null;
    }
    const reply = res.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const u = res.usage || {};
    console.log(`[faheem] ✓ Claude ${res.model} OK (${Date.now() - t0}ms) len=${reply.length} cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0} in=${u.input_tokens ?? 0} out=${u.output_tokens ?? 0}`);
    return reply || null;
  } catch (e) {
    const kind = e instanceof Anthropic.RateLimitError ? 'rate-limit'
      : e instanceof Anthropic.APIConnectionTimeoutError ? 'timeout'
      : e instanceof Anthropic.AuthenticationError ? 'auth'
      : e instanceof Anthropic.APIError ? `http-${e.status}` : e?.name;
    console.error(`[faheem] ✗ Claude ${kind} (${Date.now() - t0}ms): ${String(e?.message || '').slice(0, 200)}`);
    return null;
  }
}

/* أحداث SSE من Gemini ← نصوص الجواب كما تصل (بلا أجزاء التفكير) */
async function* geminiDeltas(body) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  const textOf = (line) => {
    if (!line.startsWith('data:')) return '';
    try {
      const json = JSON.parse(line.slice(5));
      return json?.candidates?.[0]?.content?.parts?.filter(p => !p.thought && p.text).map(p => p.text).join('') || '';
    } catch { return ''; }
  };
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const text = textOf(buf.slice(0, nl).trim());
      buf = buf.slice(nl + 1);
      if (text) yield text;
    }
  }
  const tail = textOf(buf.trim());
  if (tail) yield tail;
}

/* Gemini بالبث: يُنتظر أول نص فقط (فإن فشل قبله تبقى رسالة الاعتذار الودّية ممكنة)،
   ثم يُمرَّر الباقي للطفل كلمةً كلمة وهو يُكتب */
async function streamGemini(apiKey, systemText, turns, timeoutMs) {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const fail = (msg) => { clearTimeout(timer); console.error(`[faheem] ✗ ${GEMINI_MODEL} ${msg} (${Date.now() - t0}ms)`); return null; };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: turns.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        generationConfig: {
          // دقة قبل الإبداع: حرارة منخفضة + تفكير قصير قبل الإجابة
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 512 },
        },
      }),
    });
    if (!res.ok || !res.body) return fail(`HTTP ${res.status} — ${(await res.text().catch(() => '')).slice(0, 200)}`);
    const deltas = geminiDeltas(res.body);
    let first = '';
    while (!first) {
      const { value, done } = await deltas.next();
      if (done) return fail('empty reply');
      first = value.trimStart();
    }
    return { first, deltas, t0, firstMs: Date.now() - t0, abort: () => controller.abort(), done: () => clearTimeout(timer) };
  } catch (e) {
    return fail(`${e?.name}: ${e?.message}`);
  }
}

/* الجواب نصاً يُبثّ؛ X-Faheem-Voice يخبر الواجهة أن صوت الخادم ثابت (Azure)
   فتقرأ الجواب جملةً جملة وهو يصل */
function textStream(chunks, { onEnd = () => {}, onCancel = () => {} } = {}) {
  const enc = new TextEncoder();
  let len = 0;
  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const t of chunks) { len += t.length; controller.enqueue(enc.encode(t)); }
      } catch (e) {
        console.error(`[faheem] ✗ stream ${e?.name}: ${e?.message}`);
      } finally {
        try { controller.close(); } catch { /* أُغلق من جهة الطفل */ }
        onEnd(len);
      }
    },
    cancel() { onCancel(); },
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Faheem-Voice': process.env.AZURE_SPEECH_KEY ? 'azure' : 'gemini',
    },
  });
}

export async function POST(req) {
  const started = Date.now();
  const supabase = createClient();
  // التحقق من الطالب وقراءة سؤاله معاً، ثم الحدّ والكتالوج معاً — لا انتظار متسلسل
  const [{ data: { user } }, body] = await Promise.all([
    supabase.auth.getUser(),
    req.json().catch(() => null),
  ]);
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 401 });

  const { message, history = [], studentName = 'صديقي', studentGender = 'male' } = body || {};
  if (!message?.trim()) return NextResponse.json({ reply: EMPTY });

  // حدّ لكل مستخدم يضبط كلفة الذكاء الاصطناعي — يفتح عند خطأ المحدِّد
  const admin = createAdminClient();
  const [{ data: aiAllowed }, catalog] = await Promise.all([
    admin.rpc('ai_rate_check', { p_user: user.id, p_bucket: 'gen', p_per_minute: 20, p_per_day: 300 }),
    loadLiveCatalog(admin),
  ]);
  if (aiAllowed === false) return NextResponse.json({ reply: RATE_LIMITED }, { status: 429 });

  const turns = toTurns(history, message);
  const dynamicPrompt = `${catalog}\n\n${buildStudentContext({ studentName, studentGender })}`;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const pre = Date.now() - started;
  console.log(`[faheem] ▶ msg="${message.trim().slice(0, 40)}" anthropic=${!!anthropicKey} gemini=${!!geminiKey} pre=${pre}ms`);

  if (anthropicKey) {
    const reply = await askClaude(anthropicKey, dynamicPrompt, turns);
    if (reply) return textStream([reply]);
  }
  if (geminiKey) {
    const left = Math.max(6000, TOTAL_BUDGET_MS - (Date.now() - started));
    const g = await streamGemini(geminiKey, `${FAHEEM_STATIC_PROMPT}\n\n${dynamicPrompt}`, turns, left);
    if (g) {
      return textStream((async function* () { yield g.first; yield* g.deltas; })(), {
        onEnd: (len) => {
          g.done();
          console.log(`[faheem] ✓ ${GEMINI_MODEL} stream pre=${pre}ms first=${g.firstMs}ms total=${Date.now() - started}ms len=${len}`);
        },
        onCancel: () => { g.abort(); g.done(); },
      });
    }
  } else {
    console.error('[faheem] ✗ GEMINI_API_KEY not set — no fallback available');
  }

  console.error('[faheem] ✗✗✗ ALL AI calls failed — returning fallback message');
  return NextResponse.json({ reply: ALL_FAILED });
}
