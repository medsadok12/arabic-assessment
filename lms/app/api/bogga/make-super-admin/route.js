import { NextResponse } from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient, fetchAllUsers } from '../../../../lib/supabase-admin';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 });

  const currentRole = user.user_metadata?.role;
  if (currentRole !== 'admin' && currentRole !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Check if a super_admin already exists in the system
  let allUsers;
  try { allUsers = await fetchAllUsers(admin); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }

  const existingSuperAdmin = allUsers.find(
    u => u.user_metadata?.role === 'super_admin' && u.id !== user.id
  );
  if (existingSuperAdmin) {
    return NextResponse.json({ error: 'يوجد مدير مطلق بالفعل في النظام' }, { status: 409 });
  }

  // Promote current user to super_admin
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, role: 'super_admin' },
    app_metadata:  { role: 'super_admin' },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
