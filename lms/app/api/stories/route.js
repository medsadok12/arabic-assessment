export const dynamic = 'force-dynamic';
import { NextResponse }      from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';

/* GET — public catalog of published stories */
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('stories')
    .select('id, title, slug, level, cover_image_url, story_pages(id, page_number, image_url)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stories: data ?? [] });
}
