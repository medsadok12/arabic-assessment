import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { cleanupUserData }   from '../../../../../lib/cleanup-user';

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// DELETE — remove any non-super_admin user
export async function DELETE(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const { id } = params;
  if (id === user.id) return NextResponse.json({ error: 'لا يمكن حذف حسابك الخاص' }, { status: 400 });

  const admin = createAdminClient();
  const { data: { user: target }, error: fetchErr } = await admin.auth.admin.getUserById(id);
  if (fetchErr || !target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
  if (target.user_metadata?.role === 'super_admin') {
    return NextResponse.json({ error: 'لا يمكن حذف حساب المدير المطلق' }, { status: 400 });
  }

  await cleanupUserData(id, target.email, admin);
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH — reset-password | update-name
export async function PATCH(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const { id } = params;
  const body = await req.json();
  const admin = createAdminClient();

  const { data: { user: target }, error: fetchErr } = await admin.auth.admin.getUserById(id);
  if (fetchErr || !target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
  if (target.user_metadata?.role === 'super_admin') {
    return NextResponse.json({ error: 'لا يمكن تعديل حساب المدير المطلق' }, { status: 400 });
  }

  // ── Reset password ──────────────────────────────────────────────────────
  if (body.action === 'reset-password') {
    const newPwd = generateTempPassword();
    const { error } = await admin.auth.admin.updateUserById(id, {
      password:     newPwd,
      app_metadata: { ...target.app_metadata, temp_password: newPwd },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, password: newPwd });
  }

  // ── Update name ─────────────────────────────────────────────────────────
  if (body.action === 'update-name') {
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: 'الاسم لا يمكن أن يكون فارغاً' }, { status: 400 });
    const { error } = await admin.auth.admin.updateUserById(id, {
      user_metadata: { ...target.user_metadata, full_name: name },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, name });
  }

  return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
}
