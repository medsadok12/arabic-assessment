export const dynamic = 'force-dynamic';

import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

function guardSuper(user) {
  return !user || user.user_metadata?.role !== 'super_admin';
}

// GET — fetch all permissions (super_admin only)
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guardSuper(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('admin_permissions')
    .select('admin_id, tab_key, is_allowed');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ permissions: data ?? [] });
}

// POST — upsert one permission entry (super_admin only)
// Body: { admin_id, tab_key, is_allowed }
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guardSuper(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const { admin_id, tab_key, is_allowed } = body;
  if (!admin_id || !tab_key || typeof is_allowed !== 'boolean') {
    return NextResponse.json({ error: 'بيانات ناقصة أو غير صالحة' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Manual upsert — resilient even if the UNIQUE(admin_id, tab_key) constraint
  // is missing on the live table (avoids silent ON CONFLICT failures that made
  // toggles revert to the default "hidden" state after closing the popover).
  const { data: existing, error: selErr } = await admin
    .from('admin_permissions')
    .select('id')
    .eq('admin_id', admin_id)
    .eq('tab_key', tab_key)
    .maybeSingle();

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  let error;
  if (existing) {
    ({ error } = await admin
      .from('admin_permissions')
      .update({ is_allowed, updated_at: new Date().toISOString() })
      .eq('id', existing.id));
  } else {
    ({ error } = await admin
      .from('admin_permissions')
      .insert({ admin_id, tab_key, is_allowed, updated_at: new Date().toISOString() }));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
