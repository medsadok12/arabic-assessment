import { NextResponse } from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

// GET — list words for students (admin client bypasses RLS; no heavy media in list)
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });

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
