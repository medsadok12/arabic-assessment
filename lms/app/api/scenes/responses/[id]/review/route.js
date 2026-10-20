import { createAdminClient } from '../../../../../../lib/supabase-admin';
import { isAdmin } from '../../../../../../lib/auth-role';
import {
  json, requireSceneStaff, isMissingSchema, schemaResponse, RESPONSE_COLUMNS, studentEmailsOf,
  canReviewResponse, signStudentMedia, withMediaUrls,
} from '../../../../../../lib/scene-story-server';
import { sanitizeReview, reviewStars, reviewPoints } from '../../../../../../lib/scene-story';
import { awardPoints } from '../../../../../../lib/points-server';
import { notifyUser } from '../../../../../../lib/notify';

export const dynamic = 'force-dynamic';

// PUT { idea, words, order, stickers[], comment } — تقييم المعلم: نجوم + ملصقات + تعليق.
// أول تقييم: نقاط بعدد النجوم للطالب (مرة واحدة) + إشعار له. تعديل التقييم لا يكرر النقاط.
export async function PUT(req, { params }) {
  const { user, error: denied } = await requireSceneStaff();
  if (denied) return denied;
  const admin = createAdminClient();

  const { data: current, error: rErr } = await admin.from('scene_responses').select(RESPONSE_COLUMNS).eq('id', params.id).maybeSingle();
  if (rErr) return isMissingSchema(rErr) ? schemaResponse() : json({ error: rErr.message }, 500);
  if (!current) return json({ error: 'الحكاية غير موجودة' }, 404);
  const { data: scene } = await admin.from('scenes').select('id, title, created_by').eq('id', current.scene_id).maybeSingle();
  const myEmails = isAdmin(user) ? [] : await studentEmailsOf(admin, user.id);
  if (!canReviewResponse(user, current, scene, myEmails)) return json({ error: 'تقييم هذه الحكاية لمعلم الطالب أو الإدارة' }, 403);

  const { review, error: invalid } = sanitizeReview(await req.json().catch(() => null));
  if (invalid) return json({ error: invalid }, 400);

  const { data: saved, error } = await admin.from('scene_responses')
    .update({ status: 'reviewed', review, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', current.id).select(RESPONSE_COLUMNS).single();
  if (error) return json({ error: error.message }, 500);

  if (current.status !== 'reviewed') {
    await awardPoints(admin, current.student_id, `scene_review:${current.id}`, reviewPoints(review), { dedup: true });
    await notifyUser(current.student_id, 'scene_review', '⭐ قرأ معلمك حكايتك!',
      `${reviewStars(review)} نجوم على «${scene?.title || 'مشهدٌ وحكاية'}»`, `/library/scenes/${current.scene_id}`);
  }

  const urls = await signStudentMedia(admin, [saved.audio_path, saved.photo_path]);
  return json({ response: { ...withMediaUrls(saved, urls), scene: scene ? { id: scene.id, title: scene.title } : null } });
}
