import { createServerClient } from '@supabase/ssr';
import { cookies }            from 'next/headers';
import { NextResponse }       from 'next/server';
import { createAdminClient }  from '../../../../lib/supabase-admin';

export async function GET(request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
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

  // Record precise logout timestamp before clearing the session
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const admin = createAdminClient();
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { last_logout_at: new Date().toISOString() },
      });
    }
  } catch {
    // Non-blocking — proceed with signout even if recording fails
  }

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/', request.url));
}
