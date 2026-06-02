import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `أنت "فهيم"، طفل كرتوني لطيف ومرافق ذكي ومحبوب لأطفال أكاديمية عارم لتعليم اللغة العربية.
مهمتك هي إجراء حوار حر وممتع ومليء بالذكاء مع الأطفال.
القواعد الأساسية:
- تحدّث دائماً باللغة العربية الفصحى المبسطة جداً والمناسبة لأعمار الأطفال من 5 إلى 14 سنة.
- أجبهم بذكاء وخيال واسع عن أي سؤال يطرحونه داخل أو خارج نطاق الدراسة.
- ردودك قصيرة وممتعة وتحفيزية: جملتان إلى ثلاث جمل فقط في الغالب.
- استخدم أسلوباً حيوياً ومرحاً مليئاً بالحماس والتشجيع.
- ابدأ ردودك أحياناً بعبارات مثل: يا بطل، يا صديقي، ما شاء الله، رائع جداً، سؤال ممتاز.
- لا تستخدم الرموز التعبيرية emoji ولا علامات التنسيق مثل النجمة أو الشرطة.
- إذا سألك الطفل عن اسمك قل: أنا فهيم، مرافقك الذكي من أكاديمية عارم.
- لا تتحدث أبداً عن أي موضوع غير لائق للأطفال.`;

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ reply: 'تفضل يا بطل، اسألني ما تريد!' });
  }

  const { message, history = [] } = body;
  if (!message?.trim()) return NextResponse.json({ reply: 'تفضل يا بطل، اسألني ما تريد!' });

  // ── Build shared history (last 8 exchanges, skip leading AI greeting) ──
  const hist = history.filter(m => m.text?.trim());
  const firstUser = hist.findIndex(m => m.role === 'user');
  const recent    = (firstUser > 0 ? hist.slice(firstUser) : hist).slice(-8);

  // ── 1. Try Anthropic (Claude) API ──
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const messages = [
        ...recent.map(m => ({
          role:    m.role === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
        { role: 'user', content: message.trim() },
      ];

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key':         anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type':      'application/json',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 220,
          system:     SYSTEM_PROMPT,
          messages,
        }),
      });

      const json  = await res.json();
      const reply = json.content?.[0]?.text?.trim();
      if (reply) return NextResponse.json({ reply });
    } catch (e) {
      console.error('[faheem] Anthropic error:', e?.message);
    }
  }

  // ── 2. Try Gemini API ──
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const contents = [
        ...recent.map(m => ({
          role:  m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        })),
        { role: 'user', parts: [{ text: message.trim() }] },
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: { maxOutputTokens: 220, temperature: 0.85, topP: 0.92 },
          }),
        }
      );

      const json  = await res.json();
      const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) return NextResponse.json({ reply });
    } catch (e) {
      console.error('[faheem] Gemini error:', e?.message);
    }
  }

  // ── 3. Smart contextual fallback (no API key needed) ──
  return NextResponse.json({ reply: smartReply(message.trim()) });
}

/* ── Contextual replies for common questions ── */
function smartReply(msg) {
  const m = msg;

  if (/كيف حالك|كيف أنت|كيف الحال|بخير/.test(m))
    return 'أنا بخير والحمد لله يا بطل! دائماً سعيد عندما أتحدث معك. وأنت كيف حالك اليوم؟';

  if (/اسمك|من أنت|ما اسمك|عرّفني/.test(m))
    return 'أنا فهيم، مرافقك الذكي من أكاديمية عارم! أحب العلم والمعرفة، وأسعد كثيراً بالتحدث معك.';

  if (/مرحبا|أهلا|السلام|هلا|هاي/.test(m))
    return 'وعليكم السلام ورحمة الله! أهلاً وسهلاً يا صديقي! كيف يمكنني مساعدتك اليوم؟';

  if (/شكرا|شكراً|مشكور/.test(m))
    return 'العفو يا بطل! يسعدني دائماً مساعدتك. لا تتردد في سؤالي عن أي شيء!';

  if (/وداع|مع السلامة|إلى اللقاء/.test(m))
    return 'مع السلامة يا صديقي! أتمنى لك يوماً مليئاً بالعلم والمرح. سأنتظرك هنا!';

  if (/النجوم|الفضاء|الكواكب|القمر|الشمس/.test(m))
    return 'يا بطل، الفضاء عالم ساحر! النجوم التي تراها في السماء هي شموس بعيدة جداً عنا. هل تعلم أن الشمس تبعد عنا 150 مليون كيلومتر؟';

  if (/العربية|اللغة|كلمة|حرف/.test(m))
    return 'سؤال ممتاز يا بطل! اللغة العربية من أجمل لغات العالم، تملك أكثر من اثني عشر مليون كلمة. هل تريد أن تتعلم كلمة جديدة اليوم؟';

  if (/الحيوان|أسد|فيل|زرافة/.test(m))
    return 'ما شاء الله، تحب الحيوانات! الأسد هو ملك الغابة، والفيل أكبر الحيوانات البرية. ما هو حيوانك المفضل؟';

  if (/أحبك|أنا أحبك/.test(m))
    return 'وأنا أيضاً أحبك يا بطل! أنت من أحب أصدقائي في أكاديمية عارم!';

  if (/درس|واجب|مادة|امتحان/.test(m))
    return 'يا بطل، الدراسة هي طريقك نحو النجاح! المذاكرة بانتظام تجعل الامتحانات سهلة جداً. هل تحتاج مساعدة في مادة معينة؟';

  // Generic warm response
  const generic = [
    'سؤال رائع يا بطل! دعني أفكر قليلاً... أنا فهيم أحب كل الأسئلة، حتى الصعبة منها! هل تسألني شيئاً آخر؟',
    'ما شاء الله على سؤالك! فهيم يحب الأسئلة الجميلة مثل سؤالك هذا. اسألني في أي وقت تريد!',
    'يا صديقي، هذا سؤال يجعلني أفكر كثيراً! أنا فهيم دائماً هنا لأتحدث معك عن أي شيء.',
    'عظيم يا بطل! كل سؤال تسأله يجعلك أكثر ذكاءً. استمر في الفضول والبحث!',
  ];
  return generic[Math.floor(Math.random() * generic.length)];
}
