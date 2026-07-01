export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

function guard(user) {
  const role = user?.user_metadata?.role;
  return !user || (role !== 'super_admin' && role !== 'admin');
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guard(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('team_members')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guard(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('team_members')
    .insert({
      name:       String(body.name  ?? '').trim(),
      title:      String(body.title ?? '').trim(),
      bio:        String(body.bio   ?? '').trim() || null,
      image_url:  String(body.image_url ?? '').trim() || null,
      sort_order: Number(body.sort_order ?? 0),
      is_active:  body.is_active !== false,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}
