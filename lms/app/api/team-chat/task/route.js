import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'admin', 'super_admin'];

export async function PATCH(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
  if (!ALLOWED.includes(user.user_metadata?.role)) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const { messageId, type } = await request.json();
  if (!messageId || !type) return Response.json({ error: 'بيانات ناقصة' }, { status: 400 });

  const table = type === 'dm' ? 'dm_messages' : 'team_messages';
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(table)
    .update({ task_status: 'completed' })
    .eq('id', messageId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ message: data });
}
