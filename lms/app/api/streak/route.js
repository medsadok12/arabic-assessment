import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient }      from '../../../lib/supabase-server';
import { awardPoints }       from '../../../lib/points';

function calcStreak(dates) {
  if (!dates.length) return 0;
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  // streak must touch today or yesterday (gap allowed only if today not yet played)
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak   = 0;
  let expected = dates[0];
  for (const date of dates) {
    if (date === expected) {
      streak++;
      const d = new Date(expected);
      d.setDate(d.getDate() - 1);
      expected = d.toISOString().slice(0, 10);
    } else {
      break;
    }
  }
  return streak;
}

// GET — return streak info for current user
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ streak: 0, logged_today: false, last_7: [] });

    const admin = createAdminClient();
    const { data } = await admin
      .from('daily_logs')
      .select('log_date')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(365);

    const dates     = (data || []).map(r => r.log_date);
    const dateSet   = new Set(dates);
    const today     = new Date().toISOString().slice(0, 10);
    const streak    = calcStreak(dates);

    // last 7 days (oldest → newest)
    const AR_DAYS   = ['ح','ن','ث','ر','خ','ج','س'];
    const last_7    = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const ds = d.toISOString().slice(0, 10);
      return { date: ds, active: dateSet.has(ds), day: AR_DAYS[d.getDay()] };
    });

    return NextResponse.json({ streak, logged_today: dateSet.has(today), last_7 });
  } catch (e) {
    return NextResponse.json({ streak: 0, logged_today: false, last_7: [] });
  }
}

// POST — log today's activity (idempotent)
export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false });

    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    await admin
      .from('daily_logs')
      .upsert({ user_id: user.id, log_date: today },
               { onConflict: 'user_id,log_date', ignoreDuplicates: true });

    const { data } = await admin
      .from('daily_logs')
      .select('log_date')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(365);

    const dates = (data || []).map(r => r.log_date);

    // ── Streak-freeze auto-apply ──
    // If the child returned after a gap, spend held freezes to bridge the missed days
    // (only when the balance covers the WHOLE gap — otherwise the streak breaks anyway,
    // so we don't waste tokens). Bridged days are written to daily_logs, so every streak
    // view stays consistent with no change to calcStreak.
    const priorToToday = dates.filter(d => d < today);
    if (priorToToday.length > 0) {
      const last   = priorToToday[0];               // most recent active day before today
      const missed = [];
      const cur    = new Date(`${last}T00:00:00Z`);
      cur.setUTCDate(cur.getUTCDate() + 1);
      const todayD = new Date(`${today}T00:00:00Z`);
      while (cur < todayD) { missed.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }

      if (missed.length > 0) {
        const { data: fz } = await admin
          .from('streak_freezes').select('balance').eq('user_id', user.id).maybeSingle();
        const balance = fz?.balance ?? 0;
        if (balance >= missed.length) {
          await admin.from('daily_logs').upsert(
            missed.map(d => ({ user_id: user.id, log_date: d })),
            { onConflict: 'user_id,log_date', ignoreDuplicates: true }
          );
          await admin.from('streak_freezes')
            .update({ balance: balance - missed.length }).eq('user_id', user.id);
          dates.push(...missed);
          dates.sort((a, b) => b.localeCompare(a));   // keep descending for calcStreak
        }
      }
    }

    const streak = calcStreak(dates);

    awardPoints(user.id, 10, `daily_login:${today}`).catch(() => {});

    return NextResponse.json({ ok: true, streak });
  } catch (e) {
    return NextResponse.json({ ok: false });
  }
}
