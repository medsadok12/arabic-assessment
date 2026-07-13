import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const SYSTEM = `أنتَ فَهيمُ، مُساعِدٌ ذَكِيٌّ مَرِحٌ لِلطِّفْلِ فِي أَكَادِيمِيَّةِ عَارِم. أَجِبْ بِجُمْلَةٍ أَوْ جُمْلَتَيْنِ فَقَطْ، بِالعَرَبِيَّةِ الفُصْحَى المُشَكَّلَةِ تَمَاماً. اِبْدَأْ مُباشَرَةً بِالْكَلَامِ الْوَدُودِ دُونَ مُقَدِّمَاتٍ، وَلَا تُوَلِّدْ أَيَّ سُؤَالٍ فِي هَذَا الطَّلَبِ.`;

export async function POST(req) {
  // Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('غير مصرح', { status: 401 });

  // Shared 'gen' rate limit with /api/faheem — caps AI spend. Fails open on limiter error.
  const rateAdmin = createAdminClient();
  const { data: streamAllowed } = await rateAdmin.rpc('ai_rate_check', {
    p_user: user.id, p_bucket: 'gen', p_per_minute: 20, p_per_day: 300,
  });
  if (streamAllowed === false) return new Response('rate_limited', { status: 429 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return new Response('API key missing', { status: 500 });

  const { message, history = [], studentName = 'بطل', studentGender = 'male' } = await req.json();
  if (!message?.trim()) return new Response('empty message', { status: 400 });

  const isFemale = studentGender === 'female';
  const genderNote = isFemale
    ? `الطالبة اسمها ${studentName}، خاطبيها بضمير المؤنث.`
    : `الطالب اسمه ${studentName}، خاطبه بضمير المذكر.`;

  const messages = [
    ...history.filter(m => m.text?.trim()).slice(-4).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: message.trim() },
  ];

  // Call Anthropic with streaming + prompt caching
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         key,
      'anthropic-version': '2023-06-01',
      'anthropic-beta':    'prompt-caching-2024-07-31',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 150,
      stream:     true,
      system: [
        {
          type:          'text',
          text:          SYSTEM + '\n' + genderNote,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text().catch(() => '');
    return new Response(err || 'upstream error', { status: upstream.status });
  }

  // Transform Anthropic SSE → simple client SSE (only text deltas)
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buf = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') continue;
            try {
              const ev = JSON.parse(data);
              if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: ev.delta.text })}\n\n`));
              }
              if (ev.type === 'message_stop') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              }
            } catch { /* skip malformed line */ }
          }
        }
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
