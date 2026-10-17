'use client';
import { putToSignedUrl } from './story-audio-client';

/* رفع صورة كلمة أو نطقها إلى media/word-wheel/ عبر رابط موقَّع — يُرجع الرابط العام.
   kind: 'image' | 'audio' */
export async function uploadWordMedia(kind, blob, onProgress) {
  const res = await fetch('/api/word-wheel/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, type: blob.type, fileName: blob.name || '' }),
  });
  const up = await res.json().catch(() => ({}));
  if (!res.ok || !up.signedUrl) throw new Error(up.error || 'تعذّر تجهيز الرفع');
  await putToSignedUrl(up.signedUrl, blob, up.contentType, onProgress);
  return up.publicUrl;
}

/* طلب JSON لمسارات اللوحة ← { ok, status, data } بلا استثناء (رسالة ودّية عند انقطاع الشبكة) */
export async function wwApi(url, { method = 'GET', body } = {}) {
  try {
    const res = await fetch(url, {
      method,
      cache: 'no-store',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'تعذّر الاتصال — تحقّق من الإنترنت ثم أعد المحاولة' } };
  }
}
