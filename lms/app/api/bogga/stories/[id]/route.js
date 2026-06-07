export const dynamic = 'force-dynamic';
import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';

function guardSuper(user) {
  return !user || user.user_metadata?.role !== 'super_admin';
}

/* POST — add a page to a story */
export async function POST(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guardSuper(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.text?.trim()) return NextResponse.json({ error: 'نص الصفحة مطلوب' }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('story_pages')
    .select('page_number')
    .eq('story_id', params.id)
    .order('page_number', { ascending: false })
    .limit(1);

  const nextPage = (existing?.[0]?.page_number ?? 0) + 1;

  const { data, error } = await admin
    .from('story_pages')
    .insert({ story_id: params.id, page_number: nextPage, text: body.text.trim(), updated_at: new Date().toISOString() })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data }, { status: 201 });
}

/* PATCH — update story meta (title, level, is_published) */
export async function PATCH(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guardSuper(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const admin = createAdminClient();
  const updates = { updated_at: new Date().toISOString() };
  if (body?.title !== undefined) updates.title        = body.title;
  if (body?.level !== undefined) updates.level        = body.level;
  if (body?.is_published !== undefined) updates.is_published = body.is_published;

  const { data, error } = await admin.from('stories').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ story: data });
}

/* DELETE — remove a page (pass { page_id }) or the whole story */
export async function DELETE(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guardSuper(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  if (body?.page_id) {
    const { error } = await admin.from('story_pages').delete().eq('id', body.page_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { error } = await admin.from('stories').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
