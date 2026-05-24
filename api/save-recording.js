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

    if (!process.env.APPS_SCRIPT_URL)
      return res.status(500).json({ error: 'APPS_SCRIPT_URL not configured in Vercel' });

    const studentName = sanitize(rawName || 'طالب');
    const uniqueId    = Date.now().toString(36).toUpperCase();
    const fileName    = `${studentName}_${questionId ?? 'q'}_${uniqueId}.webm`;
    const base64Data  = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;

    const response = await fetch(process.env.APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ audioBase64: base64Data, fileName }),
      redirect: 'follow',
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Apps Script error');

    return res.status(200).json({
      success:  true,
      url:      data.url,
      fileName: fileName,
    });
  } catch (error) {
    console.error('Drive upload error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
