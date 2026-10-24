import { createAdminClient } from '../../../../lib/supabase-admin';
import { json, requireWwStaff } from '../../../../lib/word-wheel-server';
import { STORY_AUDIO_TYPES, normalizeStoryAudioType, mediaPublicUrl } from '../../../../lib/story-audio';
import { WORD_MEDIA_PREFIX } from '../../../../lib/word-wheel';

export const dynamic = 'force-dynamic';

const IMAGE_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

// POST { kind: 'image'|'audio', type, fileName } — رابط رفع موقَّع لصورة كلمة أو نطقها:
// المتصفح يرفع الملف مباشرة إلى media/word-wheel/ (بلا حد Vercel 4.5MB ولا base64
// في القاعدة — القسم 9.1)، ثم يُحفظ الرابط العام في بطاقة الكلمة.
export async function POST(req) {
  const { error: denied } = await requireWwStaff();
  if (denied) return denied;

  const { kind, type, fileName } = (await req.json().catch(() => null)) || {};
  let contentType, ext;
  if (kind === 'image') {
    contentType = String(type || '').split(';')[0].trim().toLowerCase();
    ext = IMAGE_TYPES[contentType];
    if (!ext) return json({ error: 'الصورة يجب أن تكون WEBP أو JPG أو PNG' }, 400);
  } else if (kind === 'audio') {
    contentType = normalizeStoryAudioType(type, fileName);
    if (!contentType) return json({ error: 'نوع الملف غير مدعوم — استخدم MP3 أو M4A أو WAV أو WEBM أو OGG' }, 400);
    ext = STORY_AUDIO_TYPES[contentType];
  } else {
    return json({ error: 'نوع الرفع غير معروف' }, 400);
  }

  const path = `${WORD_MEDIA_PREFIX}${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await createAdminClient().storage.from('media').createSignedUploadUrl(path);
  if (error) return json({ error: error.message }, 500);
  return json({ signedUrl: data.signedUrl, publicUrl: mediaPublicUrl(path), contentType });
}
