import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';

const ARABIC_LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
const PICKABLE       = 'ابتةثجحخدذرزسشصضطظعغفقكلمنهويءأإئؤ';
const DIACRITICS     = /[ً-ْٰ]/g;
const AVOID_LETTERS  = new Set(['ا','و','ي','ى']);

function buildOptions(correctLetter, total = 5) {
  const stripped = (correctLetter || '').replace(DIACRITICS, '');
  const pool = ARABIC_LETTERS.split('').filter(l => l !== stripped);
  const opts = [stripped];
  while (opts.length < total && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    opts.push(...pool.splice(i, 1));
  }
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

function pickMissingLetter(word) {
  const stripped = (word || '').replace(DIACRITICS, '');
  let candidates = [];
  for (let i = 0; i < stripped.length; i++) {
    if (!AVOID_LETTERS.has(stripped[i]) && PICKABLE.includes(stripped[i])) candidates.push(i);
  }
  if (!candidates.length) {
    for (let i = 0; i < stripped.length; i++) {
      if (PICKABLE.includes(stripped[i])) candidates.push(i);
    }
  }
  if (!candidates.length) return null;
  return stripped[candidates[Math.floor(Math.random() * candidates.length)]];
}

// GET — public read; admin client bypasses RLS
export async function GET() {
  const admin = createAdminClient();

  // 1. Try dedicated letter_catcher_words table first
  const { data: gameData } = await admin
    .from('letter_catcher_words')
    .select('*')
    .order('id');

  if (gameData && gameData.length > 0) {
    const valid = gameData.filter(
      w => w.word && w.missing_letter && Array.isArray(w.options) && w.options.filter(Boolean).length > 0
    );
    if (valid.length > 0) {
      return NextResponse.json({ words: valid, source: 'game' });
    }
  }

  // 2. Fall back to lexicon_words (existing word bank)
  let { data: lexData, error } = await admin
    .from('lexicon_words')
    .select('id, word, word_type, topic, grade_from, grade_to, has_image')
    .order('word');

  if (error?.message?.includes('has_image')) {
    ({ data: lexData, error } = await admin
      .from('lexicon_words')
      .select('id, word, word_type, topic, grade_from, grade_to')
      .order('word'));
  }

  if (error || !lexData || lexData.length === 0) {
    return NextResponse.json({ words: [], source: 'empty' });
  }

  // Transform lexicon_words → game format (compute missing_letter + options dynamically)
  const transformed = lexData.map(w => {
    const missing_letter = pickMissingLetter(w.word);
    if (!missing_letter) return null;
    return {
      id: w.id,
      word: w.word,
      missing_letter,
      options: buildOptions(missing_letter),
      image_url: null,
      audio_url: null,
      emoji: null,
      topic: w.topic || null,
      grade_level: w.grade_from || null,
    };
  }).filter(Boolean);

  return NextResponse.json({ words: transformed, source: 'lexicon' });
}

// POST — add word (admin/teacher only)
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role ?? '';
    if (!user || !['super_admin', 'admin', 'teacher'].includes(role)) {
      return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    }

    const { word, missing_letter, emoji, image_url, audio_url, topic, grade_level } = await request.json();

    if (!word?.trim() || !missing_letter?.trim()) {
      return NextResponse.json({ error: 'الكلمة والحرف الناقص مطلوبان' }, { status: 400 });
    }

    const options = buildOptions(missing_letter.trim());
    const admin   = createAdminClient();

    const { data, error } = await admin
      .from('letter_catcher_words')
      .insert({
        word: word.trim(),
        missing_letter: missing_letter.trim(),
        options,
        emoji:       emoji?.trim()       || null,
        image_url:   image_url           || null,
        audio_url:   audio_url           || null,
        topic:       topic?.trim()       || null,
        grade_level: grade_level ? Number(grade_level) : null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ word: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحفظ' }, { status: 500 });
  }
}

// DELETE — admin/teacher only
export async function DELETE(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role ?? '';
    if (!user || !['super_admin', 'admin', 'teacher'].includes(role)) {
      return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'معرف الكلمة مطلوب' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from('letter_catcher_words').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحذف' }, { status: 500 });
  }
}
