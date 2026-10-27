import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { isSuspended } from '../../../../lib/auth-role';
import { getRole }           from '../../../../lib/auth-role';
import { resolveActiveIdentity } from '../../../../lib/active-child';
import { awardPoints }       from '../../../../lib/points-server';
import { HUROOF_COUNT, HUROOF_POINTS, huroofTarget } from '../../../../lib/huroof';
import { checkSpelling } from '../../../../lib/huroof-spell';
import { loadHuroofLetters, loadHuroofSettings, loadSolved } from '../../../../lib/huroof-server';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const STAFF = ['teacher', 'admin', 'super_admin'];
const isStaff = (user) => STAFF.includes(getRole(user) ?? '');

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && !isSuspended(user) ? user : null;
}

/* نقاط مرة واحدة لكل حرف ولإكمال الحروف كلها (نفس أسباب /api/points فلا تُمنح مرتين) */
async function award(admin, userId, reason, amount) {
  for (let i = 0; i < 2; i++) {
    const r = await awardPoints(admin, userId, reason, amount, { dedup: true });
    if (!r.conflict) return r;
  }
  return null;
}

// GET — مسار الطالب في الجولة الحالية: { epoch, solved: [{idx, solved_at}], seed }
// للمعلم/المدير مع ?students=1: الطلاب الذين بدؤوا الجولة وعدد ما حلّه كلٌّ منهم
export async function GET(req) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 401, headers: NO_STORE });
  try {
    const admin = createAdminClient();
    const settings = await loadHuroofSettings(admin);

    if (new URL(req.url).searchParams.get('students') === '1') {
      if (!isStaff(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403, headers: NO_STORE });
      const { data, error } = await admin
        .from('huroof_progress').select('user_id, student_name, solved_at')
        .eq('epoch', settings.epoch).order('solved_at', { ascending: false }).limit(5000);
      if (error) throw error;
      const by = new Map();
      for (const r of data || []) {
        const s = by.get(r.user_id) || { user_id: r.user_id, name: r.student_name || 'طالب', solved: 0, last_at: r.solved_at };
        s.solved += 1;
        by.set(r.user_id, s);
      }
      return NextResponse.json({ epoch: settings.epoch, students: [...by.values()].sort((a, b) => b.solved - a.solved) }, { headers: NO_STORE });
    }

    if(['teacher','admin','super_admin','supervisor'].includes(getRole(user)))return NextResponse.json({epoch:settings.epoch,solved:[],seed:`preview:${user.id}`,preview:true},{headers:NO_STORE});
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    const solved = await loadSolved(admin, effectiveUserId, settings.epoch);
    return NextResponse.json({ epoch: settings.epoch, solved, seed: `${effectiveUserId}:${settings.epoch}` }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: NO_STORE });
  }
}

// POST { idx, answer, attempts?, hints? } — الخادم يدقّق الإجابة بالمدقق نفسه ثم يسجّل الحرف
// ويمنح نقاطه (مرة واحدة)، ونقاط الإكمال عند الحرف الثامن والعشرين
export async function POST(req) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const idx = body?.idx;
  if (!Number.isInteger(idx) || idx < 0 || idx >= HUROOF_COUNT) return NextResponse.json({ error: 'حرف غير موجود' }, { status: 400 });
  if (typeof body?.answer !== 'string' || body.answer.length > 80) return NextResponse.json({ error: 'إجابة غير صالحة' }, { status: 400 });
  const small = (v) => (Number.isInteger(v) && v >= 0 ? Math.min(v, 999) : 0);

  try {
    const admin = createAdminClient();
    const [letters, settings, identity] = await Promise.all([
      loadHuroofLetters(admin), loadHuroofSettings(admin), resolveActiveIdentity(user, admin, req),
    ]);
    const result = checkSpelling(body.answer, huroofTarget(letters[idx]), { allowAl: settings.accept_al });
    if (!result.ok) return NextResponse.json({ ok: false, result });
    if(['teacher','admin','super_admin','supervisor'].includes(getRole(user)))return NextResponse.json({ok:true,preview:true,solved:[{idx,solved_at:new Date().toISOString()}],complete:false});

    const userId = identity.effectiveUserId;
    const name = identity.viewingChild?.full_name || user.user_metadata?.full_name || (user.email || '').split('@')[0] || null;
    const { error } = await admin.from('huroof_progress').upsert({
      user_id: userId, epoch: settings.epoch, idx,
      attempts: small(body.attempts), hints: small(body.hints), student_name: name,
    }, { onConflict: 'user_id,epoch,idx', ignoreDuplicates: true });
    if (error) throw error;

    const solved = await loadSolved(admin, userId, settings.epoch);
    const complete = solved.length >= HUROOF_COUNT;
    await award(admin, userId, `huroof_letter:${idx}`, HUROOF_POINTS.letter);
    if (complete) await award(admin, userId, 'huroof_all_complete', HUROOF_POINTS.all);
    return NextResponse.json({ ok: true, solved, complete });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر حفظ الحرف، حاول مرة أخرى' }, { status: 500 });
  }
}

// DELETE { scope: 'me' } أو { scope: 'user', user_id } — إعادة ضبط مسار في الجولة الحالية (معلم/مدير)
export async function DELETE(req) {
  const user = await getUser();
  if (!user || !isStaff(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  const body = await req.json().catch(() => null);
  try {
    const admin = createAdminClient();
    const settings = await loadHuroofSettings(admin);
    let target = null;
    if (body?.scope === 'me') target = (await resolveActiveIdentity(user, admin, req)).effectiveUserId;
    else if (body?.scope === 'user' && typeof body.user_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.user_id)) target = body.user_id;
    if (!target) return NextResponse.json({ error: 'طالب غير محدد' }, { status: 400 });
    const { error } = await admin.from('huroof_progress').delete().eq('user_id', target).eq('epoch', settings.epoch);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّرت إعادة الضبط' }, { status: 500 });
  }
}
