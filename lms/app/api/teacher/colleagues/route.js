import { NextResponse }     from 'next/server';
import { createClient }    from '../../../../lib/supabase-server';
import { createAdminClient, fetchAllUsers } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

async function getTeacher() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'teacher') return null;
  return user;
}

// GET — list all teachers except caller, with availability flag
// ?date=YYYY-MM-DD&time=HH:MM
export async function GET(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const time = searchParams.get('time');

  const admin = createAdminClient();
  let users;
  try { users = await fetchAllUsers(admin); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }

  const teachers = users
    .filter(u => u.user_metadata?.role === 'teacher' && u.id !== teacher.id)
    .map(u => ({
      id:        u.id,
      name:      u.user_metadata?.full_name ?? u.email,
      email:     u.email,
      available: true,
    }));

  // Check conflicts if date + time provided
  if (date && time && teachers.length > 0) {
    const ids = teachers.map(t => t.id);
    const { data: conflicts } = await admin
      .from('sessions')
      .select('teacher_id')
      .in('teacher_id', ids)
      .eq('session_date', date)
      .eq('start_time', time)
      .eq('status', 'scheduled');

    const busy = new Set((conflicts ?? []).map(c => c.teacher_id));
    teachers.forEach(t => { if (busy.has(t.id)) t.available = false; });
  }

  // Sort: available first, then alphabetical
  teachers.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return a.name.localeCompare(b.name, 'ar');
  });

  return NextResponse.json({ teachers });
}
