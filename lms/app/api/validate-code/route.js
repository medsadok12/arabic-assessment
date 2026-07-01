import { createAdminClient } from '../../../lib/supabase-admin';

export async function POST(request) {
  try {
    const { code, name, email } = await request.json();
    if (!code?.trim()) return Response.json({ valid: false });

    const normalized = code.trim().toUpperCase();
    const supabase = createAdminClient();

    const { data: claimed } = await supabase
      .from('student_invitation_codes')
      .update({
        is_used:       true,
        used_at:       new Date().toISOString(),
        used_by_name:  name  || null,
        used_by_email: email || null,
      })
      .eq('code', normalized)
      .eq('is_used', false)
      .select('id')
      .maybeSingle();

    if (claimed) return Response.json({ valid: true });
    return Response.json({ valid: false });
  } catch {
    return Response.json({ valid: false }, { status: 400 });
  }
}
