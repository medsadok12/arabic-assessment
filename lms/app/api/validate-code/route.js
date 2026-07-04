import { createAdminClient } from '../../../lib/supabase-admin';

// GET — فحص صلاحية الكود فقط دون استهلاكه (للتحقق قبل إنشاء الحساب)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim().toUpperCase();
    if (!code) return Response.json({ valid: false });

    const supabase = createAdminClient();
    const { data } = await supabase
      .from('student_invitation_codes')
      .select('id')
      .eq('code', code)
      .eq('is_used', false)
      .maybeSingle();

    return Response.json({ valid: !!data });
  } catch {
    return Response.json({ valid: false }, { status: 400 });
  }
}

// POST — استهلاك الكود وتسجيل بيانات الطالب (يُستدعى بعد إنشاء الحساب)
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
