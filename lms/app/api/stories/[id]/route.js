import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';
import { STORY_AUDIO_BUCKET, storyAudioPathFromUrl } from '../../../../lib/story-audio';

export const dynamic = 'force-dynamic';

// حذف ملف صوت قديم من التخزين — أفضل جهد: فشله لا يُفشل العملية الأصلية
async function removeStoryAudio(admin, url) {
  const path = storyAudioPathFromUrl(url);
  if (!path) return;
  try { await admin.storage.from(STORY_AUDIO_BUCKET).remove([path]); } catch {}
}

async function getTeacher() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = getRole(user) ?? '';
  return { user, isTeacher: ['super_admin', 'admin', 'teacher'].includes(role) };
}

// GET — single story by id or slug
export async function GET(req, { params }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { id } = params;
    const admin = createAdminClient();

    // try by UUID first, then slug
    const isUUID = /^[0-9a-f-]{36}$/i.test(id);
    const { data, error } = await admin
      .from('stories')
      .select('*')
      .eq(isUUID ? 'id' : 'slug', id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'القصة غير موجودة' }, { status: 404 });
    return NextResponse.json({ story: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT — update story (teachers only)
export async function PUT(req, { params }) {
  try {
    const { user, isTeacher } = await getTeacher();
    if (!user || !isTeacher) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { id } = params;
    const body = await req.json();
    const { title, icon, level, length, content, status, points, accent, bg, border_color, audio_url } = body;

    const admin = createAdminClient();
    const updates = {
      updated_at: new Date().toISOString(),
    };

    // صوت القصة: يُقبل فقط رابط من مجلد صوت القصص في تخزيننا، أو null للحذف
    let oldAudioUrl = null;
    if (audio_url !== undefined) {
      if (audio_url && !storyAudioPathFromUrl(audio_url))
        return NextResponse.json({ error: 'رابط الصوت غير صالح' }, { status: 400 });
      updates.audio_url = audio_url || null;
      const { data: current } = await admin.from('stories').select('audio_url').eq('id', id).maybeSingle();
      oldAudioUrl = current?.audio_url || null;
    }
    if (title       !== undefined) updates.title        = title;
    if (icon        !== undefined) updates.icon         = icon;
    if (level       !== undefined) updates.level        = parseInt(level);
    if (length      !== undefined) updates.length       = length;
    if (content     !== undefined) updates.content      = content;
    if (status      !== undefined) updates.status       = status;
    if (points      !== undefined) updates.points       = parseInt(points);
    if (accent      !== undefined) updates.accent       = accent;
    if (bg          !== undefined) updates.bg           = bg;
    if (border_color !== undefined) updates.border_color = border_color;

    const { data, error } = await admin
      .from('stories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (oldAudioUrl && oldAudioUrl !== updates.audio_url) await removeStoryAudio(admin, oldAudioUrl);
    return NextResponse.json({ story: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل التحديث' }, { status: 500 });
  }
}

// DELETE — delete story (teachers only)
export async function DELETE(req, { params }) {
  try {
    const { user, isTeacher } = await getTeacher();
    if (!user || !isTeacher) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

    const { id } = params;
    const admin = createAdminClient();
    const { data: current } = await admin.from('stories').select('audio_url').eq('id', id).maybeSingle();
    const { error } = await admin.from('stories').delete().eq('id', id);
    if (error) throw error;
    if (current?.audio_url) await removeStoryAudio(admin, current.audio_url);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحذف' }, { status: 500 });
  }
}
