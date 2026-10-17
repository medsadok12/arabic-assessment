'use client';
import { putToSignedUrl } from './story-audio-client';

/* رفع صورة حرف أو صوته إلى media/huroof/ عبر رابط موقَّع — يُرجع الرابط العام.
   kind: 'image' | 'letter_audio' | 'sentence_audio' */
export async function uploadHuroofMedia(idx, kind, blob, onProgress) {
  const res = await fetch('/api/huroof/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idx, kind, type: blob.type, fileName: blob.name || '' }),
  });
  const up = await res.json().catch(() => ({}));
  if (!res.ok || !up.signedUrl) throw new Error(up.error || 'تعذّر تجهيز الرفع');
  await putToSignedUrl(up.signedUrl, blob, up.contentType, onProgress);
  return up.publicUrl;
}
