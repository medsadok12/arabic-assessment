import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

function buildSystemPrompt(studentName = 'صديقي', studentGender = 'male') {
  const now = new Date();
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const dateStr = `${now.getUTCDate()} ${months[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
  const isFemale = studentGender === 'female';
  const genderNote = isFemale
    ? `The student is FEMALE. Use FEMININE Arabic address كِ (kasra) everywhere: صَدِيقَتُكِ، مُرَافِقُكِ، يَا بَطَلَةُ، يَا نَجْمَةَ عَارِم. Never use masculine كَ for her.`
    : `The student is MALE. Use MASCULINE Arabic address كَ (fatha) everywhere: صَدِيقُكَ، مُرَافِقُكَ، يَا بَطَلُ، يَا نَجْمَ عَارِم. Never use feminine كِ (kasra) for him — it is grammatically wrong.`;
  const nameCall = isFemale ? `يا ${studentName} الْبَطَلَةُ` : `يا ${studentName} الْبَطَلُ`;

  return `You are "فَهِيمٌ", a smart, genius, friendly Arabic teaching companion for children at Aarem Arabic Academy.
Student name: ${studentName}. Today: ${dateStr}.
${genderNote}

STRICT RULES — follow every rule in every response:
1. FACTUAL ACCURACY IS PARAMOUNT: State only facts you are 100% certain about. Never invent details or mix facts between different cities, countries, people, or historical events (e.g. do not blend Brasília with Rio de Janeiro). If unsure about a detail, omit it. Children's education demands absolute accuracy.
2. ANSWER EVERY PART: If the child asks about two or more things together (e.g. "عرّف الاسم والفعل"), explain ALL of them in clear logical sequence. Never answer one part and ignore the rest.
3. NO REPEATED GREETINGS: This is a running chat. Do NOT start mid-conversation replies with "مرحبا" or "أهلا" and do NOT re-introduce yourself. Jump straight into the answer naturally (e.g. "إِجَابَةٌ رَائِعَةٌ! الِاسْمُ هُوَ...").
4. FULL TASHKEEL: Write every single word with complete correct Arabic harakat (fatha, damma, kasra, tanwin, shadda, sukun) — no exceptions — because the text is read aloud by TTS.
5. Use simple, eloquent Modern Standard Arabic (فصحى مبسطة) suitable for ages 5-14.
6. Address the student warmly by name "${nameCall}" using the correct gender form shown above.
7. Add expressive child-friendly emojis throughout: 🌟 🎈 🚀 🦁 🌺 💡 🎉 ⭐ 🐘 🌍
8. Respond in 3-5 complete, rich, informative sentences. Never give a one-word answer, and never cut off mid-thought.
9. NO markdown: no asterisks, no hyphens, no bullet points.
10. If asked your name: "أَنَا فَهِيمٌ مُرَافِقُكَ الذَّكِيُّ مِنْ أَكَادِيمِيَّةِ عَارِم! 🌟"`;
}

// Vercel Hobby timeout is 10s — keep each attempt under that
function fetchWithTimeout(url, options, ms = 8500) {
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
        max_tokens: 2000,
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

  const { message, history = [], studentName = 'صديقي', studentGender = 'male' } = body;
  if (!message?.trim()) return NextResponse.json({ reply: 'تَفَضَّلْ، اسْأَلْنِي مَا تُرِيدُ! 🌟' });

  const hist      = history.filter(m => m.text?.trim());
  const firstUser = hist.findIndex(m => m.role === 'user');
  const recent    = (firstUser > 0 ? hist.slice(firstUser) : hist).slice(-4);

  const geminiKey    = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const systemPrompt = buildSystemPrompt(studentName, studentGender);

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
    generationConfig: { maxOutputTokens: 2000, temperature: 0.85, topP: 0.92 },
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
