export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';

function guard(user) {
  const role = user?.user_metadata?.role;
  return !user || (role !== 'super_admin' && role !== 'admin');
}

export async function PATCH(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guard(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  const patch = {};
  if (body.name      !== undefined) patch.name       = String(body.name).trim();
  if (body.title     !== undefined) patch.title      = String(body.title).trim();
  if (body.bio       !== undefined) patch.bio        = String(body.bio).trim() || null;
  if (body.image_url !== undefined) patch.image_url  = String(body.image_url).trim() || null;
  if (body.sort_order!== undefined) patch.sort_order = Number(body.sort_order);
  if (body.is_active !== undefined) patch.is_active  = Boolean(body.is_active);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('team_members')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

export async function DELETE(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guard(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.from('team_members').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
