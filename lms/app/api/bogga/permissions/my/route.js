export const dynamic = 'force-dynamic';

import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';

// GET — returns the current assistant admin's own tab permissions
// Result: { permissions: { overview: bool, codes: bool, ... } }
// Any tab not present in DB defaults to false (hidden)
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 401 });
  if (user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('admin_permissions')
    .select('tab_key, is_allowed')
    .eq('admin_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const permissions = {};
  (data ?? []).forEach(row => { permissions[row.tab_key] = row.is_allowed; });

  return NextResponse.json({ permissions });
}
