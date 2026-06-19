import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient }      from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

function isTeacherOrAdmin(role) {
  return ['teacher', 'admin', 'super_admin'].includes(role);
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('word_wheel_configs')
      .select('id, name, center_letter, outer_letters, valid_words, time_seconds, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ configs: [] });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ configs: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isTeacherOrAdmin(user.user_metadata?.role))
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const body = await req.json();
    const { name, center_letter, outer_letters, valid_words, time_seconds } = body;

    if (!name?.trim())           return NextResponse.json({ error: 'اسم العجلة مطلوب' }, { status: 400 });
    if (!center_letter)          return NextResponse.json({ error: 'الحرف الأوسط مطلوب' }, { status: 400 });
    if (!outer_letters?.length)  return NextResponse.json({ error: 'الحروف الخارجية مطلوبة' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('word_wheel_configs')
      .insert({
        name:          name.trim(),
        center_letter,
        outer_letters: outer_letters.slice(0, 8),
        valid_words:   valid_words ?? [],
        time_seconds:  time_seconds ?? 90,
        created_by:    user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ config: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
