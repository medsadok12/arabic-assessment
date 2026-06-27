import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code    = searchParams.get('code');
  const forCtx  = searchParams.get('for');   // 'teacher' | 'student' | null
  const next    = searchParams.get('next');   // e.g. '/auth/reset-password'

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll()       { return cookieStore.getAll(); },
          setAll(toSet)  {
            try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
            catch {}
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Password-reset flow: redirect to the reset page directly
      if (next && next.startsWith('/')) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const role          = user.user_metadata?.role;
      const isStaffRole   = ['teacher', 'admin', 'super_admin', 'supervisor'].includes(role);
      const isTeacherCtx  = forCtx === 'teacher';

      if (isTeacherCtx && !isStaffRole) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/auth/login?for=teacher&error=students_blocked`);
      }
      if (!isTeacherCtx && isStaffRole && !next) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/auth/login?error=teachers_blocked`);
      }

      const dest =
        role === 'super_admin' || role === 'admin' ? '/bogga'
        : role === 'teacher'                        ? '/teacher'
        : role === 'supervisor'                     ? '/supervisor'
        : '/dashboard';

      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`);
}
