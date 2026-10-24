import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { ACTIVE_CHILD_COOKIE } from '../../../../lib/active-child';

export const dynamic = 'force-dynamic';

// Persists which child (if any) is "active" for this browser, so that every
// subsequent API call — including from pages that carry no ?child= param at
// all, like the games — resolves data for the right sibling instead of
// always falling back to whoever is actually logged in (the family login).
export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const childId = body?.childId || null;
    const store = cookies();

    if (!childId) {
      store.delete(ACTIVE_CHILD_COOKIE);
      return NextResponse.json({ ok: true, active: null });
    }

    const admin = createAdminClient();
    const { data: childRow } = await admin
      .from('students')
      .select('id')
      .eq('id', childId)
      .eq('parent_user_id', user.id)
      .maybeSingle();

    if (!childRow) return NextResponse.json({ error: 'طفل غير معروف' }, { status: 403 });

    store.set(ACTIVE_CHILD_COOKIE, childRow.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return NextResponse.json({ ok: true, active: childRow.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
