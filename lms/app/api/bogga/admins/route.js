import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { sendWelcomeEmail }  from '../../../../lib/email';

const MAX_ADMINS = 2;

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// GET — list all admin accounts (role: admin)
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admins = users
    .filter(u => u.user_metadata?.role === 'admin')
    .map(u => ({
      id:         u.id,
      name:       u.user_metadata?.full_name ?? '—',
      email:      u.email,
      created_at: u.created_at,
      status:     u.user_metadata?.status ?? 'active',
    }));

  return NextResponse.json({ admins });
}

// POST — create a new admin account
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const { name, email } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'الاسم والبريد الإلكتروني مطلوبان' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Enforce max 2 admins
  const { data: { users: allUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const currentAdmins = allUsers?.filter(u => u.user_metadata?.role === 'admin') ?? [];
  if (currentAdmins.length >= MAX_ADMINS) {
    return NextResponse.json({
      error: `الحد الأقصى للمشرفين المساعدين هو ${MAX_ADMINS} حسابات فقط. احذف مشرفاً حالياً أولاً.`,
    }, { status: 409 });
  }

  const tempPassword = generateTempPassword();

  const { data: { user: newUser }, error } = await admin.auth.admin.createUser({
    email:         email.trim(),
    password:      tempPassword,
    email_confirm: true,
    user_metadata: { full_name: name.trim(), role: 'admin', status: 'active' },
  });
  if (error) {
    const msg = error.message.includes('already registered') || error.message.includes('already been registered')
      ? 'هذا البريد الإلكتروني مسجل مسبقاً'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  try {
    await sendWelcomeEmail({ to: email.trim(), name: name.trim(), password: tempPassword });
  } catch (e) {
    console.error('[admins] welcome email failed:', e.message);
  }

  return NextResponse.json({
    admin: {
      id:         newUser.id,
      name:       newUser.user_metadata?.full_name,
      email:      newUser.email,
      created_at: newUser.created_at,
      status:     'active',
    },
    emailSent: true,
  }, { status: 201 });
}
