import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { word_text, topic = 'عام', grade_level } = await req.json();
    if (!word_text?.trim()) return NextResponse.json({ error: 'كلمة فارغة' }, { status: 400 });

    const word = word_text.trim();
    const admin = createAdminClient();
    const grade = grade_level ?? user.user_metadata?.grade ?? 1;

    // 1. Find or create the word in lexicon_words
    let wordId;
    const { data: existing } = await admin
      .from('lexicon_words')
      .select('id')
      .eq('word', word)
      .maybeSingle();

    if (existing?.id) {
      wordId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await admin
        .from('lexicon_words')
        .insert({ word, word_type: 'اسم', topic, grade_from: grade, grade_to: Math.max(grade, 6) })
        .select('id')
        .single();

      if (insertErr) {
        // Race condition: another request inserted it first — retry the select
        const { data: retry } = await admin.from('lexicon_words').select('id').eq('word', word).maybeSingle();
        if (!retry) return NextResponse.json({ error: insertErr.message }, { status: 500 });
        wordId = retry.id;
      } else {
        wordId = inserted.id;
      }
    }

    // 2. Add to student's flashcard queue (only if not already tracked at level > 0)
    const { data: progress } = await admin
      .from('flashcard_progress')
      .select('id, level')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .maybeSingle();

    if (!progress) {
      // New word for this student — add at level 0, due today
      await admin.from('flashcard_progress').insert({
        user_id: user.id,
        word_id: wordId,
        level: 0,
        next_review: new Date().toISOString().slice(0, 10),
      });
    } else if (progress.level > 0) {
      // Student thought they knew it but got it wrong — demote one level
      const newLevel = Math.max(0, progress.level - 1);
      await admin.from('flashcard_progress').update({
        level: newLevel,
        next_review: new Date().toISOString().slice(0, 10),
      }).eq('id', progress.id);
    }
    // level === 0 already: no change needed

    return NextResponse.json({ ok: true, word_id: wordId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
