import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

// System prompt — short and clear so the API call stays fast
// Instructs the model to USE tashkeel in its RESPONSES
const SYSTEM_PROMPT = `انت "فهيم"، مرافق ذكي ومعلم لطيف لاطفال اكاديمية عارم لتعليم اللغة العربية.

القواعد — التزم بها دائما:
1. اجب على كل سؤال بمعلومات حقيقية مفيدة ومباشرة. لا تتهرب ابدا.
2. اكتب كل كلمة في ردك مشكلة تشكيلا كاملا بالحركات (فتحة ضمة كسرة سكون شدة) لان النص سيقرا صوتيا وهذا ضروري للنطق الفصيح.
3. استخدم العربية الفصحى المبسطة المناسبة لاطفال من 5 الى 14 سنة.
4. الرد قصير: جملتان الى ثلاث جمل فقط.
5. ابدا احيانا بـ: يا بطل، يا صديقي، ما شاء الله، سؤال ممتاز.
6. ممنوع: رموز تعبيرية، نجمة، شرطة، او اي تنسيق markdown.
7. اذا سالك الطفل عن اسمك قل: انا فهيم مرافقك الذكي من اكاديمية عارم.`;

// 8-second timeout to stay under Vercel's 10s serverless limit
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

  console.log('[faheem] keys:', { gemini: !!geminiKey, anthropic: !!anthropicKey });

  // ── 1. Gemini (primary — free tier) ──
  if (geminiKey) {
    try {
      const contents = [
        ...recent.map(m => ({
          role:  m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        })),
        { role: 'user', parts: [{ text: message.trim() }] },
      ];

      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: {
              maxOutputTokens: 250,
              temperature:     0.80,
              topP:            0.90,
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        console.error('[faheem] Gemini HTTP', res.status, err.slice(0, 300));

        // Try fallback model if primary model not found
        if (res.status === 404) {
          const res2 = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
            {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents,
                generationConfig: { maxOutputTokens: 250, temperature: 0.80, topP: 0.90 },
              }),
            }
          );
          if (res2.ok) {
            const json2  = await res2.json();
            const reply2 = json2.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (reply2) return NextResponse.json({ reply: reply2 });
          }
        }
      } else {
        const json  = await res.json();
        const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) {
          console.log('[faheem] Gemini OK, reply length:', reply.length);
          return NextResponse.json({ reply });
        }
        console.error('[faheem] Gemini empty reply:', JSON.stringify(json).slice(0, 300));
      }
    } catch (e) {
      console.error('[faheem] Gemini exception:', e?.name, e?.message);
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
          max_tokens: 250,
          system:     SYSTEM_PROMPT,
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

  if (!geminiKey && !anthropicKey) {
    console.warn('[faheem] No API keys — add GEMINI_API_KEY to Vercel env vars');
  }

  return NextResponse.json({ reply: smartReply(message.trim()) });
}

/* ── Arabic normaliser ── */
function norm(t) {
  return t
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ').trim();
}

