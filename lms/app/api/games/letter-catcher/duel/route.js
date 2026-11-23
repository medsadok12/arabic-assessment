import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { getRole, isStaff, isSuspended } from '../../../../../lib/auth-role';
import { resolveActiveIdentity } from '../../../../../lib/active-child';
import { getClientIP, ipRateCheck } from '../../../../../lib/ip-rate-check';
import { createDuelRoom, duelParticipant, duelRoomCode, loadDuelSettings, resetOpenDuels, updateDuelRoom } from '../../../../../lib/letter-catcher-duel-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
const failure = (message, status) => Object.assign(new Error(message), { status });

async function authenticate(request) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user || !getRole(user) || isSuspended(user)) throw failure('سجّل الدخول لتلعب مع صديقك.', 401);
  const admin = createAdminClient();
  const identity = await resolveActiveIdentity(user, admin, request);
  return { admin, actor: { user, participant: await duelParticipant(user, identity, admin), staff: isStaff(user) } };
}

async function throttle(request, actor, kind) {
  const create = kind === 'create';
  const allowed = await Promise.all([
    ipRateCheck(`user:${actor.user.id}`, `rl:lc-duel:${kind}:user`, create ? 4 : 20, create ? 40 : 180),
    ipRateCheck(getClientIP(request), `rl:lc-duel:${kind}:ip`, create ? 12 : 60, create ? 100 : 600),
  ]);
  if (allowed.includes(false)) throw failure('لنأخذ استراحة قصيرة. جرّب الرمز أو افتح تحديًا بعد قليل.', 429);
}

function errorResponse(error) {
  return json({ error: error.status ? error.message : 'تعذّر فتح التحدي الآن. جرّب مرة أخرى، مغامرتك تنتظرك.' }, error.status || 503);
}

export async function GET(request) {
  try {
    const { admin, actor } = await authenticate(request);
    const searchParams = new URL(request.url).searchParams;
    if (searchParams.get('profile') === '1') return json({ player: actor.participant });
    const code = searchParams.get('code');
    if (!duelRoomCode(code)) throw failure('اكتب رمز التحدي المكوّن من 6 أرقام.', 400);
    try { return json(await updateDuelRoom(admin, actor, { action: 'sync', code })); }
    catch (error) { if (error.status === 404) await throttle(request, actor, 'join'); throw error; }
  } catch (error) { return errorResponse(error); }
}

export async function POST(request) {
  try {
    const { admin, actor } = await authenticate(request);
    const text = await request.text();
    if (text.length > 4000) throw failure('اختر خطوة من التحدي ثم حاول مرة أخرى.', 400);
    let body;
    try { body = JSON.parse(text); } catch { throw failure('اختر خطوة من التحدي ثم حاول مرة أخرى.', 400); }
    if (body?.action === 'reset') {
      if (!actor.staff) throw failure('إنهاء التحديات متاح للمعلم والإدارة.', 403);
      return json(await resetOpenDuels(admin));
    }
    if (body?.action === 'create' || body?.action === 'join') {
      await throttle(request, actor, body.action);
      const settings = await loadDuelSettings(admin);
      if (!settings.enabled && !actor.staff) throw failure('تحدي الأصدقاء يستريح الآن. يمكنك متابعة تدريبك الفردي.', 403);
      if (body.action === 'create') return json(await createDuelRoom(admin, actor, settings));
    }
    return json(await updateDuelRoom(admin, actor, body));
  } catch (error) { return errorResponse(error); }
}
