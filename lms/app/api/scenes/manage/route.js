import { createAdminClient } from '../../../../lib/supabase-admin';
import { isAdmin } from '../../../../lib/auth-role';
import {
  json, requireSceneStaff, isMissingSchema, schemaResponse, SCENE_COLUMNS, isSceneMediaUrl,
  canManageScene, studentEmailsOf,
} from '../../../../lib/scene-story-server';
import { sanitizeSceneInput } from '../../../../lib/scene-story';

export const dynamic = 'force-dynamic';

// GET — مشاهد اللوحة: المشرف يرى الكل، والمعلم يرى مشاهد الإدارة العامة ومشاهده.
// مع عدد الردود وما ينتظر التقييم (مما يحق له رؤيته).
export async function GET() {
  const { user, error: denied } = await requireSceneStaff();
  if (denied) return denied;
  const admin = createAdminClient();
  const { data, error } = await admin.from('scenes').select(SCENE_COLUMNS)
    .order('sort_order', { ascending: true }).order('publish_at', { ascending: false });
  if (error) return isMissingSchema(error) ? schemaResponse() : json({ error: error.message }, 500);

  const all = isAdmin(user);
  const scenes = (data || []).filter(s => all || s.audience === 'all' || s.created_by === user.id);
  const counts = {};
  if (scenes.length) {
    const myEmails = all ? null : await studentEmailsOf(admin, user.id);
    const { data: rs } = await admin.from('scene_responses').select('scene_id, status, student_email').in('scene_id', scenes.map(s => s.id));
    const byId = Object.fromEntries(scenes.map(s => [s.id, s]));
    for (const r of rs || []) {
      if (!all && !myEmails.includes((r.student_email || '').toLowerCase()) && byId[r.scene_id]?.created_by !== user.id) continue;
      const c = counts[r.scene_id] || (counts[r.scene_id] = { total: 0, pending: 0 });
      c.total++; if (r.status === 'submitted') c.pending++;
    }
  }
  return json({
    is_admin: all,
    scenes: scenes.map(s => ({ ...s, can_edit: canManageScene(user, s), counts: counts[s.id] || { total: 0, pending: 0 } })),
  });
}

// POST — مشهد جديد. مشاهد المعلم لطلابه دائماً؛ الإدارة تختار (للجميع افتراضاً)
export async function POST(req) {
  const { user, error: denied } = await requireSceneStaff();
  if (denied) return denied;
  const { data, error: invalid } = sanitizeSceneInput(await req.json().catch(() => null), isSceneMediaUrl);
  if (invalid) return json({ error: invalid }, 400);
  if (!isAdmin(user)) data.audience = 'mine';

  const admin = createAdminClient();
  const { data: row, error } = await admin.from('scenes')
    .insert({ ...data, created_by: user.id, updated_at: new Date().toISOString() })
    .select(SCENE_COLUMNS).single();
  if (error) return isMissingSchema(error) ? schemaResponse() : json({ error: error.message }, 500);
  return json({ scene: { ...row, can_edit: true, counts: { total: 0, pending: 0 } } });
}
