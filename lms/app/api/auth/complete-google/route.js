import { NextResponse }       from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/complete-google
 *
 * Called after a new Google OAuth user completes the onboarding screen.
 * Validates and consumes the academy invitation code, then writes
 * role, name, age, grade, and onboarding_complete into user_metadata.
 *
 * Body: { code, name?, age, grade? }
 */
export async function POST(req) {
  try {
    const { code, name, age, grade } = await req.json();

    if (!code?.trim()) return NextResponse.json({ error: 'الكود مطلوب' },          { status: 400 });
    if (!age?.toString().trim()) return NextResponse.json({ error: 'العمر مطلوب' }, { status: 400 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    if (user.user_metadata?.role) return NextResponse.json({ error: 'الحساب مكتمل بالفعل' }, { status: 409 });

    const admin      = createAdminClient();
    const normalized = code.trim().toUpperCase();
    const displayName = name?.trim() || user.user_metadata?.full_name || user.email;

    // استهلاك الكود
    const { data: claimed } = await admin
      .from('student_invitation_codes')
      .update({
        is_used:       true,
        used_at:       new Date().toISOString(),
        used_by_name:  displayName,
        used_by_email: user.email,
      })
      .eq('code', normalized)
      .eq('is_used', false)
      .select('id')
      .maybeSingle();

    if (!claimed) return NextResponse.json({ error: 'كود غير صحيح أو مستخدَم مسبقاً' }, { status: 400 });

    // تحديث بيانات المستخدم — الدور + البيانات التربوية + علم اكتمال التهيئة
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        role:                'student',
        full_name:           displayName,
        age:                 age.toString().trim(),
        grade:               grade || null,
        onboarding_complete: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
