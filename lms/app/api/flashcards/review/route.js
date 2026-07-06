import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';

// Days until next review by level (0-5)
const INTERVALS = [1, 1, 3, 7, 14, 30];

// POST — record review result and schedule next review
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجّل' }, { status: 401 });

    const body = await request.json();
    const { word_id } = body;
    if (!word_id) return NextResponse.json({ error: 'word_id مطلوب' }, { status: 400 });

    // Accept 'difficulty' ('easy'|'hard'|'forgot') or legacy 'remembered' bool
    let difficulty = body.difficulty;
    if (!difficulty) {
      difficulty = body.remembered ? 'easy' : 'forgot';
    }

    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await admin
      .from('flashcard_progress')
      .select('level')
      .eq('user_id', user.id)
      .eq('word_id', word_id)
      .maybeSingle();

    const currentLevel = existing?.level ?? 0;
    let newLevel, intervalDays;

    if (difficulty === 'easy') {
      newLevel     = Math.min(currentLevel + 1, 5);
      intervalDays = INTERVALS[newLevel];
    } else if (difficulty === 'hard') {
      newLevel     = currentLevel; // stay at same level
      intervalDays = 1;
    } else { // forgot
      newLevel     = Math.max(currentLevel - 1, 0);
      intervalDays = 1;
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + intervalDays);
    const nextReview = nextDate.toISOString().slice(0, 10);

    await admin
      .from('flashcard_progress')
      .upsert({
        user_id:       user.id,
        word_id,
        level:         newLevel,
        next_review:   nextReview,
        last_reviewed: today,
      }, { onConflict: 'user_id,word_id' });

    return NextResponse.json({ ok: true, new_level: newLevel, next_review: nextReview, interval_days: intervalDays });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
