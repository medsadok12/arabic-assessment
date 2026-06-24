import { createAdminClient } from '../../../lib/supabase-admin';

export async function POST(request) {
  try {
    const { code } = await request.json();
    if (!code?.trim()) return Response.json({ valid: false });

    const normalized = code.trim().toUpperCase();
    const supabase = createAdminClient();

    // Atomically claim the code from DB — fails if already used or not found
    const { data: claimed } = await supabase
      .from('student_invitation_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
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
