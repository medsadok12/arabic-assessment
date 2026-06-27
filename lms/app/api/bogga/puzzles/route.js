import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

async function authGuard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin') return null;
  return user;
}

export async function GET() {
  try {
    const user = await authGuard();
    if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    const admin = createAdminClient();
    const { data, error } = await admin.from('puzzles').select('*').order('seq', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ puzzles: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await authGuard();
    if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    const body = await req.json();
    const admin = createAdminClient();
    const { data: last } = await admin.from('puzzles').select('seq').order('seq', { ascending: false }).limit(1).single();
    const seq = (last?.seq ?? 0) + 1;
    const { data, error } = await admin.from('puzzles').insert({
      title:      body.title?.trim() || 'أحجية جديدة',
      cols:       Number(body.cols)  || 3,
      rows:       Number(body.rows)  || 3,
      image_url:  body.image_url     || null,
      badge_name: body.badge_name    || null,
      badge_icon: body.badge_icon    || null,
      is_active:  body.is_active ?? true,
      seq,
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ puzzle: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await authGuard();
    if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    const body = await req.json();
    const admin = createAdminClient();
    const { data, error } = await admin.from('puzzles').update({
      title:      body.title?.trim() || 'أحجية',
      cols:       Number(body.cols)  || 3,
      rows:       Number(body.rows)  || 3,
      image_url:  body.image_url     ?? null,
      badge_name: body.badge_name    || null,
      badge_icon: body.badge_icon    || null,
      is_active:  body.is_active ?? true,
    }).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json({ puzzle: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await authGuard();
    if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    const admin = createAdminClient();
    const { error } = await admin.from('puzzles').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
