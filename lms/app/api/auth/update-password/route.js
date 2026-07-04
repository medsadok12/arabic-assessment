import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

/**
 * POST /api/auth/update-password
 *
 * Two modes:
 *   mode = 'forced'   → first-login temp password change; no current password required.
 *                        Clears app_metadata.temp_password on success.
 *   mode = 'change'   → voluntary change from profile; currentPassword MUST be verified.
 *                        Also clears temp_password if it somehow still exists.
 *
 * Body: { mode, newPassword, currentPassword? }
 */
export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    const body = await req.json();
    const { mode = 'forced', newPassword, currentPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // ── Voluntary change: verify current password first ──────────────────────
    if (mode === 'change') {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'كلمة المرور الحالية مطلوبة' },
          { status: 400 }
        );
      }

      // Verify by attempting a sign-in with the current credentials
      const { createClient: createBrowserClient } = await import('@supabase/supabase-js');
      const verifyClient = createBrowserClient(
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
