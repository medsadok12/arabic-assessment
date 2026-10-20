import { createAdminClient } from '../../../../lib/supabase-admin';
import { isAdmin } from '../../../../lib/auth-role';
import {
  json, requireSceneStaff, isMissingSchema, schemaResponse, RESPONSE_COLUMNS, studentEmailsOf,
  canReviewResponse, signStudentMedia, withMediaUrls,
} from '../../../../lib/scene-story-server';

export const dynamic = 'force-dynamic';

// GET ?status=submitted|reviewed|all&scene=<id> — صندوق الحكايات:
// المشرف كل الردود، والمعلم ردود طلابه وردود مشاهده. الملفات بروابط موقَّعة لساعة.
export async function GET(req) {
  const { user, error: denied } = await requireSceneStaff();
  if (denied) return denied;
  const url = new URL(req.url);
  const status = ['submitted', 'reviewed'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : null;
  const sceneId = url.searchParams.get('scene');

  const admin = createAdminClient();
  let q = admin.from('scene_responses').select(RESPONSE_COLUMNS).order('updated_at', { ascending: false }).limit(300);
  if (status) q = q.eq('status', status);
  if (sceneId) q = q.eq('scene_id', sceneId);
  const { data, error } = await q;
  if (error) return isMissingSchema(error) ? schemaResponse() : json({ error: error.message }, 500);

  const sceneIds = [...new Set((data || []).map(r => r.scene_id))];
  const { data: scenes } = sceneIds.length
    ? await admin.from('scenes').select('id, title, image_url, created_by').in('id', sceneIds)
    : { data: [] };
  const byId = Object.fromEntries((scenes || []).map(s => [s.id, s]));
  const myEmails = isAdmin(user) ? [] : await studentEmailsOf(admin, user.id);
  const visible = (data || []).filter(r => canReviewResponse(user, r, byId[r.scene_id], myEmails));

  const urls = await signStudentMedia(admin, visible.flatMap(r => [r.audio_path, r.photo_path]));
  return json({
    responses: visible.map(r => {
      const s = byId[r.scene_id];
      return { ...withMediaUrls(r, urls), scene: s ? { id: s.id, title: s.title, image_url: s.image_url } : null };
    }),
  });
}
