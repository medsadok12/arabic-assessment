import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = getRole(user);
  if (role !== 'super_admin' && role !== 'admin') return null;
  return user;
}

// GET — صف الإعدادات الوحيد (id=1)
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin.from('quicktest_settings').select('*').eq('id', 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

// PATCH — تحديث قالب رسالة واتساب
export async function PATCH(req) {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { whatsapp_template } = await req.json();
  if (!whatsapp_template?.trim()) return NextResponse.json({ error: 'نص الرسالة مطلوب' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quicktest_settings')
    .update({ whatsapp_template: whatsapp_template.trim(), updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ settings: data });
}
