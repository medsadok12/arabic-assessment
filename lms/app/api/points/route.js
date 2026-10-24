import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient } from '../../../lib/supabase-server';
import { resolveActiveIdentity } from '../../../lib/active-child';
import { WW_GAME_ID, normalizeWwSettings } from '../../../lib/word-wheel';
import { awardPoints } from '../../../lib/points-server';

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
  word_wheel:          10,  // لكل كلمة — القيمة الفعلية من إعدادات اللعبة (gameConfiguredAmount)
  word_wheel_win:      10,  // إنهاء عجلة — القيمة الفعلية من إعدادات اللعبة

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
  daily_word:          3,   // e.g. "daily_word:2026-07-05" — once per day per child
};

// These event types are deduplicated by full reason string
const DEDUP_PREFIXES = new Set([
  'huroof_letter', 'huroof_all_complete',
  'fc',
  'challenge_win', 'challenge_draw', 'challenge_loss',
  'daily_login', 'story', 'session_attend', 'homework_done', 'daily_word',
]);

async function wordWheelAmount(admin, prefix, fallback) {
  try {
    const { data } = await admin.from('game_settings').select('settings').eq('game_id', WW_GAME_ID).maybeSingle();
    const s = normalizeWwSettings(data?.settings);
    return prefix === 'word_wheel' ? s.points_per_word : s.win_points;
  } catch {
    return fallback;
  }
}

export async function GET(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ points: 0, earned: 0 });
    const admin = createAdminClient();
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    const [{ data: balRow }, { data: logRows }] = await Promise.all([
      admin.from('user_points').select('total').eq('user_id', effectiveUserId).maybeSingle(),
      admin.from('points_log').select('delta').eq('user_id', effectiveUserId).gt('delta', 0),
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
    let amount = POINT_EVENTS[prefix] ?? POINT_EVENTS[reason];
    if (!amount) {
      return NextResponse.json({ error: 'حدث غير معروف' }, { status: 400 });
    }

    const admin = createAdminClient();
    // نقاط «عجلة الكلمات» يحدّدها المعلم/المدير من لوحة اللعبة — والخادم وحده يقرؤها
    if (prefix === 'word_wheel' || prefix === 'word_wheel_win') {
      amount = await wordWheelAmount(admin, prefix, amount);
      if (!amount) return NextResponse.json({ skipped: true, disabled: true });
    }
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);

    const result = await awardPoints(admin, effectiveUserId, reason, amount, { dedup: DEDUP_PREFIXES.has(prefix) });
    if (result.skipped) return NextResponse.json({ skipped: true, points: result.points });
    if (result.conflict)
      return NextResponse.json({ error: 'تعارض في العملية، يرجى المحاولة مجدداً' }, { status: 409 });
    return NextResponse.json({ success: true, points: result.points });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
