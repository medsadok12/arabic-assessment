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

function fetchWithTimeout(url, options, ms = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
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

  const errors = [];

  // ── 1. Gemini ──
  if (geminiKey) {
    const contents = [
      ...recent.map(m => ({
        role:  m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    for (const model of MODELS) {
      try {
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: { maxOutputTokens: 600, temperature: 0.85, topP: 0.92 },
            }),
          }
        );

        const rawText = await res.text();

        if (!res.ok) {
          const msg = `${model} HTTP ${res.status}: ${rawText.slice(0, 300)}`;
          console.error('[faheem]', msg);
          errors.push(msg);
          continue;
        }

        let json;
        try { json = JSON.parse(rawText); } catch {
          errors.push(`${model} JSON parse fail`);
          continue;
        }

        const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) {
          console.log(`[faheem] OK (${model}) len=${reply.length}`);
          return NextResponse.json({ reply });
        }

        const blocked = json.candidates?.[0]?.finishReason;
        errors.push(`${model} empty reply, finishReason=${blocked}`);
        console.error('[faheem]', errors.at(-1));

      } catch (e) {
        const msg = `${model} exception: ${e.name} ${e.message}`;
        console.error('[faheem]', msg);
        errors.push(msg);
      }
    }
  } else {
    errors.push('GEMINI_API_KEY not set in Vercel env');
  }

  // ── 2. Anthropic ──
  if (anthropicKey) {
    try {
      const messages = [
        ...recent.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: message.trim() },
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
      const raw = await res.text();
      if (!res.ok) {
        errors.push(`Anthropic HTTP ${res.status}: ${raw.slice(0, 200)}`);
      } else {
        const json  = JSON.parse(raw);
        const reply = json.content?.[0]?.text?.trim();
        if (reply) {
          console.log('[faheem] Anthropic OK');
          return NextResponse.json({ reply });
        }
      }
    } catch (e) {
      errors.push(`Anthropic exception: ${e.name} ${e.message}`);
    }
  }

  // ── Return real error for debugging ──
  const debugMsg = errors.join(' | ');
  console.error('[faheem] ALL FAILED:', debugMsg);
  return NextResponse.json({ reply: `[خطأ تقني] ${debugMsg}` });
}
