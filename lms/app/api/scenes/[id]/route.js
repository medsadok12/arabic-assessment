import { createAdminClient } from '../../../../lib/supabase-admin';
import {
  json, requireViewer, teacherIdsFor, isMissingSchema, schemaResponse,
  SCENE_COLUMNS, RESPONSE_COLUMNS, signStudentMedia, withMediaUrls,
} from '../../../../lib/scene-story-server';
import { sceneVisibleTo, effectiveBand } from '../../../../lib/scene-story';

export const dynamic = 'force-dynamic';

// GET — مشهد واحد كما يراه الطفل + ردّه (بروابط ملفاته الموقَّعة) وتقييم معلمه
export async function GET(req, { params }) {
  const admin = createAdminClient();
  const viewer = await requireViewer(admin, req);
  if (viewer.error) return viewer.error;

  const { data: scene, error } = await admin.from('scenes').select(SCENE_COLUMNS).eq('id', params.id).maybeSingle();
  if (error) return isMissingSchema(error) ? schemaResponse() : json({ error: error.message }, 500);
  const notFound = json({ error: 'هذا المشهد غير متاح الآن' }, 404);
  if (!scene) return notFound;
  if (!viewer.staff) {
    const teacherIds = await teacherIdsFor(admin, viewer.identity.effectiveEmail);
    if (!sceneVisibleTo(scene, { grade: viewer.grade, teacherIds })) return notFound;
  }

  let response = null;
  if (viewer.canSubmit) {
    const { data } = await admin.from('scene_responses').select(RESPONSE_COLUMNS)
      .eq('scene_id', scene.id).eq('student_id', viewer.identity.effectiveUserId).maybeSingle();
    if (data) response = withMediaUrls(data, await signStudentMedia(admin, [data.audio_path, data.photo_path]));
  }

  // من أنشأ المشهد ولمن — لا يحتاجه الطفل
  const publicScene = { ...scene };
  delete publicScene.created_by;
  delete publicScene.audience;
  return json({
    scene: publicScene,
    band: effectiveBand(scene, viewer.grade),
    response,
    can_submit: viewer.canSubmit,
    student_name: viewer.name,
  });
}
