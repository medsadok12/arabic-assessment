import { createServerClient } from '@supabase/ssr';
import { cookies }           from 'next/headers';
import { NextResponse }      from 'next/server';
import { getRole } from '../../../lib/auth-role';

/**
 * GET /auth/confirm?token_hash=xxx&type=signup|magiclink
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
    return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`);
  }

  // Redirect to appropriate dashboard based on role
  const role = getRole(user);
  if (role === 'super_admin' || role === 'admin') return NextResponse.redirect(`${origin}/bogga`);
  if (role === 'teacher')    return NextResponse.redirect(`${origin}/teacher`);
  if (role === 'supervisor') return NextResponse.redirect(`${origin}/supervisor`);
  return NextResponse.redirect(`${origin}/dashboard`);
}
