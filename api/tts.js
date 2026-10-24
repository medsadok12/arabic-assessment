// محرك الصوت الحقيقي لأسئلة الاستماع/التمييز الصوتي — يستبدل الاعتماد على
// window.speechSynthesis (يختلف من متصفح لآخر ويفتقر لصوت عربي أحياناً).
// نفس نمط lms/app/api/faheem/tts/route.js (Azure Neural TTS مُثبَت فعلياً
// في الإنتاج)، مُكيَّف هنا كدالة Vercel عامة بلا مصادقة (لا حساب مستخدم في
// أداة التقييم) بدل مسار Next.js محمي بجلسة Supabase.

function xmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function azureTTS(text) {
  const key    = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';
  const voice  = process.env.AZURE_SPEECH_VOICE  || 'ar-SA-HamedNeural';
  if (!key) return null;

  const ssml =
    `<speak version='1.0' xml:lang='ar-SA'>` +
    `<voice name='${voice}'>` +
    `<prosody rate='-6%' pitch='+4%'>${xmlEscape(text)}</prosody>` +
    `</voice></speak>`;

  const res = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type':              'application/ssml+xml',
        'X-Microsoft-OutputFormat':  'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent':                'areem-assessment-tts',
      },
      body: ssml,
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Azure TTS HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function googleTTS(text) {
  const url =
    `https://translate.google.com/translate_tts` +
    `?ie=UTF-8&tl=ar&client=tw-ob&ttsspeed=0.85&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer':         'https://translate.google.com/',
      'Accept-Language': 'ar,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  const text = String(req.query.t ?? '').trim().slice(0, 500);
  if (!text) return res.status(400).json({ error: 'لا يوجد نص للنطق' });

  try {
    const audio = (await azureTTS(text).catch((e) => {
      console.error('[tts] Azure failed, falling back to Google:', e.message);
      return null;
    })) ?? (await googleTTS(text));

    res.setHeader('Content-Type', 'audio/mpeg');
    // النص ثابت لكل سؤال (يتغيّر فقط عبر نشر كود جديد) — كاش طويل الأمد آمن
    // ويقلّل نداءات Azure الفعلية إلى الحد الأدنى بعد أول طلب لكل نص.
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    return res.status(200).send(audio);
  } catch (error) {
    console.error('[tts] both engines failed:', error.message);
    return res.status(502).json({ error: 'تعذّر توليد الصوت حالياً' });
  }
}
