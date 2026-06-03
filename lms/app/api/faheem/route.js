import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

function buildSystemPrompt() {
  const now = new Date();
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const dateStr = `${now.getUTCDate()} ${months[now.getUTCMonth()]} ${now.getUTCFullYear()}`;

  return `انت "فهيم"، مرافق ذكي ومعلم لطيف لاطفال اكاديمية عارم لتعليم اللغة العربية.
تاريخ اليوم: ${dateStr}.

القواعد — التزم بها دائما:
1. اجب على كل سؤال بمعلومات حقيقية مفيدة ومباشرة. لا تتهرب ابدا.
2. اكتب كل كلمة في ردك مشكلة تشكيلا كاملا بالحركات (فتحة ضمة كسرة سكون شدة) لان النص سيقرا صوتيا وهذا ضروري للنطق الفصيح.
3. استخدم العربية الفصحى المبسطة المناسبة لاطفال من 5 الى 14 سنة.
4. الرد قصير: جملتان الى ثلاث جمل فقط.
5. ابدا احيانا بـ: يا بطل، يا صديقي، ما شاء الله، سؤال ممتاز.
6. ممنوع: رموز تعبيرية، نجمة، شرطة، او اي تنسيق markdown.
7. اذا سالك الطفل عن اسمك قل: انا فهيم مرافقك الذكي من اكاديمية عارم.`;
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
    return NextResponse.json({ reply: 'تَفَضَّلْ يَا بَطَلُ، اسْأَلْنِي مَا تُرِيدُ!' });
  }

  const { message, history = [] } = body;
  if (!message?.trim()) return NextResponse.json({ reply: 'تَفَضَّلْ يَا بَطَلُ، اسْأَلْنِي مَا تُرِيدُ!' });

  const hist      = history.filter(m => m.text?.trim());
  const firstUser = hist.findIndex(m => m.role === 'user');
  const recent    = (firstUser > 0 ? hist.slice(firstUser) : hist).slice(-6);

  const geminiKey    = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const systemPrompt = buildSystemPrompt();

  // ── 1. Gemini ──
  if (geminiKey) {
    const contents = [
      ...recent.map(m => ({
        role:  m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ];
    const genBody = JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 300, temperature: 0.80, topP: 0.90 },
    });

    const MODELS = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite-preview-06-17',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
    ];

    for (const model of MODELS) {
      try {
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: genBody }
        );
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.error(`[faheem] Gemini ${model} HTTP ${res.status}`, errText.slice(0, 200));
          if (res.status === 429 || res.status === 503) continue;
          if (res.status === 404) continue;
          break;
        }
        const json  = await res.json();
        const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) {
          console.log(`[faheem] Gemini OK (${model}), length: ${reply.length}`);
          return NextResponse.json({ reply });
        }
        console.error(`[faheem] Gemini ${model} empty reply:`, JSON.stringify(json).slice(0, 200));
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
          max_tokens: 300,
          system:     systemPrompt,
          messages,
        }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => '');
        console.error('[faheem] Anthropic HTTP', res.status, err.slice(0, 300));
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

  // ── 3. Connection error (shown only if all AI calls fail) ──
  console.warn('[faheem] All AI calls failed, gemini:', !!geminiKey, 'anthropic:', !!anthropicKey);
  return NextResponse.json({
    reply: 'عُذْرًا يَا صَدِيقِي، لَمْ أَسْتَطِعِ الاِتِّصَالَ الآنَ. حَاوِلْ مَرَّةً أُخْرَى مِنْ فَضْلِكَ!',
  });
}
