import { createAdminClient } from '../../../lib/supabase-admin';
import {
  json, requireViewer, teacherIdsFor, isMissingSchema, SCENE_COLUMNS,
} from '../../../lib/scene-story-server';
import { sceneVisibleTo, effectiveBand, reviewStars } from '../../../lib/scene-story';

export const dynamic = 'force-dynamic';

// GET — مشاهد «مشهدٌ وحكاية» التي يراها هذا الطالب، مع حالة ردّه على كل منها.
// الطاقم يرى كل المشاهد الظاهرة (للمعاينة)، بما فيها المجدولة.
export async function GET(req) {
  const admin = createAdminClient();
  const viewer = await requireViewer(admin, req);
  if (viewer.error) return viewer.error;

  const { data: rows, error } = await admin
    .from('scenes').select(SCENE_COLUMNS).eq('is_active', true)
    .order('sort_order', { ascending: true }).order('publish_at', { ascending: false });
  if (error) return isMissingSchema(error) ? json({ scenes: [], need_sql: true }) : json({ error: error.message }, 500);

  let scenes = rows || [];
  if (!viewer.staff) {
    const teacherIds = await teacherIdsFor(admin, viewer.identity.effectiveEmail);
    scenes = scenes.filter(s => sceneVisibleTo(s, { grade: viewer.grade, teacherIds }));
  }

  const mine = {};
  if (scenes.length && viewer.canSubmit) {
    const { data } = await admin.from('scene_responses')
      .select('scene_id, status, review, updated_at')
      .eq('student_id', viewer.identity.effectiveUserId)
      .in('scene_id', scenes.map(s => s.id));
    for (const r of data || []) mine[r.scene_id] = { status: r.status, stars: r.status === 'reviewed' ? reviewStars(r.review) : null, updated_at: r.updated_at };
  }

  return json({
    is_staff: viewer.staff,
    scenes: scenes.map(s => ({
      id: s.id, title: s.title, image_url: s.image_url, prompt: s.prompt, modes: s.modes,
      band: effectiveBand(s, viewer.grade), publish_at: s.publish_at,
      scheduled: Date.parse(s.publish_at) > Date.now(),
      mine: mine[s.id] || null,
    })),
  });
}
