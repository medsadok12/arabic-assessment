import { createAdminClient } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('teacher_invitation_codes')
    .select('id, code, is_used, used_at, created_at')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ codes: data ?? [] });
}
