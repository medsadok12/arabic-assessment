import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient }      from '../../../lib/supabase-server';
import { canEditStories, requireStoryEditor } from '../../../lib/story-auth';
import { splitStoryPages, normalizePageAudio, pageAudioError } from '../../../lib/story-audio';
import { resolveStoryCover } from '../../../lib/story-cover';

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { user, isTeacher: canEditStories(user) };
}

// GET — list stories (published for students, all for teachers)
export async function GET() {
  try {
    const { user, isTeacher } = await getUser();
    if (!user) return NextResponse.json({ stories: [] });

    const admin = createAdminClient();
    let query = admin.from('stories').select('*').order('created_at', { ascending: false });
    if (!isTeacher) query = query.eq('status', 'published');

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ stories: data || [] });
  } catch (e) {
    return NextResponse.json({ stories: [], error: e.message });
  }
}

// POST — create story (teachers only)
export async function POST(req) {
  try {
    const { error: authError } = await requireStoryEditor();
    if (authError) return authError;

    const body = await req.json();
    const { title, icon, level, length, content, status, points, accent, bg, border_color, page_audio, cover_image_url } = body;

    if (!title?.trim()) return NextResponse.json({ error: 'العنوان مطلوب' }, { status: 400 });
    const audioErr = page_audio !== undefined ? pageAudioError(page_audio) : null;
    if (audioErr) return NextResponse.json({ error: audioErr }, { status: 400 });

    // Generate slug from title
    const slug = title.trim()
      .replace(/\s+/g, '-')
      .replace(/[^؀-ۿa-zA-Z0-9-]/g, '')
      + '-' + Date.now().toString(36);

    const admin = createAdminClient();
    // صورة الغلاف (اختيارية): تُرفع إلى Storage ويُحفظ رابطها فقط
    const cover = await resolveStoryCover(admin, cover_image_url, 'new');
    if (cover.error) return NextResponse.json({ error: cover.error }, { status: 400 });

    const { data, error } = await admin
      .from('stories')
      .insert({
        slug,
        title:        title.trim(),
        icon:         icon || '📖',
        level:        parseInt(level) || 1,
        length:       length || 'قصيرة',
        content:      content || '',
        status:       status || 'draft',
        points:       parseInt(points) || 10,
        accent:       accent || '#10b981',
        bg:           bg || '#ecfdf5',
        border_color: border_color || '#6ee7b7',
        page_audio:   normalizePageAudio(page_audio, splitStoryPages(content).length),
        cover_image_url: cover.value || null,
        created_at:   new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ story: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الإنشاء' }, { status: 500 });
  }
}