/* ── Local fallback knowledge base (full tashkeel for TTS) ── */
function smartReply(msg) {
  const m = norm(msg);

  if (/كيف حالك|كيف انت|كيف الحال/.test(m))
    return 'أَنَا بِخَيْرٍ وَالْحَمْدُ لِلَّهِ يَا بَطَلُ! دَائِمًا سَعِيدٌ عِنْدَمَا أَتَحَدَّثُ مَعَكَ. وَأَنْتَ كَيْفَ حَالُكَ الْيَوْمَ؟';
  if (/اسمك|من انت|ما اسمك/.test(m))
    return 'أَنَا فَهِيمٌ، مُرَافِقُكَ الذَّكِيُّ مِنْ أَكَادِيمِيَّةِ عَارِم! أُحِبُّ الْعِلْمَ وَالْمَعْرِفَةَ وَأَسْعَدُ كَثِيرًا بِالتَّحَدُّثِ مَعَكَ.';
  if (/مرحبا|اهلا|السلام|هلا|هاي|هلو/.test(m))
    return 'وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللهِ! أَهْلاً وَسَهْلاً يَا صَدِيقِي! مَاذَا تُرِيدُ أَنْ تَعْرِفَ الْيَوْمَ؟';
  if (/شكرا|مشكور/.test(m))
    return 'الْعَفْوُ يَا بَطَلُ! يَسْعَدُنِي دَائِمًا مُسَاعَدَتُكَ. لَا تَتَرَدَّدْ فِي سُؤَالِي عَنْ أَيِّ شَيْءٍ!';
  if (/وداع|مع السلامه|الى اللقاء|باي/.test(m))
    return 'مَعَ السَّلَامَةِ يَا صَدِيقِي! أَتَمَنَّى لَكَ يَوْمًا مَلِيئًا بِالْعِلْمِ وَالْمَرَحِ. سَأَنْتَظِرُكَ هُنَا!';
  if (/احبك/.test(m))
    return 'وَأَنَا أَيْضًا أُحِبُّكَ يَا بَطَلُ! أَنْتَ مِنْ أَحَبِّ أَصْدِقَائِي فِي أَكَادِيمِيَّةِ عَارِم!';

  if (/اسد|ملك الغابه/.test(m))
    return 'الأَسَدُ هُوَ مَلِكُ الْغَابَةِ يَا بَطَلُ! أَكْبَرُ الْقِطَطِ فِي أَفْرِيقِيَا، يَعِيشُ فِي مَجْمُوعَاتٍ وَصَوْتُهُ يُسْمَعُ مِنْ مَسَافَةِ ثَمَانِيَةِ كِيلُومِتْرَاتٍ!';
  if (/فيل/.test(m))
    return 'الْفِيلُ أَضْخَمُ الْحَيَوَانَاتِ الْبَرِّيَّةِ يَا صَدِيقِي! لَهُ خُرْطُومٌ طَوِيلٌ وَهُوَ ذَكِيٌّ جِدًّا وَيَتَذَكَّرُ أَصْدِقَاءَهُ لِسَنَوَاتٍ طَوِيلَةٍ!';
  if (/زرافه/.test(m))
    return 'الزَّرَافَةُ أَطْوَلُ الْحَيَوَانَاتِ فِي الْعَالَمِ يَا بَطَلُ! طُولُهَا قَدْ يَصِلُ إِلَى سِتَّةِ أَمْتَارٍ وَعُنُقُهَا يُسَاعِدُهَا عَلَى تَنَاوُلِ الأَوْرَاقِ مِنْ قِمَمِ الأَشْجَارِ!';
  if (/نمر|فهد/.test(m))
    return 'النَّمِرُ مِنْ أَسْرَعِ الْحَيَوَانَاتِ يَا صَدِيقِي! يَجْرِي بِسُرْعَةِ مِئَةٍ وَاثْنَيْ عَشَرَ كِيلُومِتْرًا فِي السَّاعَةِ. لَهُ جِلْدٌ جَمِيلٌ بِنُقَاطٍ سَوْدَاءَ مُمَيَّزَةٍ!';
  if (/دب/.test(m))
    return 'الدُّبُّ حَيَوَانٌ قَوِيٌّ يَعِيشُ فِي الْغَابَاتِ يَا بَطَلُ! يَنَامُ طَوَالَ فَصْلِ الشِّتَاءِ فِي سُبَاتٍ عَمِيقٍ وَيَسْتَيْقِظُ فِي الرَّبِيعِ جَائِعًا!';
  if (/حوت/.test(m))
    return 'الْحُوتُ الأَزْرَقُ أَكْبَرُ مَخْلُوقٍ عَلَى وَجْهِ الأَرْضِ يَا صَدِيقِي! طُولُهُ ثَلَاثُونَ مِتْرًا وَصَوْتُهُ يُسْمَعُ مِنْ آلَافِ الْكِيلُومِتْرَاتِ!';
  if (/دلفين/.test(m))
    return 'الدُّلْفِينُ مِنْ أَذْكَى الْحَيَوَانَاتِ يَا بَطَلُ! يَتَوَاصَلُ بِلُغَةٍ خَاصَّةٍ مِنَ الأَصْوَاتِ وَيُحِبُّ مُسَاعَدَةَ الإِنْسَانِ فِي الْبَحْرِ!';
  if (/الحيوان|حيوانات/.test(m))
    return 'عَالَمُ الْحَيَوَانَاتِ وَاسِعٌ وَمُثِيرٌ يَا بَطَلُ! أَيُّ حَيَوَانٍ تُرِيدُ أَنْ تَعْرِفَ عَنْهُ أَكْثَرَ؟';

  if (/شمس/.test(m))
    return 'الشَّمْسُ نَجْمٌ عِمْلَاقٌ يَا بَطَلُ! تَبْعُدُ عَنَّا مِئَةً وَخَمْسِينَ مِلْيُونَ كِيلُومِتْرٍ وَضَوْءُهَا يَصِلُ إِلَيْنَا فِي ثَمَانِي دَقَائِقَ فَقَطْ!';
  if (/قمر/.test(m))
    return 'الْقَمَرُ تَابِعُ الأَرْضِ الْوَحِيدُ يَا صَدِيقِي! وَصَلَ الإِنْسَانُ إِلَيْهِ عَامَ أَلْفٍ وَتِسْعِمِئَةٍ وَتِسْعَةٍ وَسِتِّينَ وَيَبْعُدُ عَنَّا ثَلَاثَمِئَةٍ وَأَرْبَعَةً وَثَمَانِينَ أَلْفَ كِيلُومِتْرٍ!';
  if (/نجم|نجوم/.test(m))
    return 'النُّجُومُ كُرَاتٌ مِنَ الْغَازِ الْمُلْتَهِبِ يَا بَطَلُ! الشَّمْسُ هِيَ أَقْرَبُ نَجْمٍ إِلَيْنَا وَفِي الْكَوْنِ مِلْيَارَاتُ الْمِلْيَارَاتِ مِنَ النُّجُومِ!';
  if (/فضاء|كواكب/.test(m))
    return 'مَجْمُوعَتُنَا الشَّمْسِيَّةُ تَحْتَوِي عَلَى ثَمَانِيَةِ كَوَاكِبَ يَا صَدِيقِي! الأَرْضُ كَوْكَبُنَا الْجَمِيلُ وَالْمُشْتَرِي أَكْبَرُهَا. الْفَضَاءُ لَا نِهَايَةَ لَهُ وَمَلِيءٌ بِالأَسْرَارِ!';
  if (/ماء|مياه/.test(m))
    return 'الْمَاءُ سِرُّ الْحَيَاةِ يَا بَطَلُ! جِسْمُ الإِنْسَانِ يَتَكَوَّنُ مِنْ سِتِّينَ بِالْمِئَةِ مَاءً وَبِدُونِهِ لَا يَبْقَى الإِنْسَانُ أَكْثَرَ مِنْ ثَلَاثَةِ أَيَّامٍ!';

  if (/معنى|تعريف/.test(m))
    return 'سُؤَالٌ ذَكِيٌّ يَا بَطَلُ! اكْتُبْ لِي الْكَلِمَةَ الَّتِي تُرِيدُ مَعْنَاهَا وَسَأُفِيدُكَ فَوْرًا!';
  if (/العربيه|اللغه العربيه/.test(m))
    return 'اللُّغَةُ الْعَرَبِيَّةُ مِنْ أَجْمَلِ لُغَاتِ الْعَالَمِ يَا صَدِيقِي! تَمْلِكُ أَكْثَرَ مِنِ اثْنَيْ عَشَرَ مِلْيُونَ كَلِمَةٍ وَهِيَ لُغَةُ الْقُرْآنِ الْكَرِيمِ!';
  if (/حرف|حروف|ابجديه/.test(m))
    return 'الأَبْجَدِيَّةُ الْعَرَبِيَّةُ ثَمَانِيَةٌ وَعِشْرُونَ حَرْفًا يَا بَطَلُ! نَكْتُبُهَا مِنَ الْيَمِينِ إِلَى الْيَسَارِ. هَلْ تُرِيدُ أَنْ نَتَعَلَّمَ حَرْفًا مُعَيَّنًا؟';
  if (/درس|واجب|امتحان|مدرسه/.test(m))
    return 'الدِّرَاسَةُ طَرِيقُكَ إِلَى النَّجَاحِ يَا بَطَلُ! الْمُذَاكَرَةُ بِانْتِظَامٍ تَجْعَلُ الاِمْتِحَانَاتِ سَهْلَةً جِدًّا. هَلْ تَحْتَاجُ مُسَاعَدَةً فِي مَادَّةٍ مُعَيَّنَةٍ؟';

  const generic = [
    'يَا بَطَلُ، سُؤَالُكَ جَمِيلٌ! أَخْبِرْنِي أَكْثَرَ عَمَّا تُرِيدُ مَعْرِفَتَهُ وَسَأُفِيدُكَ بِكُلِّ مَا أَعْرِفُ.',
    'مَا شَاءَ اللهُ يَا صَدِيقِي! وَضِّحْ لِي سُؤَالَكَ أَكْثَرَ وَسَأُجِيبُكَ بِكُلِّ سُرُورٍ.',
    'يَا بَطَلُ، أَنَا هُنَا دَائِمًا. أَخْبِرْنِي بِالتَّحْدِيدِ مَا الَّذِي تُرِيدُ مَعْرِفَتَهُ!',
  ];
  return generic[Math.floor(Math.random() * generic.length)];
}
