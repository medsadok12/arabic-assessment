import { NextResponse } from 'next/server';

const FALLBACK_WORDS = [
  { id: 1, word: "قَلَم",     missing_letter: "ق", options: ["ق", "ف", "ك", "ح", "ع"], image_url: null, emoji: "✏️" },
  { id: 2, word: "كِتَاب",    missing_letter: "ا", options: ["ا", "و", "ي", "ه", "ء"], image_url: null, emoji: "📚" },
  { id: 3, word: "تُفَّاحَة", missing_letter: "ت", options: ["ت", "ب", "ث", "ن", "ي"], image_url: null, emoji: "🍎" },
  { id: 4, word: "بَيت",      missing_letter: "ب", options: ["ب", "ت", "ن", "م", "ه"], image_url: null, emoji: "🏠" },
  { id: 5, word: "شَجَرَة",   missing_letter: "ش", options: ["ش", "س", "ص", "ض", "ز"], image_url: null, emoji: "🌳" },
  { id: 6, word: "نَجمَة",    missing_letter: "ن", options: ["ن", "م", "ل", "ب", "ر"], image_url: null, emoji: "⭐" },
  { id: 7, word: "سَيَّارَة", missing_letter: "س", options: ["س", "ش", "ص", "ز", "ط"], image_url: null, emoji: "🚗" },
  { id: 8, word: "طَيَّارَة", missing_letter: "ط", options: ["ط", "ض", "ظ", "ت", "ذ"], image_url: null, emoji: "✈️" },
];

const ARABIC_LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';

function buildOptions(correctLetter, total = 5) {
  const stripped = (correctLetter || '').replace(/[ً-ْٰ]/g, '');
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

export async function GET() {
  try {
    const { createClient } = await import('../../../../lib/supabase-server');
    const supabase = createClient();

    const { data, error } = await supabase
      .from('letter_catcher_words')
      .select('*')
      .order('id');

    if (error || !data || data.length === 0) {
      return NextResponse.json({ words: FALLBACK_WORDS, source: 'fallback' });
    }

    const valid = data.filter(
      (w) => w.word && w.missing_letter && Array.isArray(w.options) && w.options.filter(Boolean).length > 0
    );

    if (valid.length === 0) {
      return NextResponse.json({ words: FALLBACK_WORDS, source: 'fallback' });
    }

    return NextResponse.json({ words: valid, source: 'database' });
  } catch {
    return NextResponse.json({ words: FALLBACK_WORDS, source: 'fallback' });
  }
}

export async function POST(request) {
  try {
    const { createClient } = await import('../../../../lib/supabase-server');
    const supabase = createClient();

    const { word, missing_letter, emoji } = await request.json();

    if (!word?.trim() || !missing_letter?.trim()) {
      return NextResponse.json({ error: 'الكلمة والحرف الناقص مطلوبان' }, { status: 400 });
    }

    const options = buildOptions(missing_letter.trim());

    const { data, error } = await supabase
      .from('letter_catcher_words')
      .insert({
        word: word.trim(),
        missing_letter: missing_letter.trim(),
        options,
        emoji: emoji?.trim() || null,
        image_url: null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ word: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحفظ' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف الكلمة مطلوب' }, { status: 400 });
    }

    const { createClient } = await import('../../../../lib/supabase-server');
    const supabase = createClient();

    const { error } = await supabase
      .from('letter_catcher_words')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل الحذف' }, { status: 500 });
  }
}
