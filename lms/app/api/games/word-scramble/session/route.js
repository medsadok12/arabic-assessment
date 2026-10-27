import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { getRole, isStaff, isSuspended } from '../../../../../lib/auth-role';
import { resolveActiveIdentity } from '../../../../../lib/active-child';
import { scrambleId } from '../../../../../lib/verified-scramble';
import { startScramble, answerScramble, resumeScramble } from '../../../../../lib/verified-scramble-server';
export const dynamic = 'force-dynamic';
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
export async function POST(req) {
  try {
    const { data: { user } } = await createClient().auth.getUser();
    if (!user || !getRole(user) || isSuspended(user)) return json({ error: 'سجّل الدخول لتكمل مغامرتك.' }, 401);
    const text = await req.text();
    if (text.length > 6000) return json({ error: 'أعد المحاولة من اللعبة.' }, 400);
    let body; try { body = JSON.parse(text); } catch { return json({ error: 'أعد المحاولة من اللعبة.' }, 400); }
    if (!scrambleId(body?.roundId) || !['start', 'answer', 'resume'].includes(body.action)) return json({ error: 'ابدأ جولة من اللعبة أولًا.' }, 400);
    const admin = createAdminClient(), preview = isStaff(user);
    if (preview && body.action !== 'start') return json({ error: 'المعاينة لا تحفظ نتائج طلاب.' }, 403);
    const { effectiveUserId } = preview ? { effectiveUserId: user.id } : await resolveActiveIdentity(user, admin, req);
    return json(body.action === 'start' ? await startScramble(admin, user, effectiveUserId, body, preview) : body.action === 'resume' ? await resumeScramble(admin, user, effectiveUserId, body.roundId) : await answerScramble(admin, user, effectiveUserId, body));
  } catch (e) { return json({ error: e.status ? e.message : 'تعذّر تأكيد الحفظ. إجابتك تنتظرك؛ أعد المحاولة.' }, e.status || 503); }
}
