export const dynamic = 'force-dynamic';
import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../../lib/supabase-admin';
import { falStatus, falResult, saveToStorage } from '../../../../../../lib/story-generator';

function guardSuper(user) {
  return !user || user.user_metadata?.role !== 'super_admin';
}

/* GET — poll all generating pages for this story, save completed ones */
export async function GET(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guardSuper(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data: story } = await admin.from('stories').select('slug').eq('id', params.id).single();

  const { data: pages } = await admin
    .from('story_pages')
    .select('*')
    .eq('story_id', params.id)
    .eq('image_status', 'generating')
    .not('fal_request_id', 'is', null);

  if (!pages?.length) return NextResponse.json({ results: [], allDone: true });

  const results = [];
  for (const page of pages) {
    try {
      const status = await falStatus(page.fal_request_id);

      if (status === 'COMPLETED') {
        const imageUrl = await falResult(page.fal_request_id);
        if (!imageUrl) throw new Error('لم يُعَد رابط الصورة');

        const publicUrl = await saveToStorage(imageUrl, story.slug, page.page_number, admin);

        await admin.from('story_pages').update({
          image_url:    publicUrl,
          image_status: 'ready',
          updated_at:   new Date().toISOString(),
        }).eq('id', page.id);

        results.push({ pageId: page.id, status: 'ready', imageUrl: publicUrl });

      } else if (status === 'FAILED') {
        await admin.from('story_pages').update({
          image_status: 'failed',
          updated_at:   new Date().toISOString(),
        }).eq('id', page.id);
        results.push({ pageId: page.id, status: 'failed' });

      } else {
        results.push({ pageId: page.id, status }); // IN_QUEUE | IN_PROGRESS
      }
    } catch (err) {
      results.push({ pageId: page.id, status: 'error', error: err.message });
    }
  }

  const stillGenerating = results.some(r => r.status === 'IN_QUEUE' || r.status === 'IN_PROGRESS');
  return NextResponse.json({ results, allDone: !stillGenerating });
}
