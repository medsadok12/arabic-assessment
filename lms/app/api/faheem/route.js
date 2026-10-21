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
   2) Gemini 2.5 Flash احتياطاً: نفس التعليمات، بحرارة منخفضة وتفكير قصير للدقة.
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

async function askGemini(apiKey, systemText, turns, timeoutMs) {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
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
    if (!res.ok) {
      console.error(`[faheem] ✗ ${GEMINI_MODEL} HTTP ${res.status} (${Date.now() - t0}ms) — ${(await res.text().catch(() => '')).slice(0, 200)}`);
      return null;
    }
    const json = await res.json().catch(() => null);
    const reply = json?.candidates?.[0]?.content?.parts?.filter(p => !p.thought && p.text).map(p => p.text).join('').trim();
    if (reply) {
      console.log(`[faheem] ✓ ${GEMINI_MODEL} OK (${Date.now() - t0}ms) len=${reply.length}`);
      return reply;
    }
    console.error(`[faheem] ✗ ${GEMINI_MODEL} empty reply finishReason=${json?.candidates?.[0]?.finishReason ?? 'unknown'} (${Date.now() - t0}ms)`);
  } catch (e) {
    console.error(`[faheem] ✗ ${GEMINI_MODEL} ${e?.name} (${Date.now() - t0}ms): ${e?.message}`);
  } finally {
    clearTimeout(timer);
  }
  return null;
}

export async function POST(req) {
  const started = Date.now();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 401 });

  // حدّ لكل مستخدم يضبط كلفة الذكاء الاصطناعي — يفتح عند خطأ المحدِّد
  const admin = createAdminClient();
  const { data: aiAllowed } = await admin.rpc('ai_rate_check', {
    p_user: user.id, p_bucket: 'gen', p_per_minute: 20, p_per_day: 300,
  });
  if (aiAllowed === false) return NextResponse.json({ reply: RATE_LIMITED }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ reply: EMPTY }); }
  const { message, history = [], studentName = 'صديقي', studentGender = 'male' } = body || {};
  if (!message?.trim()) return NextResponse.json({ reply: EMPTY });

  const turns = toTurns(history, message);
  const catalog = await loadLiveCatalog(admin);
  const dynamicPrompt = `${catalog}\n\n${buildStudentContext({ studentName, studentGender })}`;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  console.log(`[faheem] ▶ msg="${message.trim().slice(0, 40)}" anthropic=${!!anthropicKey} gemini=${!!geminiKey}`);

  if (anthropicKey) {
    const reply = await askClaude(anthropicKey, dynamicPrompt, turns);
    if (reply) return NextResponse.json({ reply });
  }
  if (geminiKey) {
    const left = Math.max(6000, TOTAL_BUDGET_MS - (Date.now() - started));
    const reply = await askGemini(geminiKey, `${FAHEEM_STATIC_PROMPT}\n\n${dynamicPrompt}`, turns, left);
    if (reply) return NextResponse.json({ reply });
  } else {
    console.error('[faheem] ✗ GEMINI_API_KEY not set — no fallback available');
  }

  console.error('[faheem] ✗✗✗ ALL AI calls failed — returning fallback message');
  return NextResponse.json({ reply: ALL_FAILED });
}
