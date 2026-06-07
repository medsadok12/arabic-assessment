import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

// GET — list all users (students, teachers, supervisors)
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = users
    .filter(u => u.user_metadata?.role !== 'super_admin')
    .map(u => ({
      id:         u.id,
      name:       u.user_metadata?.full_name ?? '—',
      email:      u.email ?? '',
      role:       u.user_metadata?.role ?? 'student',
      status:     u.user_metadata?.status ?? 'active',
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return NextResponse.json({ users: list });
}
