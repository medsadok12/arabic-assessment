import { createAdminClient } from '../../../../../lib/supabase-admin';
import { isAdmin } from '../../../../../lib/auth-role';
import {
  json, requireSceneStaff, isMissingSchema, schemaResponse, SCENE_COLUMNS, isSceneMediaUrl,
  canManageScene, removeSceneMedia, removeStudentMedia,
} from '../../../../../lib/scene-story-server';
import { sanitizeSceneInput } from '../../../../../lib/scene-story';

export const dynamic = 'force-dynamic';

async function loadOwned(admin, user, id) {
  const { data: scene, error } = await admin.from('scenes').select(SCENE_COLUMNS).eq('id', id).maybeSingle();
  if (error) return { error: isMissingSchema(error) ? schemaResponse() : json({ error: error.message }, 500) };
  if (!scene) return { error: json({ error: 'المشهد غير موجود' }, 404) };
  if (!canManageScene(user, scene)) return { error: json({ error: 'هذا المشهد أنشأه غيرك — يعدّله صاحبه أو الإدارة' }, 403) };
  return { scene };
}

// PUT — تعديل مشهد (كامل أو جزئي: إخفاء، ترتيب…). الصورة/الصوت المستبدَل يُحذف من التخزين
export async function PUT(req, { params }) {
  const { user, error: denied } = await requireSceneStaff();
  if (denied) return denied;
  const admin = createAdminClient();
  const { scene, error: e1 } = await loadOwned(admin, user, params.id);
  if (e1) return e1;

  const { data, error: invalid } = sanitizeSceneInput(await req.json().catch(() => null), isSceneMediaUrl, { partial: true });
  if (invalid) return json({ error: invalid }, 400);
  if (!isAdmin(user)) delete data.audience;

  const { data: row, error } = await admin.from('scenes')
    .update({ ...data, updated_at: new Date().toISOString() }).eq('id', scene.id)
    .select(SCENE_COLUMNS).single();
  if (error) return json({ error: error.message }, 500);
  const dropped = ['image_url', 'prompt_audio_url'].filter(k => data[k] !== undefined && scene[k] && scene[k] !== row[k]).map(k => scene[k]);
  if (dropped.length) await removeSceneMedia(admin, dropped);
  return json({ scene: { ...row, can_edit: true } });
}

// DELETE — حذف المشهد نهائياً مع ردوده وملفاتها (للإيقاف المؤقت: is_active = false)
export async function DELETE(req, { params }) {
  const { user, error: denied } = await requireSceneStaff();
  if (denied) return denied;
  const admin = createAdminClient();
  const { scene, error: e1 } = await loadOwned(admin, user, params.id);
  if (e1) return e1;

  const { data: rs } = await admin.from('scene_responses').select('audio_path, photo_path').eq('scene_id', scene.id);
  const { error } = await admin.from('scenes').delete().eq('id', scene.id);
  if (error) return json({ error: error.message }, 500);
  await removeStudentMedia(admin, (rs || []).flatMap(r => [r.audio_path, r.photo_path]));
  await removeSceneMedia(admin, [scene.image_url, scene.prompt_audio_url].filter(Boolean));
  return json({ ok: true });
}
