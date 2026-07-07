import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'admin', 'super_admin'];

function makeKey(a, b) {
  return [a, b].sort().join('_');
}

export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
  if (!ALLOWED.includes(getRole(user))) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const otherId = searchParams.get('with');
  if (!otherId) return Response.json({ error: 'المستخدم مطلوب' }, { status: 400 });

  const ck = makeKey(user.id, otherId);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('dm_messages')
    .select('*')
    .eq('conv_key', ck)
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

  const { content, to, is_task = false, reply_to_id = null, reply_to_content = null, reply_to_sender = null } = await request.json();
  if (!content?.trim()) return Response.json({ error: 'الرسالة فارغة' }, { status: 400 });
  if (!to) return Response.json({ error: 'المستلم مطلوب' }, { status: 400 });

  const ck = makeKey(user.id, to);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('dm_messages')
    .insert({
      conv_key:        ck,
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

  const { searchParams } = new URL(request.url);
  const otherId = searchParams.get('with');
  if (!otherId) return Response.json({ error: 'المستخدم مطلوب' }, { status: 400 });

  const ck = makeKey(user.id, otherId);
  const admin = createAdminClient();
  const { error } = await admin.from('dm_messages').delete().eq('conv_key', ck);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
