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

// GET — teacher's student roster
export async function GET() {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('teacher_students')
    .select('*')
    .eq('teacher_id', teacher.id)
    .order('level', { ascending: true })
    .order('section', { ascending: true })
    .order('student_name', { ascending: true });

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ students: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ students: data ?? [] });
}

// POST — add student to roster
export async function POST(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { student_name, student_email, level, section, age } = await req.json();
  if (!student_name?.trim() || !level || !age)
    return NextResponse.json({ error: 'الاسم والمستوى والعمر مطلوبون' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('teacher_students')
    .insert({
      teacher_id:    teacher.id,
      student_name:  student_name.trim(),
      student_email: student_email?.trim() || null,
      level:         parseInt(level),
      section:       section?.trim() || 'أ',
      age:           parseInt(age),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ student: data }, { status: 201 });
}

// DELETE — remove student from roster
export async function DELETE(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('teacher_students')
    .delete()
    .eq('id', id)
    .eq('teacher_id', teacher.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
