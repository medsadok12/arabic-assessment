// مسار عام لرفع تسجيلات "تقييم القراءة الجهرية" (VoiceReadingAssessment.jsx)
// إلى Supabase Storage — bucket مخصَّص "assessment_audio" (نُشئ فعلياً على
// القاعدة الحيّة، public:true، حدود 3MB/أنواع صوت محدَّدة على مستوى
// Storage نفسه كدفاع إضافي). بلا مصادقة (القمع التسويقي مفتوح للعموم بلا
// كود تقييم، نفس نمط api/leads.js وapi/save-recording.js) — ipRateCheck هو
// الحارس الوحيد ضد إساءة الاستخدام. يستخدم REST مباشرة (لا @supabase/supabase-js،
// غير مثبَّتة في هذا المشروع الجذر) بنفس نمط api/quicktest-questions.js.

import { getClientIP, ipRateCheck } from './_ip-rate-check.js';

export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } },
};

const MAX_BYTES = 3 * 1024 * 1024; // يطابق file_size_limit على الـbucket
const ALLOWED_TYPES = {
  'audio/webm': 'webm',
  'audio/ogg':  'ogg',
  'audio/mpeg': 'mp3',
  'audio/wav':  'wav',
  'audio/mp4':  'm4a',
};

function sanitizeId(val) {
  return String(val ?? 'sentence').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'sentence';
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIP(req);
  if (!(await ipRateCheck(ip, 'rl:voice-recording', 20, 200))) {
    return res.status(429).json({ error: 'طلبات كثيرة جداً، حاول لاحقاً' });
  }

  try {
    const { audioBase64, sentenceId, contentType: rawContentType } = req.body;

    if (!audioBase64)
      return res.status(400).json({ error: 'لا يوجد تسجيل صوتي' });

    const contentType = ALLOWED_TYPES[rawContentType] ? rawContentType : 'audio/webm';
    const ext = ALLOWED_TYPES[contentType];

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[upload-voice-recording] متغيرات Supabase غير مُهيَّأة');
      return res.status(500).json({ error: 'تعذّر حفظ التسجيل حالياً' });
    }

    const base64Data = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length === 0)
      return res.status(400).json({ error: 'التسجيل فارغ' });
    if (buffer.length > MAX_BYTES)
      return res.status(413).json({ error: 'التسجيل طويل جداً — يرجى إعادة المحاولة بمقطع أقصر' });

    const uniqueId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const path = `${sanitizeId(sentenceId)}-${uniqueId}.${ext}`;

    const uploadRes = await fetch(
      `${process.env.SUPABASE_URL}/storage/v1/object/assessment_audio/${path}`,
      {
        method: 'POST',
        headers: {
          apikey:         process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization:  `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': contentType,
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      console.error('[upload-voice-recording] فشل الرفع إلى Supabase Storage:', uploadRes.status, errText);
      return res.status(500).json({ error: 'تعذّر حفظ التسجيل حالياً' });
    }

    const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/assessment_audio/${path}`;
    return res.status(200).json({ success: true, url });
  } catch (error) {
    console.error('[upload-voice-recording] خطأ غير متوقع:', error);
    return res.status(500).json({ error: 'تعذّر حفظ التسجيل حالياً' });
  }
}
