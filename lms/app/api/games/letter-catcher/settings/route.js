import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';
import { getRole } from '../../../../../lib/auth-role';
import { LC_GAME_ID, validateLcSettings } from '../../../../../lib/letter-catcher';

export const dynamic = 'force-dynamic';

// PUT — حفظ إعدادات الجولة لكل الطلاب (معلم/مشرف/مدير). القراءة تصل مع الكلمات في GET /api/games/letter-catcher
export async function PUT(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !['super_admin', 'admin', 'teacher'].includes(getRole(user) ?? '')) {
      return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    }

    const settings = validateLcSettings(await request.json().catch(() => null));
    if (!settings) return NextResponse.json({ error: 'قيم الإعدادات غير صالحة' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from('game_settings').upsert(
      { game_id: LC_GAME_ID, settings, updated_at: new Date().toISOString(), updated_by: user.id },
      { onConflict: 'game_id' }
    );
    if (error) throw error;
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل حفظ الإعدادات' }, { status: 500 });
  }
}
