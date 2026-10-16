import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';
import { DEFAULT_CATALOG } from '../../../../lib/word-wheel';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('word_wheel_catalog').select('*');
    if (error && error.code !== '42P01') throw error;

    const overrides = {};
    (data || []).forEach(row => { overrides[`${row.level}_${row.wheel_index}`] = row; });

    const merged = DEFAULT_CATALOG.map(wheel => {
      const ov = overrides[`${wheel.level}_${wheel.wheel_index}`];
      if (!ov) return wheel;
      return {
        ...wheel,
        valid_words:  ov.valid_words   ?? wheel.valid_words,
        time:         ov.time_seconds  ?? wheel.time,
        letters:      ov.outer_letters?.length ? ov.outer_letters : wheel.letters,
        center:       ov.center_letter || wheel.center,
      };
    });
    return NextResponse.json({ catalog: merged });
  } catch {
    return NextResponse.json({ catalog: DEFAULT_CATALOG });
  }
}

export async function PUT(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !['teacher','admin','super_admin'].includes(getRole(user)))
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const { level, wheel_index, valid_words, center_letter, outer_letters, time_seconds } = await req.json();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('word_wheel_catalog')
      .upsert({ level, wheel_index, valid_words, center_letter, outer_letters, time_seconds, updated_at: new Date().toISOString() },
              { onConflict: 'level,wheel_index' })
      .select().single();

    if (error) {
      if (error.code === '42P01')
        return NextResponse.json({ error: 'جدول word_wheel_catalog غير موجود — شغّل SQL الإعداد أولاً', need_sql: true }, { status: 500 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ wheel: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
