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

    // 1. Upsert the word into lexicon_words (unique on `word` column)
    const grade = grade_level ?? user.user_metadata?.grade ?? 1;
    // Upsert returns the row; if word already existed the upsert updates nothing (merge) and still returns it
    let wordId;
    const { data: upserted } = await admin
      .from('lexicon_words')
      .upsert(
        { word, topic, grade_from: grade, grade_to: Math.max(grade, 6) },
        { onConflict: 'word', ignoreDuplicates: true }
      )
      .select('id')
      .maybeSingle();

    if (upserted?.id) {
      wordId = upserted.id;
    } else {
      const { data: existing } = await admin
        .from('lexicon_words')
        .select('id')
        .eq('word', word)
        .maybeSingle();
      if (!existing) return NextResponse.json({ error: 'فشل إيجاد الكلمة' }, { status: 500 });
      wordId = existing.id;
    }

    // 2. Upsert into flashcard_progress at level 0 (don't downgrade if already learned)
    await admin
      .from('flashcard_progress')
      .upsert(
        {
          user_id: user.id,
          word_id: wordId,
          level: 0,
          next_review: new Date().toISOString().slice(0, 10),
          last_reviewed: null,
        },
        { onConflict: 'user_id,word_id', ignoreDuplicates: true } // don't reset if already progressed
      );

    return NextResponse.json({ ok: true, word_id: wordId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
