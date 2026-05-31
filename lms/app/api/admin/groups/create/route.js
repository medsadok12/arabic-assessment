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

  const { name } = body;
  if (!name?.trim()) return Response.json({ error: 'اسم المجموعة مطلوب' }, { status: 400 });

  const supabase = getClient();
  const { data, error } = await supabase
    .from('student_groups')
    .insert({ name: name.trim() })
    .select('id, name')
    .single();

  if (error) {
    const isDup = error.message.includes('unique') || error.message.includes('duplicate') || error.code === '23505';
    return Response.json({ error: isDup ? 'يوجد مجموعة بهذا الاسم مسبقاً' : error.message }, { status: 400 });
  }
  return Response.json({ group: data });
}
