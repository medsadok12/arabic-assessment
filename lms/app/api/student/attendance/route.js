import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

// POST — تسجيل الحضور
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { session_id } = await req.json();
  if (!session_id) return NextResponse.json({ error: 'session_id مطلوب' }, { status: 400 });

  const admin = createAdminClient();

  // تحقق من أن الحصة تخص هذا الطالب
  const { data: session } = await admin
    .from('sessions')
    .select('id, student_email, student_name, session_date, start_time')
    .eq('id', session_id)
    .ilike('student_email', user.email)
    .single();

  if (!session) return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });

  // نافذة التسجيل: من 10 دقائق قبل البدء حتى 15 دقيقة بعده
  const sessionDT = new Date(`${session.session_date}T${session.start_time}`);
  const nowTime   = new Date();
  const diffMins  = (sessionDT - nowTime) / 60000; // موجب = مستقبل، سالب = ماضٍ

  if (diffMins > 10)
    return NextResponse.json({ error: 'لم يحن وقت التسجيل — يفتح قبل الحصة بـ 10 دقائق' }, { status: 400 });
  if (diffMins < -15)
    return NextResponse.json({ error: 'انتهى وقت تسجيل الحضور — مضت أكثر من 15 دقيقة على بدء الحصة' }, { status: 400 });

  // سجّل الحضور (UNIQUE INDEX يمنع التكرار)
  const { error } = await admin
    .from('attendance_logs')
    .insert({
      session_id,
      student_id:    user.id,
      student_email: user.email,
      student_name:  session.student_name || user.user_metadata?.full_name || '',
      session_date:  session.session_date,
    });

  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true, already: true });
    if (error.code === '42P01') return NextResponse.json({ error: 'جدول الحضور غير موجود — شغّل SQL' }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // تحديث حقل attended في الحصة مباشرةً لتظهر "حاضر" في لوحة الإدارة
  await admin.from('sessions').update({ attended: true }).eq('id', session_id);

  return NextResponse.json({ ok: true });
}

// GET — هل سُجِّل الحضور لهذه الحصة؟
export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ logged: false });

  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get('session_id');
  if (!session_id) return NextResponse.json({ logged: false });

  const admin = createAdminClient();
  const { data } = await admin
    .from('attendance_logs')
    .select('id')
    .eq('session_id', session_id)
    .ilike('student_email', user.email)
    .maybeSingle();

  return NextResponse.json({ logged: !!data });
}
