import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

// POST — mark story as read + award points (idempotent)
export async function POST(req, { params }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { id } = params;
    const admin = createAdminClient();

    // Fetch story to get points value
    const { data: story, error: storyErr } = await admin
      .from('stories')
      .select('id, title, points, status')
      .eq('id', id)
      .single();

    if (storyErr || !story) return NextResponse.json({ error: 'القصة غير موجودة' }, { status: 404 });
    if (story.status !== 'published') return NextResponse.json({ error: 'القصة غير منشورة' }, { status: 400 });

    // Check if already read (idempotent)
    const { data: existing } = await admin
      .from('story_reads')
      .select('id')
      .eq('user_id', user.id)
      .eq('story_id', id)
      .maybeSingle();

    if (existing) {
      const { data: balRow } = await admin
        .from('user_points')
        .select('total')
        .eq('user_id', user.id)
        .maybeSingle();
      return NextResponse.json({ skipped: true, points: balRow?.total ?? 0 });
    }

    const pts = story.points || 10;
    const reason = `story_${id}`;

    // Mark as read + award points (parallel)
    const { data: balRow } = await admin
      .from('user_points')
      .select('total')
      .eq('user_id', user.id)
      .maybeSingle();
    const newTotal = (balRow?.total ?? 0) + pts;

    await Promise.all([
      admin.from('story_reads').insert({
        user_id:  user.id,
        story_id: id,
        read_at:  new Date().toISOString(),
      }),
      admin.from('user_points').upsert(
        { user_id: user.id, total: newTotal, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      ),
      admin.from('points_log').insert({
        user_id: user.id,
        delta:   pts,
        reason,
      }),
    ]);

    return NextResponse.json({ success: true, points: newTotal, earned: pts });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل' }, { status: 500 });
  }
}
