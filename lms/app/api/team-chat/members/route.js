import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient, fetchAllUsers } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'admin', 'super_admin'];

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
  if (!ALLOWED.includes(user.user_metadata?.role)) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  let users;
  try { users = await fetchAllUsers(admin); }
  catch (e) { return Response.json({ error: e.message }, { status: 500 }); }

  const members = users
    .filter(u => ALLOWED.includes(u.user_metadata?.role) && u.id !== user.id)
    .map(u => ({
      id:         u.id,
      name:       u.user_metadata?.full_name ?? u.email,
      role:       u.user_metadata?.role,
      avatar_url: u.user_metadata?.avatar_url ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  return Response.json({ members });
}
