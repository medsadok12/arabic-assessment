import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `أنت "فهيم"، طفل كرتوني لطيف ومرافق ذكي ومحبوب لأطفال أكاديمية عارم لتعليم اللغة العربية.
مهمتك هي إجراء حوار حر وممتع ومليء بالذكاء مع الأطفال.
القواعد الأساسية:
- تحدّث دائماً باللغة العربية الفصحى المبسطة جداً والمناسبة لأعمار الأطفال من 5 إلى 14 سنة.
- أجبهم بذكاء وخيال واسع عن أي سؤال يطرحونه داخل أو خارج نطاق الدراسة.
- ردودك قصيرة وممتعة وتحفيزية (جملتان إلى ثلاث جمل فقط في الغالب).
- استخدم أسلوباً حيوياً ومرحاً مليئاً بالحماس والتشجيع.
- ابدأ ردودك أحياناً بعبارات مثل: "يا بطل" أو "يا صديقي" أو "ما شاء الله" أو "رائع جداً" أو "سؤال ممتاز".
- لا تستخدم الرموز التعبيرية emoji في ردودك.
- إذا سألك الطفل عن اسمك قل: أنا فهيم، مرافقك الذكي من أكاديمية عارم.
- لا تتحدث أبداً عن أي موضوع غير لائق للأطفال.`;

export async function POST(req) {
  // Auth check — only logged-in students can use Faheem
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ reply: 'يا بطل، لم أفهم رسالتك. هل تعيد المحاولة؟' });
  }

  const { message, history = [] } = body;
  if (!message?.trim()) return NextResponse.json({ reply: 'تفضل يا بطل، اسألني ما تريد!' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: fallback(message) });
  }

  try {
    // Build contents array — skip leading AI messages (Gemini needs user-first history)
    const hist = history.filter(m => m.text?.trim());
    const firstUser = hist.findIndex(m => m.role === 'user');
    const trimmed   = firstUser > 0 ? hist.slice(firstUser) : hist;
    const recent    = trimmed.slice(-10); // keep last 10 exchanges

    const contents = [
      ...recent.map(m => ({
        role:  m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            maxOutputTokens: 220,
            temperature: 0.85,
            topP: 0.92,
          },
        }),
      }
    );

    const json  = await res.json();
    const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) throw new Error('empty');

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[faheem] AI error:', err?.message ?? err);
    return NextResponse.json({ reply: fallback(message) });
  }
}

function fallback(msg) {
  const pool = [
    'يا بطل، سؤالك رائع جداً! لكنني أحتاج لحظة للتفكير — هل تسألني سؤالاً آخر؟',
    'ما شاء الله على فضولك! يبدو أن الاتصال بطيء قليلاً اليوم. جرّب مرة أخرى!',
    'يا صديقي، دماغي يشتغل بسرعة كبيرة الآن! اسألني بعد لحظة من فضلك.',
    'سؤال ممتاز يا بطل! أحتاج لثانية، ثم سأجيبك بأحسن إجابة.',
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}
