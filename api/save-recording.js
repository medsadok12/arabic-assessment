import { put } from '@vercel/blob';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

function sanitize(val, max = 80) {
  return String(val ?? '').replace(/[<>&"'`/\\]/g, '').trim().slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { audioBase64, studentName: rawName, questionId } = req.body;

    if (!audioBase64)
      return res.status(400).json({ error: 'No audio data' });

    if (!process.env.BLOB_READ_WRITE_TOKEN)
      return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured in Vercel' });

    const studentName = sanitize(rawName || 'طالب');
    const uniqueId    = Date.now().toString(36).toUpperCase();
    const fileName    = `${studentName}_${sanitize(questionId ?? 'q', 40)}_${uniqueId}.webm`;
    const base64Data  = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const buffer      = Buffer.from(base64Data, 'base64');

    const blob = await put(`recordings/${fileName}`, buffer, {
      access:      'public',
      contentType: 'audio/webm',
    });

    return res.status(200).json({
      success:  true,
      url:      blob.url,
      fileName,
    });
  } catch (error) {
    console.error('Blob upload error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
