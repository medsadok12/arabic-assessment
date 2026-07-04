import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

/**
 * POST /api/auth/update-password
 *
 * Two modes:
 *   mode = 'forced'   → first-login temp password change; no current password required.
 *                        Clears app_metadata.temp_password on success.
 *   mode = 'change'   → voluntary change from profile.
 *                        Requires: currentPassword (already verified by send-password-otp)
 *                                  otp (6-digit code sent to user's email via reauthenticate)
 *
 * Body: { mode, newPassword, currentPassword?, otp? }
 */
export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    const body = await req.json();
    const { mode = 'forced', newPassword, currentPassword, otp } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // ── Voluntary change: verify current password + email OTP ────────────────
    if (mode === 'change') {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'كلمة المرور الحالية مطلوبة' },
          { status: 400 }
        );
      }
      if (!otp) {
        return NextResponse.json(
          { error: 'كود التحقق مطلوب' },
          { status: 400 }
        );
      }

      // Re-verify current password (defence-in-depth — also verified before OTP was sent)
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
        return NextResponse.json(
          { error: 'كلمة المرور الحالية غير صحيحة' },
          { status: 403 }
        );
      }

      // Verify the email OTP sent by reauthenticate()
      const { error: otpErr } = await supabase.auth.verifyOtp({
        email: user.email,
        token: otp,
        type:  'reauthentication',
      });
      if (otpErr) {
        return NextResponse.json(
          { error: 'كود التحقق غير صحيح أو انتهت صلاحيته' },
          { status: 403 }
        );
      }
    }

    // ── Update password via admin client (bypasses JWT expiry edge-cases) ────
    const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // ── Clear temp_password from app_metadata ─────────────────────────────────
    const currentMeta = user.app_metadata ?? {};
    if (currentMeta.temp_password) {
      // eslint-disable-next-line no-unused-vars
      const { temp_password, ...cleanMeta } = currentMeta;
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: cleanMeta,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
