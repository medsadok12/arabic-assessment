import { createAdminClient } from '../../../../lib/supabase-admin';
import {
  json, requireViewer, teacherIdsFor, SCENE_STAFF, isMissingSchema, schemaResponse, SCENE_COLUMNS,
} from '../../../../lib/scene-story-server';
import { STORY_AUDIO_TYPES, normalizeStoryAudioType, mediaPublicUrl } from '../../../../lib/story-audio';
import {
  SCENE_MEDIA_PREFIX, STUDENT_MEDIA_BUCKET, studentMediaPrefix, sceneVisibleTo, canonicalAudio,
} from '../../../../lib/scene-story';

export const dynamic = 'force-dynamic';

const IMAGE_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const rand = () => Math.random().toString(36).slice(2, 8).padEnd(6, '0');

/* نوع الملف وامتداده — صورة أو صوت */
function fileKind(kind, type, fileName) {
  if (kind === 'image' || kind === 'photo') {
    const contentType = String(type || '').split(';')[0].trim().toLowerCase();
    return IMAGE_TYPES[contentType] ? { contentType, ext: IMAGE_TYPES[contentType] } : null;
  }
  const t = normalizeStoryAudioType(type, fileName);
  return t ? canonicalAudio(STORY_AUDIO_TYPES[t]) : null;
}

// POST { kind, type, fileName, sceneId? } — رابط رفع موقَّع (القسم 9.1: لا base64، لا حد 4.5MB):
//   image | prompt_audio  (المعلم/الإدارة) ← media/scenes/... رابط عام لصورة المشهد وصوت سؤاله
//   audio | photo         (الطالب)         ← الدلو الخاص student-work/<طالب>/<مشهد>/... لا يُفتح إلا بروابط موقَّعة
export async function POST(req) {
  const admin = createAdminClient();
  const viewer = await requireViewer(admin, req);
  if (viewer.error) return viewer.error;

  const { kind, type, fileName, sceneId } = (await req.json().catch(() => null)) || {};
  if (!['image', 'prompt_audio', 'audio', 'photo'].includes(kind)) return json({ error: 'نوع الرفع غير معروف' }, 400);
  const file = fileKind(kind, type, fileName);
  if (!file) return json({ error: kind === 'image' || kind === 'photo' ? 'الصورة يجب أن تكون JPG أو PNG أو WEBP' : 'نوع الصوت غير مدعوم — MP3 أو M4A أو WAV أو WEBM' }, 400);

  if (kind === 'image' || kind === 'prompt_audio') {
    if (!SCENE_STAFF.includes(viewer.role)) return json({ error: 'رفع صور المشاهد للمعلمين والإدارة فقط' }, 403);
    const path = `${SCENE_MEDIA_PREFIX}${kind === 'image' ? 'image' : 'audio'}/${Date.now()}-${rand()}.${file.ext}`;
    const { data, error } = await admin.storage.from('media').createSignedUploadUrl(path);
    if (error) return json({ error: error.message }, 500);
    return json({ signedUrl: data.signedUrl, publicUrl: mediaPublicUrl(path), contentType: file.contentType });
  }

  if (!viewer.canSubmit) return json({ error: 'هذه معاينة للمعلم — الإرسال للطلاب فقط' }, 403);
  const { data: scene, error: sErr } = await admin.from('scenes').select(SCENE_COLUMNS).eq('id', String(sceneId || '')).maybeSingle();
  if (sErr) return isMissingSchema(sErr) ? schemaResponse() : json({ error: sErr.message }, 500);
  const teacherIds = await teacherIdsFor(admin, viewer.identity.effectiveEmail);
  if (!scene || !sceneVisibleTo(scene, { grade: viewer.grade, teacherIds })) return json({ error: 'هذا المشهد غير متاح الآن' }, 404);

  const path = `${studentMediaPrefix(viewer.identity.effectiveUserId, scene.id)}${kind}-${Date.now()}-${rand()}.${file.ext}`;
  const { data, error } = await admin.storage.from(STUDENT_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error) return json({ error: 'تعذّر تجهيز الرفع — حاول مرة أخرى' }, 500);
  return json({ signedUrl: data.signedUrl, path, contentType: file.contentType });
}
