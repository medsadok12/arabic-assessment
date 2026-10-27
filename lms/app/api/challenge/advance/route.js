import { resolveActiveIdentity } from '../../../../lib/active-child';
import { isSuspended } from '../../../../lib/auth-role';
import { challengeMember, challengeOption } from '../../../../lib/challenge-verified';
import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient as createServerClient } from '../../../../lib/supabase-server';

const WIN_SCORE = 5;

// POST — advance to next question (atomic, both clients call this after a round ends)
export async function POST(request) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || isSuspended(user)) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { room_id, from_q_index } = await request.json();
    if (!room_id || from_q_index === undefined)
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

    const admin = createAdminClient();

    const { data: room } = await admin
      .from('challenge_rooms')
      .select('*')
      .eq('id', room_id)
      .single();

    if (!room) return NextResponse.json({ advanced: false });
    const {effectiveUserId}=await resolveActiveIdentity(user,admin,request);
    if(!challengeMember(room,effectiveUserId))return NextResponse.json({error:'أنت لست مشاركًا في هذا التحدي.'},{status:403});
    if(!Number.isInteger(from_q_index)||from_q_index!==room.cur_q_index||room.status!=='playing'||!challengeMember(room,room.round_winner))return NextResponse.json({advanced:false});

    const questions = room.questions || [];
    const nextIndex = from_q_index + 1;
    const isFinished =
      nextIndex >= questions.length ||
      (room.player1_score || 0) >= WIN_SCORE ||
      (room.player2_score || 0) >= WIN_SCORE;

    // Atomic: only one of the two clients will succeed (WHERE cur_q_index = from_q_index)
    const { data, error } = await admin
      .from('challenge_rooms')
      .update({
        cur_q_index:  isFinished ? from_q_index : nextIndex,
        round_winner: null,
        status:       isFinished ? 'finished' : 'playing',
      })
      .eq('id', room_id)
      .eq('cur_q_index', from_q_index)
      .eq('status','playing').eq('round_winner',room.round_winner)
      .select()
      .single();

    if (error || !data) return NextResponse.json({ advanced: false });
    return NextResponse.json({ advanced: true, finished: isFinished });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
