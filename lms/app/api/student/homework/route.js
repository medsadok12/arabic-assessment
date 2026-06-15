import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET — student's homework
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('homework')
    .select('id, teacher_name, title, description, due_date, status, created_at')
    .ilike('student_email', user.email)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ homework: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ homework: data ?? [] });
}

// PATCH — mark as done / pending
export async function PATCH(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { id, status } = await req.json();
  if (!id || !['pending', 'done'].includes(status))
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('homework')
    .update({ status })
    .eq('id', id)
    .ilike('student_email', user.email);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
