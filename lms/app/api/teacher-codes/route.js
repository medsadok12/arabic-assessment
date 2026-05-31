import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function fetchCodes() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('teacher_invitation_codes')
    .select('id, code, is_used, used_at, created_at')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(JSON.stringify({ codes: data ?? [] }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

// POST: never cached by Vercel CDN (primary)
export async function POST() { return fetchCodes(); }

// GET: kept for backwards compatibility
export async function GET() { return fetchCodes(); }
