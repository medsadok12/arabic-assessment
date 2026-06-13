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

  // محاولة 1: الطالب الأساسي (student_email يطابق البريد)
  const { data: primarySession } = await admin
    .from('sessions')
    .select('id, student_email, student_name, session_date, start_time, attended, status, meet_link, teacher_id')
    .eq('id', session_id)
    .ilike('student_email', user.email)
    .single();

  let session   = primarySession;
  let isSupport = false;

  // محاولة 2: الطالب المُضاف (support student)
  if (!session) {
    const { data: supportRow } = await admin
      .from('session_support_students')
      .select('session_id')
      .eq('session_id', session_id)
      .ilike('student_email', user.email)
      .maybeSingle()
      .then(r => r.error ? { data: null } : r);

    if (!supportRow) return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });

    isSupport = true;
    const { data: sess } = await admin
      .from('sessions')
      .select('id, student_name, session_date, start_time, attended, status, meet_link, teacher_id')
      .eq('id', session_id)
      .single();
    session = sess;
  }

  if (!session)                        return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });
  if (session.status === 'cancelled')  return NextResponse.json({ error: 'الحصة ملغاة' }, { status: 400 });

  // ─── هل سُجِّل الحضور مسبقاً؟ ───────────────────────────────────────────
  const alreadyAttended = isSupport
    // الطالب الإضافي → المصدر الوحيد هو attendance_logs
    ? await admin
        .from('attendance_logs')
        .select('id')
        .eq('session_id', session_id)
        .ilike('student_email', user.email)
        .maybeSingle()
        .then(r => !!r.data)
    // الطالب الأساسي → sessions.attended
    : session.attended === true;

  if (alreadyAttended) {
    const link = await resolveLink(admin, session);
    return NextResponse.json({ ok: true, already: true, meet_link: link });
  }

  // ✅ لا فحص للوقت — منطق الواجهة هو البوابة

  // الطالب الأساسي: تحديث sessions.attended مع guard مزدوج
  if (!isSupport) {
    await admin.from('sessions')
      .update({ attended: true })
      .eq('id', session_id)
      .ilike('student_email', user.email);
  }

  // جميع الطلاب: تسجيل في attendance_logs
  await admin.from('attendance_logs').insert({
    session_id,
    student_id:    user.id,
    student_email: user.email,
    student_name:  session.student_name || user.user_metadata?.full_name || '',
    session_date:  session.session_date,
  }).then(() => null).catch(() => null);

  // جلب أحدث meet_link من الـ DB ثم user_metadata المعلم كـ fallback
  const { data: fresh } = await admin
    .from('sessions')
    .select('meet_link, teacher_id')
    .eq('id', session_id)
    .single();

  let meetLink = fresh?.meet_link ?? session.meet_link ?? null;
  if (!meetLink) {
    const teacherId = fresh?.teacher_id ?? session.teacher_id;
    if (teacherId) {
      const { data: teacherUser } = await admin.auth.admin.getUserById(teacherId).catch(() => ({ data: null }));
      meetLink = teacherUser?.user?.user_metadata?.meet_link ?? null;
    }
  }

  return NextResponse.json({ ok: true, meet_link: meetLink });
}

// جلب رابط Meet: من الحصة أولاً، ثم user_metadata المعلم
async function resolveLink(admin, session) {
  let link = session.meet_link ?? null;
  if (!link && session.teacher_id) {
    const { data: td } = await admin.auth.admin.getUserById(session.teacher_id).catch(() => ({ data: null }));
    link = td?.user?.user_metadata?.meet_link ?? null;
  }
  return link;
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

  // الطالب الأساسي: sessions.attended
  const { data: sessionData } = await admin
    .from('sessions')
    .select('attended')
    .eq('id', session_id)
    .ilike('student_email', user.email)
    .maybeSingle();

  if (sessionData?.attended === true) return NextResponse.json({ logged: true });

  // الطالب الإضافي والمصدر الاحتياطي: attendance_logs
  const { data: logData } = await admin
    .from('attendance_logs')
    .select('id')
    .eq('session_id', session_id)
    .ilike('student_email', user.email)
    .maybeSingle()
    .then(r => r.error ? { data: null } : r);

  return NextResponse.json({ logged: !!logData });
}
