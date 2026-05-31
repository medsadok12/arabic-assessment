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

  const { id } = body;
  if (!id) return Response.json({ error: 'id مطلوب' }, { status: 400 });

  const supabase = getClient();
  const { error } = await supabase.from('student_invitation_codes').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
