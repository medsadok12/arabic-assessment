'use client';
import { childFetch, getActiveChildTab } from './child-fetch';
import { putToSignedUrl } from './story-audio-client';

/* ════════════════════════════════════════════════════════════════
   «مشهدٌ وحكاية» — مساعدات المتصفح: طلبات JSON ورفع الملفات.
   طلبات الطالب تمرّ عبر childFetch (هوية الطفل النشط في حسابات العائلة).
════════════════════════════════════════════════════════════════ */

const OFFLINE = 'تعذّر الاتصال — تحقّق من الإنترنت ثم أعد المحاولة';

/* طلب JSON ← { ok, status, data } بلا استثناء */
export async function sceneApi(url, { method = 'GET', body } = {}) {
  try {
    const res = await childFetch(url, {
      method,
      cache: 'no-store',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: OFFLINE } };
  }
}

/* رفع ملف عبر رابط موقَّع:
   image | prompt_audio (المعلم) ← الرابط العام
   audio | photo        (الطالب) ← مسار الملف في الدلو الخاص */
export async function uploadSceneFile(kind, blob, { sceneId, onProgress } = {}) {
  const { ok, data } = await sceneApi('/api/scenes/upload-url', {
    method: 'POST',
    body: { kind, type: blob.type, fileName: blob.name || '', sceneId },
  });
  if (!ok || !data.signedUrl) throw new Error(data.error || 'تعذّر تجهيز الرفع');
  await putToSignedUrl(data.signedUrl, blob, data.contentType, onProgress);
  return kind === 'audio' || kind === 'photo' ? data.path : data.publicUrl;
}

/* مسودة الطفل في هذا الجهاز (النص والشعور) — لا تضيع حكايته إن أُغلق المتصفح */
const draftKey = (sceneId) => `scene_draft:${sceneId}:${getActiveChildTab() || 'self'}`;
export function readSceneDraft(sceneId) {
  try { return JSON.parse(localStorage.getItem(draftKey(sceneId)) || 'null'); } catch { return null; }
}
export function writeSceneDraft(sceneId, draft) {
  try {
    if (!draft || (!draft.text && !draft.feeling)) localStorage.removeItem(draftKey(sceneId));
    else localStorage.setItem(draftKey(sceneId), JSON.stringify(draft));
  } catch {}
}

/* «قبل ساعة» — وقت نسبي ودود */
export function timeAgo(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return m <= 2 ? 'قبل دقيقة' : `قبل ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return h <= 1 ? 'قبل ساعة' : `قبل ${h} ساعات`;
  const d = Math.round(h / 24);
  if (d <= 1) return 'أمس';
  if (d < 30) return `قبل ${d} أيام`;
  return new Date(t).toLocaleDateString('ar', { day: 'numeric', month: 'long' });
}
