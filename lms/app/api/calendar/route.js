import { NextResponse }       from 'next/server';
import { createClient }      from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calendar
 *
 * جلب حصص الطالب المسجَّل دخوله لعرضها في التقويم.
 * يستخدم createAdminClient (service_role) لتجاوز سياسات RLS
 * التي تمنع الوصول المباشر من جانب العميل.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sessions')
    .select('id, teacher_name, session_date, start_time, duration_minutes, subject, status, meet_link, room_name')
    .eq('student_email', user.email.toLowerCase())
    .in('status', ['scheduled', 'completed'])
    .order('session_date', { ascending: true })
    .order('start_time',   { ascending: true });

  if (error) {
    console.error('[calendar] sessions query error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [] });
}
