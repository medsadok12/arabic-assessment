import { createAdminClient } from '../../../../lib/supabase-admin';
import { isAdmin } from '../../../../lib/auth-role';
import {
  json, requireSceneStaff, isMissingSchema, schemaResponse, RESPONSE_COLUMNS, studentEmailsOf,
  canReviewResponse, signStudentMedia, withMediaUrls,
} from '../../../../lib/scene-story-server';

export const dynamic = 'force-dynamic';

/* ?count=1 — عدد الحكايات التي تنتظر التقييم فقط (زر «حكايات الطلاب» في bogga
   ولوحة المعلم): بلا نصوص ولا روابط ملفات */
async function pendingCount(admin, user) {
  const { data, error } = await admin.from('scene_responses')
    .select('scene_id, student_email').eq('status', 'submitted').limit(2000);
  if (error) return isMissingSchema(error) ? json({ pending: 0, need_sql: true }) : json({ error: error.message }, 500);
  if (isAdmin(user)) return json({ pending: (data || []).length });
  const sceneIds = [...new Set((data || []).map(r => r.scene_id))];
  const { data: scenes } = sceneIds.length
    ? await admin.from('scenes').select('id, created_by').in('id', sceneIds)
    : { data: [] };
  const byId = Object.fromEntries((scenes || []).map(s => [s.id, s]));
  const myEmails = await studentEmailsOf(admin, user.id);
  return json({ pending: (data || []).filter(r => canReviewResponse(user, r, byId[r.scene_id], myEmails)).length });
}

// GET ?status=submitted|reviewed|all&scene=<id> — صندوق الحكايات:
// المشرف كل الردود، والمعلم ردود طلابه وردود مشاهده. الملفات بروابط موقَّعة لساعة.
export async function GET(req) {
  const { user, error: denied } = await requireSceneStaff();
  if (denied) return denied;
  const url = new URL(req.url);
  if (url.searchParams.get('count') === '1') return pendingCount(createAdminClient(), user);
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
