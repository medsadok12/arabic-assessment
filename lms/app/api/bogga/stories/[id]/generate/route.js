export const dynamic = 'force-dynamic';
import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../../lib/supabase-admin';
import { buildPrompt, falSubmit } from '../../../../../../lib/story-generator';

function guardSuper(user) {
  return !user || user.user_metadata?.role !== 'super_admin';
}

/* POST — submit all pending pages to FAL.ai queue */
export async function POST(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guardSuper(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  if (!process.env.FAL_API_KEY) {
    return NextResponse.json(
      { error: 'FAL_API_KEY غير مضاف في Vercel — أضفه أولاً من Environment Variables' },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const { data: story } = await admin.from('stories').select('title, slug').eq('id', params.id).single();
  const { data: pages } = await admin
    .from('story_pages').select('*').eq('story_id', params.id).order('page_number');

  if (!pages?.length) return NextResponse.json({ error: 'لا توجد صفحات في هذه القصة' }, { status: 400 });

  const results = [];
  for (const page of pages) {
    // Skip pages that already have a ready image
    if (page.image_status === 'ready' && page.image_url) {
      results.push({ pageId: page.id, skipped: true });
      continue;
    }
    try {
      const prompt     = await buildPrompt(page.text, story.title);
      const requestId  = await falSubmit(prompt);
      await admin.from('story_pages').update({
        image_status:   'generating',
        fal_request_id: requestId,
        updated_at:     new Date().toISOString(),
      }).eq('id', page.id);
      results.push({ pageId: page.id, requestId, status: 'submitted' });
    } catch (err) {
      await admin.from('story_pages').update({
        image_status: 'failed',
        updated_at:   new Date().toISOString(),
      }).eq('id', page.id);
      results.push({ pageId: page.id, error: err.message });
    }
  }

  return NextResponse.json({ started: true, results });
}
