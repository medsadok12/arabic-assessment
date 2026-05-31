import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'EVAL-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST() {
  const supabase = getClient();

  // Try up to 5 times to avoid rare collisions
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    const { data, error } = await supabase
      .from('assessment_codes')
      .insert({ code })
      .select('code')
      .single();

    if (!error && data) return Response.json({ code: data.code });
    if (error && !(error.code === '23505')) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
  return Response.json({ error: 'فشل توليد الكود، أعد المحاولة' }, { status: 500 });
}
