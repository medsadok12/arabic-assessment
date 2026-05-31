import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'طلب غير صالح' }, { status: 400 }); }

  const { userId, groupId } = body;
  if (!userId) return Response.json({ error: 'userId مطلوب' }, { status: 400 });

  const supabase = getClient();

  if (!groupId) {
    // إلغاء التعيين
    await supabase.from('student_group_assignments').delete().eq('user_id', userId);
    return Response.json({ success: true });
  }

  // upsert التعيين
  const { error } = await supabase
    .from('student_group_assignments')
    .upsert({ user_id: userId, group_id: groupId, updated_at: new Date().toISOString() });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
