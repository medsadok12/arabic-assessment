import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

function buildSystemPrompt(studentName = 'صديقي') {
  const now = new Date();
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const dateStr = `${now.getUTCDate()} ${months[now.getUTCMonth()]} ${now.getUTCFullYear()}`;

  return `أنت "فَهِيمٌ"، طفل كرتوني ذكي وفصيح عمرك 8 سنوات، والمرافق الصديق لكل أطفال أكاديمية عارم لتعليم اللغة العربية.
اسم الطالب الذي تتحدث معه الآن: ${studentName}.
تاريخ اليوم: ${dateStr}.

القواعد الثابتة — التزم بها في كل رد بدون استثناء:

1. اجب على كل سؤال بمعلومات حقيقية مفيدة وممتعة. أضف قصة لطيفة أو معلومة مدهشة تناسب الأطفال عند كل إجابة.

2. شكِّل كل حرف وكل كلمة في ردك تشكيلاً لغوياً كاملاً بالفتحة والضمة والكسرة والتنوين والشدة والسكون (بدون استثناء واحد)، لأن النص يُقرأ صوتياً وهذا ضروري للنطق الصحيح.

3. استخدم إيموجيات بهيجة في كل جملة مثل 🌟 🎈 🚀 🦁 🌺 💡 🎉 ⭐ 🐘 🌍 لتضفي بهجة على الحديث.

4. نادِ الطالب دائماً باسمه "${studentName}" مع ألقاب مشجعة مثل: يا ${studentName} الْبَطَلُ، يا نَجْمَ عَارِم، يا فَصِيحَ الْعَرَبِيَّةِ.

5. الرد: 3 إلى 4 جمل كاملة وثرية بالمعلومات والبهجة. لا تُقصِّر الرد أبداً.

6. ممنوع تماماً: النجمة (*) والشرطة (-) وأي تنسيق markdown.

7. إذا سألك عن اسمك قل: أَنَا فَهِيمٌ مُرَافِقُكَ الذَّكِيُّ مِنْ أَكَادِيمِيَّةِ عَارِم! 🌟`;
}

function fetchWithTimeout(url, options, ms = 9000) {
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
    return NextResponse.json({ reply: 'تَفَضَّلْ يَا بَطَلُ، اسْأَلْنِي مَا تُرِيدُ! 🌟' });
  }

  const { message, history = [], studentName = 'صديقي' } = body;
  if (!message?.trim()) return NextResponse.json({ reply: 'تَفَضَّلْ يَا بَطَلُ، اسْأَلْنِي مَا تُرِيدُ! 🌟' });

  const hist      = history.filter(m => m.text?.trim());
  const firstUser = hist.findIndex(m => m.role === 'user');
  const recent    = (firstUser > 0 ? hist.slice(firstUser) : hist).slice(-6);

  const geminiKey    = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const systemPrompt = buildSystemPrompt(studentName);

  // ── 1. Gemini ──
  if (geminiKey) {
    const contents = [
      ...recent.map(m => ({
        role:  m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    const MODELS = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite-preview-06-17',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
    ];

    const genBody = JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        maxOutputTokens: 800,
        temperature:     0.85,
        topP:            0.92,
      },
    });

    for (const model of MODELS) {
      try {
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: genBody }
        );

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.error(`[faheem] Gemini ${model} HTTP ${res.status}`, errText.slice(0, 200));
          continue; // always try next model on any HTTP error
        }

        const json  = await res.json();
        const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) {
          console.log(`[faheem] Gemini OK (${model}), length: ${reply.length}`);
          return NextResponse.json({ reply });
        }
        console.error(`[faheem] Gemini ${model} empty:`, JSON.stringify(json).slice(0, 200));
      } catch (e) {
        console.error(`[faheem] Gemini ${model} exception:`, e?.name, e?.message);
      }
    }
  }

  // ── 2. Anthropic Claude (secondary) ──
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
          max_tokens: 800,
          system:     systemPrompt,
          messages,
        }),
      });
      if (!res.ok) {
        console.error('[faheem] Anthropic HTTP', res.status);
      } else {
        const json  = await res.json();
        const reply = json.content?.[0]?.text?.trim();
        if (reply) {
          console.log('[faheem] Anthropic OK');
          return NextResponse.json({ reply });
        }
      }
    } catch (e) {
      console.error('[faheem] Anthropic exception:', e?.name, e?.message);
    }
  }

  console.warn('[faheem] All AI calls failed');
  return NextResponse.json({
    reply: 'عُذْرًا يَا صَدِيقِي، لَمْ أَسْتَطِعِ الاِتِّصَالَ الآنَ. حَاوِلْ مَرَّةً أُخْرَى مِنْ فَضْلِكَ! 🌟',
  });
}
