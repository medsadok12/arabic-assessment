export const dynamic = 'force-dynamic';
import { NextResponse }      from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';

/* GET — public endpoint: fetch a published story with its pages */
export async function GET(req, { params }) {
  const admin = createAdminClient();

  const { data: story, error } = await admin
    .from('stories')
    .select('*, story_pages(id, page_number, text, image_url, image_status)')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .order('page_number', { foreignTable: 'story_pages', ascending: true })
    .single();

  if (error || !story) return NextResponse.json({ error: 'القصة غير موجودة' }, { status: 404 });
  return NextResponse.json({ story });
}
