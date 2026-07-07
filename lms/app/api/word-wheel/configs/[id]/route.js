import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';
import { getRole } from '../../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

function isTeacherOrAdmin(role) {
  return ['teacher', 'admin', 'super_admin'].includes(role);
}

export async function PUT(req, { params }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isTeacherOrAdmin(getRole(user)))
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const body = await req.json();
    const { name, center_letter, outer_letters, valid_words, time_seconds, is_active } = body;

    const admin = createAdminClient();

    // Teachers may edit only their own wheels; admins/super_admins may edit any.
    if (getRole(user) === 'teacher') {
      const { data: owned } = await admin
        .from('word_wheel_configs').select('created_by').eq('id', params.id).maybeSingle();
      if (!owned) return NextResponse.json({ error: 'العجلة غير موجودة' }, { status: 404 });
      if (owned.created_by !== user.id)
        return NextResponse.json({ error: 'لا يمكنك تعديل عجلة أنشأها معلم آخر' }, { status: 403 });
    }

    const update = {};
    if (name          !== undefined) update.name           = name.trim();
    if (center_letter !== undefined) update.center_letter  = center_letter;
    if (outer_letters !== undefined) update.outer_letters  = outer_letters.slice(0, 8);
    if (valid_words   !== undefined) update.valid_words    = valid_words;
    if (time_seconds  !== undefined) update.time_seconds   = time_seconds;
    if (is_active     !== undefined) update.is_active      = is_active;

    const { data, error } = await admin
      .from('word_wheel_configs')
      .update(update)
      .eq('id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ config: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isTeacherOrAdmin(getRole(user)))
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const admin = createAdminClient();

    // Teachers may delete only their own wheels; admins/super_admins may delete any.
    if (getRole(user) === 'teacher') {
      const { data: owned } = await admin
        .from('word_wheel_configs').select('created_by').eq('id', params.id).maybeSingle();
      if (!owned) return NextResponse.json({ error: 'العجلة غير موجودة' }, { status: 404 });
      if (owned.created_by !== user.id)
        return NextResponse.json({ error: 'لا يمكنك حذف عجلة أنشأها معلم آخر' }, { status: 403 });
    }

    const { error } = await admin
      .from('word_wheel_configs')
      .update({ is_active: false })
      .eq('id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
