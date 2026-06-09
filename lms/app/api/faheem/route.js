import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // use the full Vercel Hobby budget

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
1. FACTUAL ACCURACY IS PARAMOUNT: State only facts you are 100% certain about. Never invent details or mix facts between different cities, countries, people, or historical events. If unsure about a detail, omit it.
2. ANSWER EVERY PART: If the child asks about two or more things, explain ALL of them in clear logical sequence. Never answer one part and ignore the rest.
3. NO REPEATED GREETINGS: This is a running chat. Do NOT start mid-conversation replies with "مرحبا" or "أهلا". Jump straight into the answer.
4. TASHKEEL — vowel every word fully and COMFORTABLY (the text is read aloud):
   • Place harakat (fatha/damma/kasra) and shadda on the letters INSIDE each word.
   • Indefinite nouns inside the sentence keep tanwin: كِتَابٌ، قَلَمًا، بِسُرْعَةٍ.
   • Never leave a word completely bare of harakat inside the sentence.
4b. WAQF RULE — pausing is purely linguistic:
   • The LAST letter of any word that comes immediately before ( . ، ؟ ! ؛ ) or ends the
     sentence MUST be written COMPLETELY BARE — no harakat, no tanwin, and NO sukun mark
     either. A bare final letter tells the voice engine "this is a natural stop".
     WRONG: "يَا بَطَلُ."   (damma is read aloud — ugly)
     WRONG: "يَا بَطَلْ."   (explicit sukun confuses the engine)
     CORRECT: "يَا بَطَل."   (bare letter → clean, human pause)
   • Tanwin fath at a pause → write the natural alif of prolongation directly, with no
     tanwin mark, so the engine reads it as a smooth long "aa":
     CORRECT: "أَهْلًا بِكَ وَسَهْلَا."   (final "سَهْلَا" ends in a plain alif)
     Apply this to EVERY sentence-final word and every word before punctuation.
5. Use simple, eloquent Modern Standard Arabic (فصحى مبسطة) suitable for ages 5-14.
6. Address the student warmly by name "${nameCall}" using the correct gender form shown above.
7. Add expressive child-friendly emojis: 🌟 🎈 🚀 🦁 🌺 💡 🎉 ⭐ 🐘 🌍
8. Respond in 3-5 complete, rich sentences. Never give a one-word answer, never cut off mid-thought.
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
    const t0  = Date.now();
    const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 2000,
        system:     systemPrompt,
        messages,
      }),
    }, 8500);
    const elapsed = Date.now() - t0;
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[faheem] ✗ Claude HTTP ${res.status} (${elapsed}ms) — ${errText.slice(0, 200)}`);
      return null;
    }
    const json  = await res.json();
    const reply = json.content?.[0]?.text?.trim();
    if (reply) { console.log(`[faheem] ✓ Claude OK (${elapsed}ms) len=${reply.length}`); return reply; }
    console.error('[faheem] ✗ Claude empty reply:', JSON.stringify(json).slice(0, 150));
  } catch (e) {
    console.error(`[faheem] ✗ Claude EXCEPTION ${e.name}: ${e.message}`);
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

  // Diagnostic log — visible in Vercel Function Logs
  console.log(`[faheem] ▶ msg="${message.trim().slice(0,40)}" anthropic=${!!anthropicKey} gemini=${!!geminiKey}`);

  // ── 1. Claude (only if key exists — avoids wasting the 10s Vercel budget) ──
  if (anthropicKey) {
    const anthropicReply = await tryAnthropic(anthropicKey, systemPrompt, recent, message.trim());
    if (anthropicReply) return NextResponse.json({ reply: anthropicReply });
  }

  // ── 2. Gemini ──────────────────────────────────────────────────────────────
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
    generationConfig: {
      maxOutputTokens: 800,        // tashkeel-heavy Arabic is token-dense; room for 3-5 sentences
      temperature: 0.85,
      topP: 0.92,
      thinkingConfig: { thinkingBudget: 0 }, // disable 2.5-flash thinking — it ate the token budget → cut-offs & timeouts
    },
  });

  // 2.5-flash free tier = 10 RPM → 1.5-flash fallback (15 RPM) handles rate-limit 429s
  const GEMINI_MODELS = [
    { name: 'gemini-2.5-flash', ms: 6000 },
    { name: 'gemini-1.5-flash', ms: 3500 }, // no thinking overhead → fast
  ];

  if (geminiKey) {
    for (const { name: model, ms: timeout } of GEMINI_MODELS) {
      try {
        const t0  = Date.now();
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody },
          timeout
        );
        const elapsed = Date.now() - t0;

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.error(`[faheem] ✗ ${model} HTTP ${res.status} (${elapsed}ms) — ${errText.slice(0, 200)}`);
          continue;
        }

        const rawText = await res.text();
        let json;
        try { json = JSON.parse(rawText); } catch {
          console.error(`[faheem] ✗ ${model} JSON parse fail (${elapsed}ms)`);
          continue;
        }

        const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) {
          console.log(`[faheem] ✓ ${model} fallback OK (${elapsed}ms) len=${reply.length}`);
          return NextResponse.json({ reply });
        }
        const reason = json.candidates?.[0]?.finishReason ?? 'unknown';
        console.error(`[faheem] ✗ ${model} empty reply finishReason=${reason} (${elapsed}ms)`);

      } catch (e) {
        console.error(`[faheem] ✗ ${model} EXCEPTION ${e.name}: ${e.message}`);
      }
    }
  } else {
    console.error('[faheem] ✗ GEMINI_API_KEY not set — no fallback available');
  }

  // All failed
  console.error('[faheem] ✗✗✗ ALL AI calls failed — returning fallback message');
  return NextResponse.json({
    reply: 'يَبْدُو أَنَّ هُنَاكَ زِحَامًا فِي الْغَابَةِ اللُّغَوِيَّةِ الآنَ يَا بَطَلُ! أَعِدِ الْمُحَاوَلَةَ بَعْدَ لَحْظَةٍ صَغِيرَةٍ 🎈',
  });
}
