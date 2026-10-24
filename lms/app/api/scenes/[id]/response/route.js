import { createAdminClient } from '../../../../../lib/supabase-admin';
import {
  json, requireViewer, teacherIdsFor, isMissingSchema, schemaResponse, SCENE_COLUMNS, RESPONSE_COLUMNS,
  signStudentMedia, withMediaUrls,
} from '../../../../../lib/scene-story-server';
import { sceneVisibleTo, sanitizeResponseInput, SUBMIT_POINTS } from '../../../../../lib/scene-story';
import { awardPoints } from '../../../../../lib/points-server';
import { notifyUser } from '../../../../../lib/notify';

export const dynamic = 'force-dynamic';

// PUT — ردّ الطالب على المشهد: إرسال واحد نهائي لكل مشهد (طلب الأستاذ محمد:
// بعد الإرسال ينظر الطالب في عمله فقط دون تغيير). نقاط مرة واحدة + إشعار لمعلمي
// الطالب ولمنشئ المشهد. إرسال ثانٍ ← 409.
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

  const { data: current } = await admin.from('scene_responses').select('id')
    .eq('scene_id', scene.id).eq('student_id', studentId).maybeSingle();
  const already = json({ error: 'أرسلت حكايتك لمعلمك من قبل — يمكنك قراءتها فقط 🌟' }, 409);
  if (current) return already;

  const { data: saved, error } = await admin.from('scene_responses').insert({
    ...fields,
    scene_id: scene.id, student_id: studentId,
    student_email: viewer.identity.effectiveEmail, student_name: viewer.name, student_grade: viewer.grade,
    updated_at: new Date().toISOString(),
  }).select(RESPONSE_COLUMNS).single();
  // إرسالان متزامنان (نقرتان سريعتان): القيد UNIQUE يرفض الثاني
  if (error) return error.code === '23505' ? already : json({ error: 'تعذّر حفظ حكايتك — حاول مرة أخرى بعد لحظة' }, 500);

  const r = await awardPoints(admin, studentId, `scene_story:${scene.id}`, SUBMIT_POINTS, { dedup: true });
  const recipients = [...new Set([...teacherIds, scene.created_by].filter(Boolean))];
  await Promise.all(recipients.map(id => notifyUser(id, 'scene_story', `📝 حكاية جديدة من ${viewer.name}`, `على مشهد «${scene.title}»`, '/library/scenes/manage?tab=inbox')));

  const urls = await signStudentMedia(admin, [saved.audio_path, saved.photo_path]);
  return json({ response: withMediaUrls(saved, urls), points: r.success ? SUBMIT_POINTS : 0 });
}
