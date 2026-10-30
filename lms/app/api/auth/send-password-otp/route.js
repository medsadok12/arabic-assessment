import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';

/**
 * POST /api/auth/send-password-otp
 *
 * Step 1 of the two-factor password change flow:
 *   1. Verify current password via signInWithPassword
 *   2. If valid, call supabase.auth.reauthenticate() which emails
 *      a 6-digit OTP to the user's registered address
 *
 * Body: { currentPassword }
 */
export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword } = body;

    if (!currentPassword) {
      return NextResponse.json({ error: 'كلمة المرور الحالية مطلوبة' }, { status: 400 });
    }

    // Verify current password before sending OTP
    const { createClient: createAnonClient } = await import('@supabase/supabase-js');
    const verifyClient = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { error: verifyErr } = await verifyClient.auth.signInWithPassword({
      email:    user.email,
      password: currentPassword,
    });
    if (verifyErr) {
      return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 403 });
    }

    // Send 6-digit OTP to the user's registered email
    const { error: reautErr } = await supabase.auth.reauthenticate();
    if (reautErr) {
      return NextResponse.json(
        { error: 'فشل إرسال كود التحقق: ' + reautErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
