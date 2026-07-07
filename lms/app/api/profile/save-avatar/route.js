import { NextResponse }       from 'next/server';
import { createClient }        from '../../../../lib/supabase-server';
import { createAdminClient }   from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/profile/save-avatar
 *
 * Persists the user's custom avatar URL to app_metadata.custom_avatar_url
 * so it survives Google OAuth sign-ins, which overwrite user_metadata.avatar_url
 * on every login.  The /auth/callback route reads this value and restores it
 * after Google resets avatar_url to the Google profile picture.
 *
 * Body: { url }  — the Supabase Storage public URL (cache-buster stripped server-side)
 */
export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { url } = await req.json();
    if (!url?.trim()) return NextResponse.json({ error: 'الرابط مطلوب' }, { status: 400 });

    const cleanUrl = url.split('?')[0]; // strip cache-buster — URL is permanent in public bucket
    const admin    = createAdminClient();
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { custom_avatar_url: cleanUrl },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
