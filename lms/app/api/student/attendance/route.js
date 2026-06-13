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
    .select('id, student_email, student_name, session_date, start_time, attended, status')
    .eq('id', session_id)
    .ilike('student_email', user.email)
    .single();

  if (!session) return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });

  // إذا كان الحضور مسجلاً مسبقاً في حقل sessions.attended → اعتبره مكرراً
  if (session.attended === true) return NextResponse.json({ ok: true, already: true });

  // إذا بدأ المعلم الحصة (status = active) → تجاوز فحص الوقت، البوابة هي إشارة المعلم
  if (session.status !== 'active') {
    // نافذة التسجيل: من 10 دقائق قبل البدء حتى 15 دقيقة بعده
    const sessionDT = new Date(`${session.session_date}T${session.start_time}`);
    const nowTime   = new Date();
    const diffMins  = (sessionDT - nowTime) / 60000;

    if (diffMins > 10)
      return NextResponse.json({ error: 'لم يحن وقت التسجيل — يفتح قبل الحصة بـ 10 دقائق' }, { status: 400 });
    if (diffMins < -60)
      return NextResponse.json({ error: 'انتهى وقت تسجيل الحضور' }, { status: 400 });
  }

  // تحديث sessions.attended — هذا هو المصدر الموثوق (يعمل دائماً)
  await admin.from('sessions').update({ attended: true }).eq('id', session_id);

  // محاولة تسجيل في attendance_logs (best-effort — لا يوقف العملية إذا فشل)
  const { error: logError } = await admin
    .from('attendance_logs')
    .insert({
      session_id,
      student_id:    user.id,
      student_email: user.email,
      student_name:  session.student_name || user.user_metadata?.full_name || '',
      session_date:  session.session_date,
    });

  // تجاهل خطأ التكرار أو غياب الجدول — sessions.attended كافٍ
  if (logError && logError.code !== '23505' && logError.code !== '42P01') {
    console.error('attendance_logs insert:', logError.message);
  }

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

  // المصدر الأساسي: حقل attended في sessions
  const { data: sessionData } = await admin
    .from('sessions')
    .select('attended')
    .eq('id', session_id)
    .ilike('student_email', user.email)
    .maybeSingle();

  if (sessionData?.attended === true) return NextResponse.json({ logged: true });

  // مصدر احتياطي: attendance_logs (إذا كان الجدول موجوداً)
  const { data: logData } = await admin
    .from('attendance_logs')
    .select('id')
    .eq('session_id', session_id)
    .ilike('student_email', user.email)
    .maybeSingle()
    .then(r => r.error ? { data: null } : r);

  return NextResponse.json({ logged: !!logData });
}
