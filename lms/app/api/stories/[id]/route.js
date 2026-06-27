import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

async function getTeacher() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role ?? '';
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
    const { title, icon, level, length, content, status, points, accent, bg, border_color } = body;

    const admin = createAdminClient();
    const updates = {
      updated_at: new Date().toISOString(),
    };
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
    const { error } = await admin.from('stories').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحذف' }, { status: 500 });
  }
}
