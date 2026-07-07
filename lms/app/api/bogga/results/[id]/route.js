import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { getRole } from '../../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = getRole(user);
  if (!user || (role !== 'super_admin' && role !== 'admin'))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { notes } = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('assessments')
    .update({ notes: notes ?? null })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ result: data });
}
