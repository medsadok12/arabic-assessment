import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

// PATCH /api/life-scene/[id] — publish/unpublish OR save edited dialogue
export async function PATCH(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
  const role = user.user_metadata?.role ?? '';
  if (!['teacher','super_admin','admin'].includes(role)) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const body = await request.json();
  const { is_published, dialogue } = body;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('life_scenes')
    .select('id, teacher_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!existing) return Response.json({ error: 'المشهد غير موجود' }, { status: 404 });
  // super_admin/admin can edit any scene; teachers only their own
  if (role === 'teacher' && existing.teacher_id !== user.id) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const patch = {};
  if (is_published !== undefined) {
    patch.is_published  = is_published;
    patch.published_at  = is_published ? new Date().toISOString() : null;
  }
  if (dialogue !== undefined) {
    patch.dialogue = dialogue;
  }

  const { data: scene, error } = await admin
    .from('life_scenes')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ scene });
}

// DELETE /api/life-scene/[id]
export async function DELETE(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
  const delRole = user.user_metadata?.role ?? '';
  if (!['teacher','super_admin','admin'].includes(delRole)) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('life_scenes')
    .select('id, teacher_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!existing) return Response.json({ error: 'المشهد غير موجود' }, { status: 404 });
  if (delRole === 'teacher' && existing.teacher_id !== user.id) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const { error } = await admin.from('life_scenes').delete().eq('id', params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
