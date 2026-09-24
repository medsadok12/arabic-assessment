// تشخيص مؤقت — يُحذَف فور انتهاء تتبّع مشكلة MEDIA_ERR_SRC_NOT_SUPPORTED.
import { head } from '@vercel/blob';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const meta = await head(url);
    const fileRes = await fetch(url);
    const buf = Buffer.from(await fileRes.arrayBuffer());
    return res.status(200).json({
      ...meta,
      fetchStatus: fileRes.status,
      fetchContentType: fileRes.headers.get('content-type'),
      fetchContentLength: fileRes.headers.get('content-length'),
      firstBytesHex: buf.subarray(0, 32).toString('hex'),
      actualByteLength: buf.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
