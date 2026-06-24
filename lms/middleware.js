import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Routes that require a logged-in user
const PROTECTED = [
  '/dashboard', '/teacher', '/supervisor', '/bogga',
  '/profile', '/assessment', '/library', '/admin',
];

// Auth pages where a logged-in user should be redirected away
const REDIRECT_IF_LOGGED_IN = ['/auth/login', '/auth/register'];

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

    // Not logged in → send to login
    if (!user && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
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
    // On error continue normally — page-level auth will handle it
    supabaseResponse = NextResponse.next({ request });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt)$).*)',
  ],
};
