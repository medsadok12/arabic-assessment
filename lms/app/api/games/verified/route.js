import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { isStaff, isSuspended, getRole } from '../../../../lib/auth-role';
import { resolveActiveIdentity } from '../../../../lib/active-child';
import { VERIFIED_GAMES } from '../../../../lib/verified-training';
import { scrambleId } from '../../../../lib/verified-scramble';
import { startTraining, trainingEvent, resumeTraining } from '../../../../lib/verified-training-server';
export const dynamic = 'force-dynamic';
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
export async function POST(req) {
  try {
    const { data: { user } } = await createClient().auth.getUser();
    if (!user || !getRole(user) || isSuspended(user)) return json({ error: 'سجّل الدخول لتكمل التدريب.' }, 401);
    const text = await req.text(); if (text.length > 80000) return json({ error: 'أعد المحاولة من التدريب.' }, 400);
    let body; try { body = JSON.parse(text); } catch { return json({ error: 'أعد المحاولة من التدريب.' }, 400); }
    if (!VERIFIED_GAMES.includes(body?.game) || !scrambleId(body.roundId)) return json({ error: 'ابدأ جولة من التدريب.' }, 400);
    const admin = createAdminClient(), preview = isStaff(user);
    if (preview && body.action !== 'start') return json({ error: 'المعاينة لا تحفظ نتائج طلاب.' }, 403);
    const { effectiveUserId } = preview ? { effectiveUserId: user.id } : await resolveActiveIdentity(user, admin, req);
    return json(body.action === 'start' ? await startTraining(admin, user, effectiveUserId, body, preview) : body.action === 'resume' ? await resumeTraining(admin, user, effectiveUserId, body) : await trainingEvent(admin, user, effectiveUserId, body));
  } catch (e) { return json({ error: e.status ? e.message : 'تعذّر تأكيد الحفظ. أعد المحاولة؛ إجابتك تنتظرك.' }, e.status || 503); }
}
