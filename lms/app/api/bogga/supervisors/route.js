import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient, fetchAllUsers } from '../../../../lib/supabase-admin';
import { sendWelcomeEmail }  from '../../../../lib/email';
import { getRole } from '../../../../lib/auth-role';

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// GET — list all supervisor accounts
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || getRole(user) !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const admin = createAdminClient();
  let users;
  try { users = await fetchAllUsers(admin); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }

  const supervisors = users
    .filter(u => getRole(u) === 'supervisor')
    .map(u => ({
      id:         u.id,
      name:       u.user_metadata?.full_name ?? '—',
      email:      u.email,
      created_at: u.created_at,
      status:     u.user_metadata?.status ?? 'active',
    }));

  return NextResponse.json({ supervisors });
}

// POST — create a new supervisor account
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || getRole(user) !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const { name, email } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'الاسم والبريد الإلكتروني مطلوبان' }, { status: 400 });
  }

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: { user: newUser }, error } = await admin.auth.admin.createUser({
    email:         email.trim(),
    password:      tempPassword,
    email_confirm: true,
    user_metadata: { full_name: name.trim(), role: 'supervisor', status: 'active' },
    app_metadata:  { temp_password: tempPassword, role: 'supervisor' },
  });

  if (error) {
    const msg = error.message.includes('already registered') || error.message.includes('already been registered')
      ? 'هذا البريد الإلكتروني مسجل مسبقاً'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let emailSent  = false;
  let emailError = null;
  try {
    await sendWelcomeEmail({ to: email.trim(), name: name.trim(), password: tempPassword });
    emailSent = true;
  } catch (e) {
    emailError = e.message;
  }

  return NextResponse.json({
    supervisor: {
      id:         newUser.id,
      name:       newUser.user_metadata?.full_name,
      email:      newUser.email,
      created_at: newUser.created_at,
      status:     'active',
    },
    emailSent,
    emailError,
    tempPassword,
  }, { status: 201 });
}
