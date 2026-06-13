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
    .select('id, student_email, student_name, session_date, start_time, attended, status, meet_link')
    .eq('id', session_id)
    .ilike('student_email', user.email)
    .single();

  if (!session) return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });
  if (session.status === 'cancelled') return NextResponse.json({ error: 'الحصة ملغاة' }, { status: 400 });

  // إذا كان الحضور مسجلاً مسبقاً
  if (session.attended === true) {
    return NextResponse.json({ ok: true, already: true, meet_link: session.meet_link ?? null });
  }

  // ✅ لا فحص للوقت — الزر لا يظهر إلا عند إشارة المعلم أو حلول الوقت (منطق الواجهة)

  // تحديث sessions.attended — المصدر الموثوق
  await admin.from('sessions').update({ attended: true }).eq('id', session_id);

  // attendance_logs — best-effort
  await admin.from('attendance_logs').insert({
    session_id,
    student_id:    user.id,
    student_email: user.email,
    student_name:  session.student_name || user.user_metadata?.full_name || '',
    session_date:  session.session_date,
  }).then(() => null).catch(() => null);

  // جلب أحدث meet_link (قد يكون المعلم حدّثه للتو)
  const { data: fresh } = await admin
    .from('sessions')
    .select('meet_link')
    .eq('id', session_id)
    .single();

  return NextResponse.json({ ok: true, meet_link: fresh?.meet_link ?? session.meet_link ?? null });
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

  // المصدر الأساسي: sessions.attended
  const { data: sessionData } = await admin
    .from('sessions')
    .select('attended')
    .eq('id', session_id)
    .ilike('student_email', user.email)
    .maybeSingle();

  if (sessionData?.attended === true) return NextResponse.json({ logged: true });

  // مصدر احتياطي: attendance_logs
  const { data: logData } = await admin
    .from('attendance_logs')
    .select('id')
    .eq('session_id', session_id)
    .ilike('student_email', user.email)
    .maybeSingle()
    .then(r => r.error ? { data: null } : r);

  return NextResponse.json({ logged: !!logData });
}
