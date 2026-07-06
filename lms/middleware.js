import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Routes that require a logged-in user
const PROTECTED = [
  '/dashboard', '/teacher', '/supervisor', '/bogga',
  '/profile', '/library', '/admin',
];

// Auth pages where a logged-in user should be redirected away
const REDIRECT_IF_LOGGED_IN = ['/auth/login', '/auth/register'];

// Forced password-change page (exempt from REDIRECT_IF_LOGGED_IN but not from temp_password trap)
const UPDATE_PASSWORD_ROUTE = '/auth/update-password';

// Onboarding screen for new Google OAuth users — must stay accessible even when logged in
const ONBOARDING_ROUTE = '/auth/google-code';

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(toSet) {
            toSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            toSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    const isProtected       = PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'));
    const isRedirectIfLogIn = REDIRECT_IF_LOGGED_IN.some(p => pathname === p || pathname.startsWith(p + '/'));
    const isUpdatePwdRoute  = pathname === UPDATE_PASSWORD_ROUTE;
    const isOnboardingRoute = pathname === ONBOARDING_ROUTE;
    const hasTempPwd        = !!user?.app_metadata?.temp_password;
    const hasRole           = !!user?.user_metadata?.role;

    // Not logged in → send to login
    if (!user && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      return NextResponse.redirect(url);
    }

    // Manual email/password registrant who hasn't verified yet → send to verify-email.
    // Google OAuth users always have email_confirmed_at set by Supabase — exempt automatically.
    const isGoogleUser  = user?.app_metadata?.provider === 'google';
    const emailVerified = !!user?.email_confirmed_at;
    if (user && !isGoogleUser && !emailVerified && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/verify-email';
      return NextResponse.redirect(url);
    }

    // New Google OAuth user (no role yet) accessing a protected route → force onboarding
    if (user && !hasRole && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_ROUTE;
      return NextResponse.redirect(url);
    }

    // Logged-in user with temp_password accessing protected routes → force password change
    if (user && hasTempPwd && isProtected && !isUpdatePwdRoute) {
      const url = request.nextUrl.clone();
      url.pathname = UPDATE_PASSWORD_ROUTE;
      return NextResponse.redirect(url);
    }

    // Logged-in user with no temp_password trying to reach update-password → send to dashboard
    if (user && !hasTempPwd && isUpdatePwdRoute) {
      const role = user.user_metadata?.role;
      const url  = request.nextUrl.clone();
      url.pathname =
        role === 'admin' || role === 'super_admin' ? '/bogga'
        : role === 'teacher'                        ? '/teacher'
        : role === 'supervisor'                     ? '/supervisor'
        : '/dashboard';
      return NextResponse.redirect(url);
    }

    // Completed user visiting onboarding → send to their dashboard
    if (user && hasRole && isOnboardingRoute) {
      const role = user.user_metadata?.role;
      const url  = request.nextUrl.clone();
      url.pathname =
        role === 'admin' || role === 'super_admin' ? '/bogga'
        : role === 'teacher'                        ? '/teacher'
        : role === 'supervisor'                     ? '/supervisor'
        : '/dashboard';
      return NextResponse.redirect(url);
    }

    // Already logged in → no need to see login/register again
    if (user && isRedirectIfLogIn) {
      const role = user.user_metadata?.role;
      const url  = request.nextUrl.clone();
      url.pathname =
        role === 'admin' || role === 'super_admin' ? '/bogga'
        : role === 'teacher'                        ? '/teacher'
        : role === 'supervisor'                     ? '/supervisor'
        : '/dashboard';
      return NextResponse.redirect(url);
    }

  } catch {
    supabaseResponse = NextResponse.next({ request });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt)$).*)',
  ],
};
