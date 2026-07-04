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
      id:           u.id,
      name:         u.user_metadata?.full_name ?? '—',
      email:        u.email ?? '',
      role:         u.user_metadata?.role ?? 'student',
      status:       u.user_metadata?.status ?? 'active',
      avatar_url:   u.user_metadata?.avatar_url ?? null,
      created_at:   u.created_at,
      last_sign_in: u.last_sign_in_at ?? null,
      last_logout:  u.user_metadata?.last_logout_at ?? null,
      password:     u.app_metadata?.temp_password ?? null,
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return NextResponse.json({ users: list });
}

// PATCH — toggle active/suspended status for any non-super_admin user
export async function PATCH(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const { id, action } = await req.json(); // action: 'suspend' | 'activate'
  if (!id || !['suspend', 'activate'].includes(action)) {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const admin  = createAdminClient();
  const { data: { user: target }, error: fetchErr } = await admin.auth.admin.getUserById(id);
  if (fetchErr || !target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
  if (target.user_metadata?.role === 'super_admin') {
    return NextResponse.json({ error: 'لا يمكن تعديل حساب المدير' }, { status: 403 });
  }

  const newStatus = action === 'suspend' ? 'suspended' : 'active';
  const { error: updateErr } = await admin.auth.admin.updateUserById(id, {
    user_metadata: { ...target.user_metadata, status: newStatus },
  });
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ status: newStatus });
}
