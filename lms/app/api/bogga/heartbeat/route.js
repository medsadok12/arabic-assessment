import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, last_seen_at: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true });
}
