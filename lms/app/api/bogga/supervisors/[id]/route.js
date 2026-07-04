import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { cleanupUserData }   from '../../../../../lib/cleanup-user';

// DELETE — remove a supervisor account
export async function DELETE(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const { id } = params;
  if (!id) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 });

  const admin = createAdminClient();
  const { data: { user: target }, error: fetchErr } = await admin.auth.admin.getUserById(id);
  if (fetchErr || !target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
  if (target.user_metadata?.role !== 'supervisor') {
    return NextResponse.json({ error: 'لا يمكن حذف هذا الحساب' }, { status: 400 });
  }

  await cleanupUserData(id, target.email, admin);
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// PATCH — suspend or activate a supervisor account
export async function PATCH(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const { action } = await req.json();
  if (!['suspend', 'activate'].includes(action)) {
    return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 });
  }

  const { id } = params;
  if (!id) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 });

  const admin = createAdminClient();
  const { data: { user: target }, error: fetchErr } = await admin.auth.admin.getUserById(id);
  if (fetchErr || !target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
  if (target.user_metadata?.role !== 'supervisor') {
    return NextResponse.json({ error: 'لا يمكن تعديل هذا الحساب' }, { status: 400 });
  }

  const newStatus = action === 'suspend' ? 'suspended' : 'active';
  const { error } = await admin.auth.admin.updateUserById(id, {
    user_metadata: { ...target.user_metadata, status: newStatus },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, status: newStatus });
}
