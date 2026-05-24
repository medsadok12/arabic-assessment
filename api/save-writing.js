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
    const { imageBase64, studentName: rawName, questionId, fileName: rawFileName } = req.body;

    if (!imageBase64)
      return res.status(400).json({ error: 'No image data' });

    if (!process.env.APPS_SCRIPT_URL)
      return res.status(500).json({ error: 'APPS_SCRIPT_URL not configured in Vercel' });

    const studentName = sanitize(rawName || 'طالب');
    const uniqueId    = Date.now().toString(36).toUpperCase();
    const fileName    = rawFileName || `${studentName}_${questionId ?? 'writing'}_${uniqueId}.jpg`;

    const response = await fetch(process.env.APPS_SCRIPT_URL, {
      method:   'POST',
      headers:  { 'Content-Type': 'application/json' },
      body:     JSON.stringify({ audioBase64: imageBase64, fileName }),
      redirect: 'follow',
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Apps Script error');

    return res.status(200).json({ success: true, url: data.url, fileName });
  } catch (error) {
    console.error('Drive image upload error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
