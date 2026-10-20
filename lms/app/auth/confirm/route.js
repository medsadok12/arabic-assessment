import { createServerClient } from '@supabase/ssr';
import { cookies }           from 'next/headers';
import { NextResponse }      from 'next/server';
import { getRole } from '../../../lib/auth-role';
import { createAdminClient } from '../../../lib/supabase-admin';
import { isUuid, staleLinkRedirect } from '../../../lib/email-confirm';

/**
 * GET /auth/confirm?token_hash=xxx&type=signup|magiclink&uid=<account id>
 *
 * Server-side email verification handler.
 * Called when a student clicks the verification link sent by Resend.
 *
 * Why this route exists instead of reusing /auth/callback:
 *   generateLink() returns an action_link (GoTrue URL) that after OTP
 *   verification redirects with hash tokens (#access_token=...).  A server
 *   route can never read URL hashes — they're stripped before the HTTP
 *   request reaches the server.  Using hashed_token + verifyOtp() here
 *   keeps everything server-side and sets cookies properly.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type       = searchParams.get('type') ?? 'signup';   // 'signup' or 'magiclink'

  if (!token_hash) {
    return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`);
  }

  const cookieStore = cookies();
  const supabase    = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll()      { return cookieStore.getAll(); },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch {}
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });

  if (error || !user) {
    console.error('[auth/confirm] verifyOtp error:', error?.message);
    // الرابط مستعمَل أو منتهٍ — غالباً فُتح مرتين (التطبيق المثبَّت + المتصفح، أو معاينة
    // تطبيق البريد) فنجحت المرة الأولى. لا نُظهر «فشل» لحساب تأكّد فعلاً:
    // 1) هذا المتصفح داخل بالحساب نفسه ← لوحته مباشرة
    const uid = searchParams.get('uid');
    const { data: { user: current } } = await supabase.auth.getUser();
    if (current?.email_confirmed_at && (!uid || current.id === uid)) {
      return NextResponse.redirect(`${origin}${dashboardPath(current)}`);
    }
    // 2) وإلا حسب حالة الحساب: مؤكَّد ← الدخول بالبريد مكتوباً، غير مؤكَّد ← رابط جديد
    let account = null;
    if (isUuid(uid)) {
      try {
        const { data } = await createAdminClient().auth.admin.getUserById(uid);
        // روابط التأكيد للطلاب حصراً — لا نكشف بريد أي دور آخر
        account = getRole(data?.user) === 'student' ? data.user : null;
      } catch {}
    }
    return NextResponse.redirect(staleLinkRedirect(origin, account));
  }

  return NextResponse.redirect(`${origin}${dashboardPath(user)}`);
}

// لوحة كل دور بعد تأكيد البريد
function dashboardPath(user) {
  const role = getRole(user);
  if (role === 'super_admin' || role === 'admin') return '/bogga';
  if (role === 'teacher')    return '/teacher';
  if (role === 'supervisor') return '/supervisor';
  return '/dashboard';
}
