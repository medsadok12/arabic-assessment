import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

// Server-side point registry — client never controls the amount
// Key = reason prefix (part before first ':'), value = points awarded
const POINT_EVENTS = {
  // Game events — per correct action, no dedup (repeating is part of gameplay)
  letter_catcher:      5,
  vowel_balloon:       5,
  word_image_match:    5,
  word_scramble:       5,
  word_smash:          5,
  word_wheel:          10,  // capped; was variable from client

  // Unique events — reason must be "prefix:uniqueId", dedup prevents replays
  huroof_letter:       2,   // e.g. "huroof_letter:ب"
  huroof_all_complete: 10,  // e.g. "huroof_all_complete:userId" or plain
  fc:                  3,   // e.g. "fc:cardId"
  challenge_win:       15,  // e.g. "challenge_win:roomId"
  challenge_draw:      10,  // e.g. "challenge_draw:roomId"
  challenge_loss:      5,   // e.g. "challenge_loss:roomId"

  // System events triggered server-side or with unique IDs
  daily_login:         5,
  story:               10,
  session_attend:      5,
  homework_done:       5,
};

// These event types are deduplicated by full reason string
const DEDUP_PREFIXES = new Set([
  'huroof_letter', 'huroof_all_complete',
  'fc',
  'challenge_win', 'challenge_draw', 'challenge_loss',
  'daily_login', 'story', 'session_attend', 'homework_done',
]);

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ points: 0, earned: 0 });
    const admin = createAdminClient();
    const [{ data: balRow }, { data: logRows }] = await Promise.all([
      admin.from('user_points').select('total').eq('user_id', user.id).maybeSingle(),
      admin.from('points_log').select('delta').eq('user_id', user.id).gt('delta', 0),
    ]);
    const points = balRow?.total ?? 0;
    const earned = (logRows ?? []).reduce((s, r) => s + (r.delta || 0), 0);
    return NextResponse.json({ points, earned });
  } catch {
    return NextResponse.json({ points: 0, earned: 0 });
  }
}

export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const body = await req.json();
    const reason = body?.reason?.trim();
    if (!reason) return NextResponse.json({ error: 'reason مطلوب' }, { status: 400 });

    // Resolve server-side amount from reason prefix
    const prefix = reason.split(':')[0];
    const amount = POINT_EVENTS[prefix] ?? POINT_EVENTS[reason];
    if (!amount) {
      return NextResponse.json({ error: 'حدث غير معروف' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Dedup check for unique events
    if (DEDUP_PREFIXES.has(prefix)) {
      const { data: dup } = await admin
        .from('points_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('reason', reason)
        .maybeSingle();
      if (dup) {
        const { data: balRow } = await admin
          .from('user_points').select('total').eq('user_id', user.id).maybeSingle();
        return NextResponse.json({ skipped: true, points: balRow?.total ?? 0 });
      }
    }

    const { data: current } = await admin
      .from('user_points').select('total').eq('user_id', user.id).maybeSingle();
    const prevTotal = current?.total ?? 0;
    const newTotal  = prevTotal + amount;

    if (current) {
      // Optimistic lock — UPDATE only if total hasn't changed since we read it
      const { data: updated } = await admin
        .from('user_points')
        .update({ total: newTotal, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('total', prevTotal)
        .select('total')
        .maybeSingle();
      if (!updated)
        return NextResponse.json({ error: 'تعارض في العملية، يرجى المحاولة مجدداً' }, { status: 409 });
    } else {
      await admin.from('user_points').insert(
        { user_id: user.id, total: newTotal, updated_at: new Date().toISOString() }
      );
    }

    await admin.from('points_log').insert({ user_id: user.id, delta: amount, reason });

    return NextResponse.json({ success: true, points: newTotal });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
