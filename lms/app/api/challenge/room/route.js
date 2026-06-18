import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';

const WIN_SCORE = 5;

const FALLBACK_VB = [
  { id:'f1', target_text:'بَ',  correct_option:'فتحة',     wrong_option_1:'كسرة',      wrong_option_2:'ضمة'        },
  { id:'f2', target_text:'مِ',  correct_option:'كسرة',     wrong_option_1:'فتحة',      wrong_option_2:'ضمة'        },
  { id:'f3', target_text:'دُ',  correct_option:'ضمة',      wrong_option_1:'فتحة',      wrong_option_2:'كسرة'       },
  { id:'f4', target_text:'بَا', correct_option:'مد بالألف',wrong_option_1:'مد بالواو', wrong_option_2:'حركة قصيرة' },
  { id:'f5', target_text:'بُو', correct_option:'مد بالواو',wrong_option_1:'مد بالألف', wrong_option_2:'مد بالياء'  },
  { id:'f6', target_text:'بِي', correct_option:'مد بالياء',wrong_option_1:'مد بالألف', wrong_option_2:'كسرة'       },
  { id:'f7', target_text:'نَ',  correct_option:'فتحة',     wrong_option_1:'ضمة',       wrong_option_2:'كسرة'       },
  { id:'f8', target_text:'لُ',  correct_option:'ضمة',      wrong_option_1:'فتحة',      wrong_option_2:'سكون'       },
  { id:'f9', target_text:'سِ',  correct_option:'كسرة',     wrong_option_1:'ضمة',       wrong_option_2:'فتحة'       },
  { id:'f10',target_text:'كَ',  correct_option:'فتحة',     wrong_option_1:'كسرة',      wrong_option_2:'سكون'       },
];

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

async function loadQuestions(gameType) {
  const admin = createAdminClient();

  if (gameType === 'vowel-balloon') {
    const { data } = await admin.from('vowel_balloon_games').select('*');
    const valid = (data || []).filter(r => r.target_text && r.correct_option);
    const pool = valid.length >= 6 ? valid : FALLBACK_VB;
    return shuffle(pool).slice(0, 10).map(r => ({
      id: r.id,
      target_text:    r.target_text,
      correct_option: r.correct_option,
      wrong_option_1: r.wrong_option_1 || '',
      wrong_option_2: r.wrong_option_2 || '',
    }));
  }

  // word-smash: first syllable challenge
  const { data } = await admin.from('syllable_games').select('*');
  const valid = (data || []).filter(
    r => r.word_text && r.correct_segments?.length && r.wrong_options?.length >= 2
  );
  if (valid.length < 3) return null;
  return shuffle(valid).slice(0, 10).map(r => ({
    id: r.id,
    target_text:    r.word_text,
    correct_option: r.correct_segments[0],
    wrong_option_1: r.wrong_options[0],
    wrong_option_2: r.wrong_options[1],
  }));
}

// POST — create room
export async function POST(request) {
  try {
    const { game_type = 'vowel-balloon', player1_id, player1_name } = await request.json();
    if (!player1_id?.trim() || !player1_name?.trim())
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

    const questions = await loadQuestions(game_type);
    if (!questions?.length)
      return NextResponse.json({ error: 'لا توجد أسئلة كافية' }, { status: 400 });

    const admin = createAdminClient();

    let room = null;
    for (let i = 0; i < 6; i++) {
      const code = makeCode();
      const { data, error } = await admin
        .from('challenge_rooms')
        .insert({
          room_code:    code,
          game_type,
          player1_id:   player1_id.trim(),
          player1_name: player1_name.trim(),
          questions,
          status: 'waiting',
        })
        .select()
        .single();
      if (!error) { room = data; break; }
    }
    if (!room) return NextResponse.json({ error: 'فشل إنشاء الغرفة' }, { status: 500 });
    return NextResponse.json({ room });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — join room
export async function PATCH(request) {
  try {
    const { room_code, player2_id, player2_name } = await request.json();
    if (!room_code?.trim() || !player2_id?.trim() || !player2_name?.trim())
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('challenge_rooms')
      .select('*')
      .eq('room_code', room_code.trim().toUpperCase())
      .eq('status', 'waiting')
      .single();

    if (!existing)
      return NextResponse.json({ error: 'الغرفة غير موجودة أو بدأت بالفعل' }, { status: 404 });
    if (existing.player1_id === player2_id.trim())
      return NextResponse.json({ error: 'لا يمكنك اللعب مع نفسك!' }, { status: 400 });

    const { data: room, error } = await admin
      .from('challenge_rooms')
      .update({ player2_id: player2_id.trim(), player2_name: player2_name.trim(), status: 'playing' })
      .eq('id', existing.id)
      .eq('status', 'waiting')
      .select()
      .single();

    if (error || !room) return NextResponse.json({ error: 'فشل الانضمام' }, { status: 500 });
    return NextResponse.json({ room });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
