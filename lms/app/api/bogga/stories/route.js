export const dynamic = 'force-dynamic';
import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

function guardSuper(user) {
  return !user || user.user_metadata?.role !== 'super_admin';
}

/* GET — list all stories with pages */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guardSuper(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('stories')
    .select('*, story_pages(id, page_number, text, image_url, image_status)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stories: data ?? [] });
}

/* POST — create new story */
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guardSuper(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim()) return NextResponse.json({ error: 'العنوان مطلوب' }, { status: 400 });

  const slug = body.title.trim()
    .replace(/\s+/g, '-')
    .replace(/[^؀-ۿa-zA-Z0-9-]/g, '')
    + '-' + Date.now().toString(36);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('stories')
    .insert({
      title: body.title.trim(),
      slug,
      level: body.level ?? 'تمهيدي',
      updated_at: new Date().toISOString(),
    })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ story: data }, { status: 201 });
}
