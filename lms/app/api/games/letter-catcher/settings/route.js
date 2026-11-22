import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';
import { getRole, isSuspended } from '../../../../../lib/auth-role';
import { LC_GAME_ID, normalizeLcSettings, validateLcSettings } from '../../../../../lib/letter-catcher';

export const dynamic = 'force-dynamic';

// PUT — حفظ إعدادات الجولة لكل الطلاب (معلم/مشرف/مدير). القراءة تصل مع الكلمات في GET /api/games/letter-catcher
export async function PUT(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || isSuspended(user) || !['super_admin', 'admin', 'teacher'].includes(getRole(user) ?? '')) {
      return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    }

    const raw = await request.json().catch(() => null);
    const settings = validateLcSettings(raw);
    if (!settings) return NextResponse.json({ error: 'قيم الإعدادات غير صالحة' }, { status: 400 });

    const admin = createAdminClient();
    // Older editors save only the solo-round fields. Keep the current challenge
    // configuration when they have not sent a challenge section at all.
    if (!Object.prototype.hasOwnProperty.call(raw, 'duel')) {
      const { data: current, error: readError } = await admin.from('game_settings')
        .select('settings').eq('game_id', LC_GAME_ID).maybeSingle();
      if (readError) throw readError;
      settings.duel = normalizeLcSettings(current?.settings).duel;
    }
    const { error } = await admin.from('game_settings').upsert(
      { game_id: LC_GAME_ID, settings, updated_at: new Date().toISOString(), updated_by: user.id },
      { onConflict: 'game_id' }
    );
    if (error) throw error;
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: 'تعذر حفظ الإعدادات. حاول مرة أخرى.' }, { status: 500 });
  }
}
