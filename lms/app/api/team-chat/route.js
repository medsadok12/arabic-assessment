import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { getRole } from '../../../lib/auth-role';

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'admin', 'super_admin'];

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
  if (!ALLOWED.includes(getRole(user))) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('team_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(120);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ messages: data ?? [] });
}

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
  if (!ALLOWED.includes(getRole(user))) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const { content, is_task = false, reply_to_id = null, reply_to_content = null, reply_to_sender = null } = await request.json();
  if (!content?.trim()) return Response.json({ error: 'الرسالة فارغة' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('team_messages')
    .insert({
      sender_id:       user.id,
      sender_name:     user.user_metadata?.full_name ?? user.email,
      sender_role:     getRole(user),
      sender_avatar:   user.user_metadata?.avatar_url ?? null,
      content:         content.trim(),
      is_task:         Boolean(is_task),
      reply_to_id,
      reply_to_content,
      reply_to_sender,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ message: data });
}

export async function DELETE(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
  if (!ALLOWED.includes(getRole(user))) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const { id } = await request.json().catch(() => ({}));
  if (!id) return Response.json({ error: 'id الرسالة مطلوب' }, { status: 400 });

  const admin = createAdminClient();
  const role  = getRole(user);
  const isAdmin = role === 'admin' || role === 'super_admin';

  // Admins can delete any message; others only their own
  let query = admin.from('team_messages').delete().eq('id', id);
  if (!isAdmin) query = query.eq('sender_id', user.id);

  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
