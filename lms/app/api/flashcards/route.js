import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient }      from '../../../lib/supabase-server';

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// GET — returns today's flashcard session filtered by student's grade
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ cards: [], error: 'غير مسجّل' }, { status: 401 });

    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    // Student's grade from auth metadata
    const grade = user.user_metadata?.grade ? Number(user.user_metadata.grade) : null;

    // ── 1. Due cards (next_review <= today, not yet mastered) ──────────────
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
      let q = admin
        .from('lexicon_words')
        .select('id, word, word_type, sentence, topic, grade_from, grade_to')
        .in('id', dueIds);

      // Filter due words to student's grade too (guards against grade changes)
      if (grade) {
        q = q.lte('grade_from', grade).gte('grade_to', grade);
      }

      const { data } = await q;
      dueWords = (data || []).map(w => ({
        ...w,
        level:  (progress || []).find(p => p.word_id === w.id)?.level ?? 0,
        is_new: false,
      }));
    }

    // ── 2. New words not yet in progress, filtered by student's grade ──────
    const { data: allProgress } = await admin
      .from('flashcard_progress')
      .select('word_id, level')
      .eq('user_id', user.id);

    const knownIds   = (allProgress || []).map(p => p.word_id);
    const mastered   = (allProgress || []).filter(p => p.level >= 5).length;
    const inProgress = (allProgress || []).filter(p => p.level >= 1 && p.level < 5).length;
    const stats      = { mastered, in_progress: inProgress, total: (allProgress || []).length };

    let newWordsQuery = admin
      .from('lexicon_words')
      .select('id, word, word_type, sentence, topic, grade_from, grade_to')
      .order('created_at');

    // Filter by grade
    if (grade) {
      newWordsQuery = newWordsQuery
        .lte('grade_from', grade)
        .gte('grade_to', grade);
    }

    // Exclude already-known words
    if (knownIds.length > 0) {
      newWordsQuery = newWordsQuery.not('id', 'in', `(${knownIds.join(',')})`);
    }

    const { data: newWords } = await newWordsQuery.limit(5);

    const newCards = (newWords || []).map(w => ({ ...w, level: 0, is_new: true }));

    const cards = shuffle([...dueWords, ...newCards]);
    return NextResponse.json({ cards, today, grade, stats });
  } catch (e) {
    return NextResponse.json({ cards: [], error: e.message }, { status: 500 });
  }
}
