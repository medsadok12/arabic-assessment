import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { awardPoints }       from '../../../../lib/points';
import { resolveActiveIdentity } from '../../../../lib/active-child';

export const dynamic = 'force-dynamic';

// GET — student's homework
export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { effectiveEmail } = await resolveActiveIdentity(user, admin, req);
  const { data, error } = await admin
    .from('homework')
    .select('id, teacher_name, title, description, due_date, status, created_at')
    .eq('student_email', effectiveEmail)
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
  const { effectiveEmail, effectiveUserId } = await resolveActiveIdentity(user, admin, req);
  const { error } = await admin
    .from('homework')
    .update({ status })
    .eq('id', id)
    .eq('student_email', effectiveEmail);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === 'done') {
    awardPoints(effectiveUserId, 15, `homework_done:${id}`).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
