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

  const { userId, name, email } = body;
  if (!userId) return Response.json({ error: 'userId مطلوب' }, { status: 400 });

  const supabase = getClient();
  const errors = [];

  // Update name in all assessments records for this user
  if (name?.trim()) {
    const { error } = await supabase
      .from('assessments')
      .update({ student_name: name.trim() })
      .eq('user_id', userId);
    if (error) errors.push(error.message);
  }

  // Update email in auth.users
  if (email?.trim()) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email: email.trim(),
    });
    if (error) errors.push(error.message);
  }

  if (errors.length) return Response.json({ error: errors.join(' | ') }, { status: 500 });
  return Response.json({ success: true });
}
