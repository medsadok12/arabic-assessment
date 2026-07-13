import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient as createServerClient } from '../../../../lib/supabase-server';

// POST — atomic round win claim
export async function POST(request) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { room_id, q_index, picked_option } = await request.json();
    const player_id = user.id;
    if (!room_id || q_index === undefined || !picked_option)
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

    const admin = createAdminClient();

    // Fetch room to validate answer and determine player role
    const { data: room } = await admin
      .from('challenge_rooms')
      .select('*')
      .eq('id', room_id)
      .single();

    if (!room) return NextResponse.json({ won: false, reason: 'no_room' });
    if (room.status !== 'playing') return NextResponse.json({ won: false, reason: 'not_playing' });

    const q = room.questions?.[q_index];
    if (!q) return NextResponse.json({ won: false, reason: 'no_question' });

    // Server-side answer validation
    if (q.correct_option !== picked_option)
      return NextResponse.json({ won: false, reason: 'wrong' });

    const isP1 = room.player1_id === player_id;
    const scoreField = isP1 ? 'player1_score' : 'player2_score';
    const newScore = isP1 ? (room.player1_score || 0) + 1 : (room.player2_score || 0) + 1;

    // Atomic: claim round only if no winner yet and still on same question
    const { data: updated, error } = await admin
      .from('challenge_rooms')
      .update({ round_winner: player_id, [scoreField]: newScore })
      .eq('id', room_id)
      .eq('cur_q_index', q_index)
      .is('round_winner', null)
      .select()
      .single();

    if (error || !updated) return NextResponse.json({ won: false, reason: 'too_slow' });
    return NextResponse.json({ won: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
