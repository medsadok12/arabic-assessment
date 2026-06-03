import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

function buildSystemPrompt(studentName = 'صديقي') {
  const now = new Date();
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const dateStr = `${now.getUTCDate()} ${months[now.getUTCMonth()]} ${now.getUTCFullYear()}`;

  return `You are "فَهِيمٌ", a smart friendly AI companion for children at Aarem Arabic Academy.
Student name: ${studentName}. Today: ${dateStr}.

STRICT RULES — follow every rule in every response:
1. Answer every question with real, accurate, rich educational information. Never refuse or deflect.
2. Write every single word with FULL Arabic tashkeel (harakat: fatha, damma, kasra, tanwin, shadda, sukun) — no exceptions — the text is read aloud by TTS.
3. Address the student by name every time: "يا ${studentName} البَطَلُ" or "يا نَجْمَ عَارِم".
4. Add expressive child-friendly emojis every sentence: use 🌟 🎈 🚀 🦁 🌺 💡 🎉 ⭐ 🐘 🌍 freely.
5. Respond in 3-4 complete, rich, informative Arabic sentences. Never give a one-word or one-phrase answer.
6. Use simple Modern Standard Arabic suitable for ages 5-14.
7. NO markdown: no asterisks, no hyphens, no bullet points.
8. If asked your name: "أَنَا فَهِيمٌ مُرَافِقُكَ الذَّكِيُّ مِنْ أَكَادِيمِيَّةِ عَارِم! 🌟"`;
}

// Vercel Hobby timeout is 10s — keep each attempt under that
function fetchWithTimeout(url, options, ms = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

async function tryAnthropic(anthropicKey, systemPrompt, recent, message) {
  if (!anthropicKey) return null;
  try {
    const messages = [
      ...recent.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
      { role: 'user', content: message },
    ];
    const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system:     systemPrompt,
        messages,
      }),
    });
    if (!res.ok) {
      console.error('[faheem] Anthropic HTTP', res.status);
      return null;
    }
    const json  = await res.json();
    const reply = json.content?.[0]?.text?.trim();
    if (reply) { console.log('[faheem] Anthropic OK'); return reply; }
  } catch (e) {
    console.error('[faheem] Anthropic exception:', e.name, e.message);
  }
  return null;
}

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ reply: 'تَفَضَّلْ، اسْأَلْنِي مَا تُرِيدُ! 🌟' });
  }

  const { message, history = [], studentName = 'صديقي' } = body;
  if (!message?.trim()) return NextResponse.json({ reply: 'تَفَضَّلْ، اسْأَلْنِي مَا تُرِيدُ! 🌟' });

  const hist      = history.filter(m => m.text?.trim());
  const firstUser = hist.findIndex(m => m.role === 'user');
  const recent    = (firstUser > 0 ? hist.slice(firstUser) : hist).slice(-4);

  const geminiKey    = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const systemPrompt = buildSystemPrompt(studentName);

  const contents = [
    ...recent.map(m => ({
      role:  m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: message.trim() }] },
  ];
  const geminiBody = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { maxOutputTokens: 600, temperature: 0.85, topP: 0.92 },
  });

  // ── Gemini models to try in order ──
  const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite-preview-06-17',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
  ];

  let geminiOverloaded = false;

  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      try {
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody }
        );

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.error(`[faheem] Gemini ${model} HTTP ${res.status}`, errText.slice(0, 150));

          // On overload/quota errors, immediately try Anthropic before other Gemini models
          if ((res.status === 503 || res.status === 429) && !geminiOverloaded) {
            geminiOverloaded = true;
            console.log('[faheem] Gemini overloaded, trying Anthropic...');
            const anthropicReply = await tryAnthropic(anthropicKey, systemPrompt, recent, message.trim());
            if (anthropicReply) return NextResponse.json({ reply: anthropicReply });
          }
          continue;
        }

        const rawText = await res.text();
        let json;
        try { json = JSON.parse(rawText); } catch {
          console.error(`[faheem] ${model} JSON parse fail`);
          continue;
        }

        const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) {
          console.log(`[faheem] Gemini OK (${model}) len=${reply.length}`);
          return NextResponse.json({ reply });
        }
        console.error(`[faheem] ${model} empty, finishReason=${json.candidates?.[0]?.finishReason}`);

      } catch (e) {
        console.error(`[faheem] ${model} exception: ${e.name} ${e.message}`);
        // On timeout, try Anthropic immediately
        if (e.name === 'AbortError' && !geminiOverloaded) {
          geminiOverloaded = true;
          const anthropicReply = await tryAnthropic(anthropicKey, systemPrompt, recent, message.trim());
          if (anthropicReply) return NextResponse.json({ reply: anthropicReply });
        }
      }
    }
  }

  // ── Final Anthropic attempt (if not already tried) ──
  if (!geminiOverloaded) {
    const anthropicReply = await tryAnthropic(anthropicKey, systemPrompt, recent, message.trim());
    if (anthropicReply) return NextResponse.json({ reply: anthropicReply });
  }

  // ── All failed — friendly cartoon message ──
  console.error('[faheem] ALL AI calls failed. geminiKey:', !!geminiKey, 'anthropicKey:', !!anthropicKey);
  return NextResponse.json({
    reply: 'يَبْدُو أَنَّ هُنَاكَ زِحَامًا فِي الْغَابَةِ اللُّغَوِيَّةِ الآنَ يَا بَطَلُ! أَعِدِ الْمُحَاوَلَةَ بَعْدَ لَحْظَةٍ صَغِيرَةٍ 🎈',
  });
}
