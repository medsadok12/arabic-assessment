import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

// PUT — update lesson log (teacher, own record only)
export async function PUT(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'teacher')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data: existing, error: fetchErr } = await admin
    .from('lesson_logs').select('teacher_id').eq('id', params.id).single();
  if (fetchErr || !existing) return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 });
  if (existing.teacher_id !== user.id)
    return NextResponse.json({ error: 'لا يمكنك تعديل سجل معلم آخر' }, { status: 403 });

  const body = await req.json();
  const allowed = ['group_name','lesson_date','lesson_time','lesson_title','lesson_content','homework','future_plan','status','teacher_notes'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  updates.updated_at = new Date().toISOString();

  const { data, error } = await admin
    .from('lesson_logs').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: data });
}

// DELETE — delete lesson log (teacher, own record only)
export async function DELETE(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'teacher')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data: existing, error: fetchErr } = await admin
    .from('lesson_logs').select('teacher_id').eq('id', params.id).single();
  if (fetchErr || !existing) return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 });
  if (existing.teacher_id !== user.id)
    return NextResponse.json({ error: 'لا يمكنك حذف سجل معلم آخر' }, { status: 403 });

  const { error } = await admin.from('lesson_logs').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
