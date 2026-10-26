import { createAdminClient } from '../../../../lib/supabase-admin';
import { resolveActiveIdentity } from '../../../../lib/active-child';
import { getRole } from '../../../../lib/auth-role';
import { awardPoints } from '../../../../lib/points-server';
import { DISCOVER_ID, checkDiscoverAnswer } from '../../../../lib/discover-objects';
import { discoverJson as json, discoverUser, loadDiscover } from '../../../../lib/discover-objects-server';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const auth = await discoverUser();
  if (auth.error) return auth.error;
  let body;
  try { body = await req.json(); } catch { return json({ error: 'أعد المحاولة يا بطل' }, 400); }
  try {
    const admin = createAdminClient();
    const { config, version } = await loadDiscover(admin);
    if (!config.enabled && !auth.staff) return json({ error: 'هذا التدريب يستريح قليلًا، اختر مغامرة أخرى.' }, 403);
    if (body?.version !== version) return json({ error: 'أضاف المعلم شيئًا جديدًا! افتح التدريب من جديد.' }, 409);
    if (!checkDiscoverAnswer(config, body)) return json({ error: config.retryMessage }, 400);
    // تجارب الطاقم لا تكتب نتائج ولا تمنح نقاطًا لأي طفل.
    if (auth.staff || getRole(auth.user) === 'supervisor') return json({ success: true, preview: true, awarded: 0 });
    const { effectiveUserId } = await resolveActiveIdentity(auth.user, admin, req);
    // مفتاح نصي خاص باللعبة في game_settings (مخططه موثّق): يحجز مكافأة الطفل/اللغز
    // ذريًا بـPK، دون افتراض نوع id في game_results أو تعديل مخططه.
    const claim = `${DISCOVER_ID}:completed:${effectiveUserId}:${body.roundId}`;
    const { error: claimError } = await admin.from('game_settings').insert({ game_id: claim, settings: { user_id: effectiveUserId, round_id: body.roundId }, updated_at: new Date().toISOString(), updated_by: auth.user.id });
    if (claimError?.code === '23505') return json({ success: true, skipped: true, awarded: 0 });
    if (claimError) throw claimError;
    try {
      const result = config.pointsPerRound ? await awardPoints(admin, effectiveUserId, `${DISCOVER_ID}:${body.roundId}`, config.pointsPerRound, { dedup: true }) : { skipped: true };
      if (result.conflict) {
        await admin.from('game_settings').delete().eq('game_id', claim);
        return json({ error: 'نجومك تنتظرك! اضغط حفظ الإنجاز مرة أخرى.' }, 409);
      }
      // نفس حقول مسار النتائج القائم، بلا افتراض لمعرّف الجدول.
      const steps = 1 + Number(config.build) + Number(config.read);
      await admin.from('game_results').insert({ user_id: effectiveUserId, game_id: DISCOVER_ID, category: body.roundId, correct: steps, wrong: 0, total: steps });
      return json({ success: true, awarded: result.skipped ? 0 : config.pointsPerRound });
    } catch (e) {
      await admin.from('game_settings').delete().eq('game_id', claim);
      throw e;
    }
  } catch { return json({ error: 'تعذّر حفظ الإنجاز الآن. جرّب ثانية وستبقى مغامرتك هنا.' }, 503); }
}
