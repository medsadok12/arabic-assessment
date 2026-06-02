import { NextResponse } from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

function guard(user) {
  return !user || user.user_metadata?.role !== 'super_admin';
}

// GET — list all applications (super_admin only, bypasses RLS)
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guard(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('recruitment_applications')
    .select('id, name, email, phone, experience, specialty, notes, status, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data ?? [] });
}

// DELETE — remove an application permanently (super_admin only)
export async function DELETE(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guard(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('recruitment_applications')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH — update application status (super_admin only)
export async function PATCH(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guard(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: 'بيانات غير كاملة' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('recruitment_applications')
    .update({ status })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
