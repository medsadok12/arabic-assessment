import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// POST — reset passwords for all users who don't have a stored temp_password
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin')
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Only users without a stored temp_password (and not super_admin)
  const targets = users.filter(u =>
    u.user_metadata?.role !== 'super_admin' &&
    !u.app_metadata?.temp_password
  );

  const results = [];
  for (const u of targets) {
    const newPwd = generateTempPassword();
    const { error: updateErr } = await admin.auth.admin.updateUserById(u.id, {
      password:     newPwd,
      app_metadata: { ...u.app_metadata, temp_password: newPwd },
    });
    if (!updateErr) {
      results.push({ id: u.id, password: newPwd });
    }
  }

  return NextResponse.json({ count: results.length, updated: results });
}
