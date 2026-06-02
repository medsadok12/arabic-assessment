import { NextResponse } from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

function allowed(user) {
  const r = user?.user_metadata?.role;
  return r === 'admin' || r === 'super_admin';
}

// GET — list all words without heavy media columns
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !allowed(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();

  // Try with media-flag columns (new schema)
  let { data, error } = await admin
    .from('lexicon_words')
    .select('id, word, word_type, sentence, topic, grade_from, grade_to, syllables, root, has_image, has_audio, created_at')
    .order('created_at', { ascending: false });

  // Fallback for old schema without has_image / has_audio columns
  if (error?.message?.includes('has_image') || error?.message?.includes('has_audio') ||
      error?.message?.includes('Could not find')) {
    ({ data, error } = await admin
      .from('lexicon_words')
      .select('id, word, word_type, sentence, topic, grade_from, grade_to, syllables, root, created_at')
      .order('created_at', { ascending: false }));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ words: data ?? [] });
}

// POST — create word with optional image + audio
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !allowed(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  const { word, word_type, sentence, topic, grade_from, grade_to, syllables, root, image_data, audio_data } = body;
  if (!word?.trim()) return NextResponse.json({ error: 'الكلمة مطلوبة' }, { status: 400 });

  const admin = createAdminClient();
  const now   = new Date().toISOString();

  const base = {
    word: word.trim(), word_type, sentence: sentence?.trim() || null, topic,
    grade_from: +grade_from, grade_to: +grade_to,
    syllables: syllables?.trim() || null, root: root?.trim() || null,
    created_at: now, updated_at: now,
  };

  // Try inserting with media columns
  let mediaSkipped = false;
  let full = { ...base };
  if (image_data) { full.image_base64 = image_data; full.has_image = true; }
  if (audio_data) { full.audio_base64 = audio_data; full.has_audio = true; }

  let { data, error } = await admin.from('lexicon_words').insert(full).select('id').single();

  // If media columns don't exist yet → retry without them
  if (error?.message?.includes('image_base64') || error?.message?.includes('audio_base64') ||
      error?.message?.includes('has_image')    || error?.message?.includes('has_audio') ||
      error?.message?.includes('Could not find')) {
    mediaSkipped = true;
    ({ data, error } = await admin.from('lexicon_words').insert(base).select('id').single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data?.id, media_skipped: mediaSkipped }, { status: 201 });
}
