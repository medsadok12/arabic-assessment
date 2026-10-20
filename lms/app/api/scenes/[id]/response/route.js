import { createAdminClient } from '../../../../../lib/supabase-admin';
import {
  json, requireViewer, teacherIdsFor, isMissingSchema, schemaResponse, SCENE_COLUMNS, RESPONSE_COLUMNS,
  signStudentMedia, withMediaUrls, removeStudentMedia,
} from '../../../../../lib/scene-story-server';
import { sceneVisibleTo, sanitizeResponseInput, SUBMIT_POINTS } from '../../../../../lib/scene-story';
import { awardPoints } from '../../../../../lib/points-server';
import { notifyUser } from '../../../../../lib/notify';

export const dynamic = 'force-dynamic';

// PUT — ردّ الطالب على المشهد: ردّ واحد لكل مشهد، يُعدَّل حتى يقيّمه المعلم.
// أول إرسال: نقاط (مرة واحدة لكل مشهد) + إشعار لمعلمي الطالب ولمنشئ المشهد.
export async function PUT(req, { params }) {
  const admin = createAdminClient();
  const viewer = await requireViewer(admin, req);
  if (viewer.error) return viewer.error;
  if (!viewer.canSubmit) return json({ error: 'هذه معاينة للمعلم — الإرسال للطلاب فقط' }, 403);
  const studentId = viewer.identity.effectiveUserId;

  const { data: scene, error: sErr } = await admin.from('scenes').select(SCENE_COLUMNS).eq('id', params.id).maybeSingle();
  if (sErr) return isMissingSchema(sErr) ? schemaResponse() : json({ error: sErr.message }, 500);
  const teacherIds = await teacherIdsFor(admin, viewer.identity.effectiveEmail);
  if (!scene || !sceneVisibleTo(scene, { grade: viewer.grade, teacherIds })) return json({ error: 'هذا المشهد غير متاح الآن' }, 404);

  const { data: fields, error: invalid } = sanitizeResponseInput(await req.json().catch(() => null), scene, { studentId });
  if (invalid) return json({ error: invalid }, 400);

  const { data: current } = await admin.from('scene_responses').select(RESPONSE_COLUMNS)
    .eq('scene_id', scene.id).eq('student_id', studentId).maybeSingle();
  if (current?.status === 'reviewed') return json({ error: 'قرأ معلمك حكايتك وقيّمها — لا يمكن تعديلها الآن 🌟' }, 409);

  const row = {
    ...fields,
    scene_id: scene.id, student_id: studentId,
    student_email: viewer.identity.effectiveEmail, student_name: viewer.name, student_grade: viewer.grade,
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = current
    ? await admin.from('scene_responses').update(row).eq('id', current.id).select(RESPONSE_COLUMNS).single()
    : await admin.from('scene_responses').insert(row).select(RESPONSE_COLUMNS).single();
  if (error) return json({ error: 'تعذّر حفظ حكايتك — حاول مرة أخرى بعد لحظة' }, 500);

  // ملف استُبدل أو أُزيل ← يُحذف من التخزين الخاص
  if (current) {
    const dropped = ['audio_path', 'photo_path'].map(k => current[k]).filter(p => p && p !== saved.audio_path && p !== saved.photo_path);
    await removeStudentMedia(admin, dropped);
  }

  let points = null;
  if (!current) {
    const r = await awardPoints(admin, studentId, `scene_story:${scene.id}`, SUBMIT_POINTS, { dedup: true });
    points = r.success ? SUBMIT_POINTS : 0;
    const recipients = [...new Set([...teacherIds, scene.created_by].filter(Boolean))];
    await Promise.all(recipients.map(id => notifyUser(id, 'scene_story', `📝 حكاية جديدة من ${viewer.name}`, `على مشهد «${scene.title}»`, '/library/scenes/manage?tab=inbox')));
  }

  const urls = await signStudentMedia(admin, [saved.audio_path, saved.photo_path]);
  return json({ response: withMediaUrls(saved, urls), points, first: !current });
}
