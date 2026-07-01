import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';

// GET — list words (public read; no sensitive data in the list)
export async function GET() {
  const admin = createAdminClient();

  // Try with media-flag columns; graceful fallback for old schema
  let { data, error } = await admin
    .from('lexicon_words')
    .select('id, word, word_type, sentence, topic, grade_from, grade_to, syllables, root, has_image, has_audio')
    .order('word');

  if (error?.message?.includes('has_image') || error?.message?.includes('has_audio') ||
      error?.message?.includes('Could not find')) {
    ({ data, error } = await admin
      .from('lexicon_words')
      .select('id, word, word_type, sentence, topic, grade_from, grade_to, syllables, root')
      .order('word'));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ words: data ?? [] });
}
