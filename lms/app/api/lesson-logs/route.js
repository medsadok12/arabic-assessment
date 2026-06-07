import { NextResponse }      from 'next/server';
import { createClient }      from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET — teacher's own lesson logs
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'teacher')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('lesson_logs')
    .select('*, lesson_feedback(*)')
    .eq('teacher_id', user.id)
    .order('lesson_date', { ascending: false });

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ logs: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ logs: data ?? [] });
}

// POST — create a new lesson log
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'teacher')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const body = await req.json();
  const { group_name, lesson_date, lesson_title, lesson_content, homework, future_plan, status, teacher_notes } = body;

  if (!group_name?.trim() || !lesson_date || !lesson_title?.trim())
    return NextResponse.json({ error: 'اسم المجموعة والتاريخ وعنوان الدرس مطلوبة' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('lesson_logs')
    .insert({
      teacher_id:    user.id,
      teacher_name:  user.user_metadata?.full_name ?? user.email,
      group_name:    group_name.trim(),
      lesson_date,
      lesson_title:  lesson_title.trim(),
      lesson_content: lesson_content?.trim() || null,
      homework:       homework?.trim()       || null,
      future_plan:    future_plan?.trim()    || null,
      status:         status ?? 'planned',
      teacher_notes:  teacher_notes?.trim()  || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: { ...data, lesson_feedback: [] } }, { status: 201 });
}
