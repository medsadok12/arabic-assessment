import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED = ['supervisor', 'admin', 'super_admin'];

export async function PATCH(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role;
  if (!user || !ALLOWED.includes(role))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('lesson_logs')
    .update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.user_metadata?.full_name ?? user.email,
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: data });
}
