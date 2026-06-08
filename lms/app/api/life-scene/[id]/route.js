import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

// PATCH /api/life-scene/[id] — publish / unpublish
export async function PATCH(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
  if (user.user_metadata?.role !== 'teacher') return Response.json({ error: 'للمعلمين فقط' }, { status: 403 });

  const { is_published } = await request.json();
  const admin = createAdminClient();

  // Verify ownership
  const { data: existing } = await admin
    .from('life_scenes')
    .select('id, teacher_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!existing) return Response.json({ error: 'المشهد غير موجود' }, { status: 404 });
  if (existing.teacher_id !== user.id) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const patch = {
    is_published,
    published_at: is_published ? new Date().toISOString() : null,
  };

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
  if (user.user_metadata?.role !== 'teacher') return Response.json({ error: 'للمعلمين فقط' }, { status: 403 });

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('life_scenes')
    .select('id, teacher_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!existing) return Response.json({ error: 'المشهد غير موجود' }, { status: 404 });
  if (existing.teacher_id !== user.id) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const { error } = await admin.from('life_scenes').delete().eq('id', params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
