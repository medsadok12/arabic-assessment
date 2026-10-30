import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { getRole, isSuspended } from '../../../../../lib/auth-role';
import { splitStoryPages, storyAudioPathFromUrl } from '../../../../../lib/story-audio';
export const dynamic = 'force-dynamic';
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
// Published text/teacher recordings only. No read receipts, balances or writes.
export async function GET(req, { params }) {
  try {
    const { data: { user } } = await createClient().auth.getUser();
    if (!user || !getRole(user) || isSuspended(user)) return json({ error: 'سجّل الدخول لعرض الحكاية.' }, 401);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id || '')) return json({ error: 'هذه الحكاية غير متاحة.' }, 404);
    const { data: story, error } = await createAdminClient().from('stories')
      .select('id, title, content, page_audio, updated_at, accent').eq('id', params.id).eq('status', 'published').maybeSingle();
    if (error) throw error;
    if (!story) return json({ error: 'هذه الحكاية غير متاحة.' }, 404);
    const pages = splitStoryPages(story.content);
    const audio = pages.map((_, i) => { const url = story.page_audio?.[i]; return storyAudioPathFromUrl(url) ? url : null; });
    return json({ story: { id: story.id, title: story.title, accent: /^#[0-9a-f]{6}$/i.test(story.accent || '') ? story.accent : '#10b981', pages, audio, version: `${story.updated_at || ''}:${createHash('sha256').update(String(story.content || '')).digest('hex').slice(0, 16)}` } });
  } catch { return json({ error: 'تعذّر فتح الحكاية الآن. جرّب مرة أخرى.' }, 503); }
}
