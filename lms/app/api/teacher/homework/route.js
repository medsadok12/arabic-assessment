import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

async function getTeacher() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || getRole(user) !== 'teacher') return null;
  return user;
}

// GET — teacher's homework list
export async function GET() {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('homework')
    .select('*')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ homework: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ homework: data ?? [] });
}

// POST — create homework
export async function POST(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 }); }
  const { title, description, student_email, student_name, due_date } = body;
  if (!title?.trim() || !student_email?.trim())
    return NextResponse.json({ error: 'العنوان والطالب مطلوبان' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('homework')
    .insert({
      teacher_id:    teacher.id,
      teacher_name:  teacher.user_metadata?.full_name ?? teacher.email,
      student_email: student_email.trim(),
      student_name:  student_name?.trim() || null,
      title:         title.trim(),
      description:   description?.trim() || null,
      due_date:      due_date || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ homework: data }, { status: 201 });
}

// DELETE — remove homework
export async function DELETE(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 }); }
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('homework').delete().eq('id', id).eq('teacher_id', teacher.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
