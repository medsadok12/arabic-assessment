import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['admin', 'super_admin', 'supervisor'];

// GET — all lesson logs for a given teacher (admin/supervisor view)
// Query params: teacher_id (required), group_name (optional)
export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = getRole(user);
  if (!user || !ALLOWED_ROLES.includes(role))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const teacher_id  = searchParams.get('teacher_id');
  const group_name  = searchParams.get('group_name');

  const admin = createAdminClient();
  let query = admin
    .from('lesson_logs')
    .select('*, lesson_feedback(*)')
    .order('lesson_date', { ascending: false });

  if (teacher_id)  query = query.eq('teacher_id', teacher_id);
  if (group_name)  query = query.eq('group_name', group_name);

  const { data, error } = await query;
  if (error) {
    if (error.code === '42P01') return NextResponse.json({ logs: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ logs: data ?? [] });
}
