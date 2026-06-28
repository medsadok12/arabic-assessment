import { NextResponse }       from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { code, name } = await req.json();
    if (!code?.trim()) return NextResponse.json({ error: 'الكود مطلوب' }, { status: 400 });

    // تحقق من أن المستخدم مسجّل دخوله (عبر Google) لكن بدون دور بعد
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    if (user.user_metadata?.role) return NextResponse.json({ error: 'الحساب مكتمل بالفعل' }, { status: 409 });

    const admin      = createAdminClient();
    const normalized = code.trim().toUpperCase();

    // استهلاك الكود
    const { data: claimed } = await admin
      .from('student_invitation_codes')
      .update({
        is_used:       true,
        used_at:       new Date().toISOString(),
        used_by_name:  name  || user.user_metadata?.full_name || null,
        used_by_email: user.email,
      })
      .eq('code', normalized)
      .eq('is_used', false)
      .select('id')
      .maybeSingle();

    if (!claimed) return NextResponse.json({ error: 'كود غير صحيح أو مستخدَم مسبقاً' }, { status: 400 });

    // ضبط دور الطالب على الحساب
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        role:      'student',
        full_name: name || user.user_metadata?.full_name || user.email,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
