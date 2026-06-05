import { NextResponse }     from 'next/server';
import { createClient }    from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const email = user.email;
  const admin  = createAdminClient();
  const today  = new Date().toISOString().slice(0, 10);

  const { data, error } = await admin
    .from('sessions')
    .select('id, teacher_name, student_name, session_date, start_time, duration_minutes, subject, room_name, status')
    .eq('student_email', email)
    .eq('status', 'scheduled')
    .gte('session_date', today)
    .order('session_date', { ascending: true })
    .order('start_time',   { ascending: true })
    .limit(10);

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ sessions: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}
