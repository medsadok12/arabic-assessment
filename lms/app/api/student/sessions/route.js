import { NextResponse }     from 'next/server';
import { createClient }    from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const email = user.email;
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'upcoming' | 'past'

  let query = admin
    .from('sessions')
    .select('id, teacher_name, session_date, start_time, duration_minutes, subject, room_name, status, notes, rating')
    .eq('student_email', email);

  if (type === 'past') {
    query = query.or(`status.in.(completed,cancelled),and(status.eq.scheduled,session_date.lt.${today})`)
      .order('session_date', { ascending: false })
      .limit(20);
  } else {
    query = query.eq('status', 'scheduled').gte('session_date', today)
      .order('session_date', { ascending: true })
      .order('start_time',   { ascending: true })
      .limit(10);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === '42P01') return NextResponse.json({ sessions: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}

// PATCH — student rates a completed session
export async function PATCH(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const { id, rating } = body;
  if (!id || !rating || rating < 1 || rating > 5)
    return NextResponse.json({ error: 'التقييم يجب أن يكون بين 1 و 5' }, { status: 400 });

  const admin = createAdminClient();

  // Verify session belongs to this student
  const { data: session } = await admin
    .from('sessions').select('student_email').eq('id', id).single();
  if (!session || session.student_email !== user.email)
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { error } = await admin.from('sessions').update({ rating }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
