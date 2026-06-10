import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'admin', 'super_admin'];

export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
  if (!ALLOWED.includes(user.user_metadata?.role)) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');
  if (!since) return Response.json({ groupMsgs: [], dmMsgs: [] });

  const admin = createAdminClient();
  const [{ data: groupMsgs }, { data: dmMsgs }] = await Promise.all([
    admin
      .from('team_messages')
      .select('*')
      .neq('sender_id', user.id)
      .gt('created_at', since)
      .order('created_at', { ascending: true })
      .limit(50),
    admin
      .from('dm_messages')
      .select('*')
      .neq('sender_id', user.id)
      .like('conv_key', `%${user.id}%`)
      .gt('created_at', since)
      .order('created_at', { ascending: true })
      .limit(50),
  ]);

  return Response.json({
    groupMsgs: groupMsgs ?? [],
    dmMsgs:    dmMsgs    ?? [],
  });
}
