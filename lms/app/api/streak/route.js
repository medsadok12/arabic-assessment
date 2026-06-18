import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient }      from '../../../lib/supabase-server';

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
    await admin
      .from('daily_logs')
      .upsert({ user_id: user.id, log_date: new Date().toISOString().slice(0, 10) },
               { onConflict: 'user_id,log_date', ignoreDuplicates: true });

    // Return updated streak
    const { data } = await admin
      .from('daily_logs')
      .select('log_date')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(365);

    const dates  = (data || []).map(r => r.log_date);
    const streak = calcStreak(dates);
    return NextResponse.json({ ok: true, streak });
  } catch (e) {
    return NextResponse.json({ ok: false });
  }
}
