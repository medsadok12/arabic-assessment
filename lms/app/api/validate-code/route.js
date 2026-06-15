import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Legacy universal code kept for backward compatibility
const LEGACY_CODES = ['AAREM2026'];

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ valid: false }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  const name = body.name?.trim() || null;

  if (!code) return Response.json({ valid: false });

  // 1. Legacy hardcoded codes (backward compat)
  if (LEGACY_CODES.includes(code)) {
    return Response.json({ valid: true });
  }

  // 2. Dynamic student invitation codes stored in Supabase
  const supabase = getClient();
  const { data, error } = await supabase
    .from('student_invitation_codes')
    .select('id, is_used')
    .eq('code', code)
    .single();

  if (error || !data) return Response.json({ valid: false });
  if (data.is_used)   return Response.json({ valid: false, reason: 'used' });

  // Mark code as used
  await supabase
    .from('student_invitation_codes')
    .update({ is_used: true, used_at: new Date().toISOString(), used_by_name: name })
    .eq('id', data.id);

  return Response.json({ valid: true });
}
