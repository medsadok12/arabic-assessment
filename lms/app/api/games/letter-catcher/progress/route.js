import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { getRole, isStaff, isSuspended } from '../../../../../lib/auth-role';
import { resolveActiveIdentity } from '../../../../../lib/active-child';
import { readLcStageContext } from '../../../../../lib/letter-catcher-stage-progress-server';

export const dynamic = 'force-dynamic';
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });

export async function GET(req) {
  try {
    const { data: { user } } = await createClient().auth.getUser();
    if (!user || !getRole(user) || isSuspended(user)) return json({ error: 'سجّل الدخول لتكمل مراحلِك.' }, 401);
    const admin = createAdminClient(), preview = isStaff(user);
    const { effectiveUserId } = preview ? { effectiveUserId: user.id } : await resolveActiveIdentity(user, admin, req);
    const [wordsResult, settingsResult] = await Promise.all([
      admin.from('letter_catcher_words').select('id, word, missing_letter, options, topic, grade_level, category').order('id').limit(1000),
      admin.from('game_settings').select('settings').eq('game_id', 'letter-catcher').maybeSingle(),
    ]);
    if (wordsResult.error || settingsResult.error) return json({ error: 'تعذّر عرض مراحلِك. جرّب مرة أخرى.' }, 503);
    const { progress, unlockedCategories } = await readLcStageContext(admin, user, effectiveUserId, {
      words: wordsResult.data || [], settings: settingsResult.data?.settings, preview,
    });
    return json({ progress, unlockedCategories });
  } catch (error) {
    return json({ error: error.status ? error.message : 'تعذّر عرض مراحلِك. جرّب مرة أخرى.' }, error.status || 503);
  }
}
