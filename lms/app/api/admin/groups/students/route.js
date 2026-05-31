import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST() {
  const supabase = getClient();

  const [{ data: assessments }, { data: assignments }] = await Promise.all([
    supabase
      .from('assessments')
      .select('user_id, student_name')
      .not('user_id', 'is', null),
    supabase
      .from('student_group_assignments')
      .select('user_id, group_id'),
  ]);

  // طلاب فريدون (بدون تكرار)
  const seen = new Set();
  const students = [];
  for (const a of (assessments ?? [])) {
    if (a.user_id && !seen.has(a.user_id)) {
      seen.add(a.user_id);
      const asgn = assignments?.find(x => x.user_id === a.user_id);
      students.push({
        user_id:  a.user_id,
        name:     a.student_name ?? 'طالب',
        group_id: asgn?.group_id ?? null,
      });
    }
  }

  return new Response(JSON.stringify({ students }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
