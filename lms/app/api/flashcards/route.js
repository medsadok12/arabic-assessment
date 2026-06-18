import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient }      from '../../../lib/supabase-server';

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// GET — returns today's flashcard session for current user
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ cards: [], error: 'غير مسجّل' }, { status: 401 });

    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    // 1. Due cards (next_review <= today, not yet mastered)
    const { data: progress } = await admin
      .from('flashcard_progress')
      .select('word_id, level, next_review')
      .eq('user_id', user.id)
      .lte('next_review', today)
      .lt('level', 5)
      .order('next_review')
      .limit(15);

    const dueIds = (progress || []).map(p => p.word_id);

    let dueWords = [];
    if (dueIds.length > 0) {
      const { data } = await admin
        .from('lexicon_words')
        .select('id, word, word_type, sentence, topic, grade_from')
        .in('id', dueIds);
      dueWords = (data || []).map(w => ({
        ...w,
        level:  (progress || []).find(p => p.word_id === w.id)?.level ?? 0,
        is_new: false,
      }));
    }

    // 2. New words not yet in progress
    const { data: allProgress } = await admin
      .from('flashcard_progress')
      .select('word_id')
      .eq('user_id', user.id);

    const knownIds = (allProgress || []).map(p => p.word_id);
    let newWordsQuery = admin
      .from('lexicon_words')
      .select('id, word, word_type, sentence, topic, grade_from')
      .order('created_at');
    if (knownIds.length > 0)
      newWordsQuery = newWordsQuery.not('id', 'in', `(${knownIds.join(',')})`);

    const { data: newWords } = await newWordsQuery.limit(5);
    const newCards = (newWords || []).map(w => ({ ...w, level: 0, is_new: true }));

    const cards = shuffle([...dueWords, ...newCards]);
    return NextResponse.json({ cards, today });
  } catch (e) {
    return NextResponse.json({ cards: [], error: e.message }, { status: 500 });
  }
}
