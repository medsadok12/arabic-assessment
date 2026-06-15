import { NextResponse } from 'next/server';

const FALLBACK_WORDS = [
  { id: 1, word: "قَلَم", missing_letter: "ق", options: ["ق", "ف", "ك"], image_url: null, emoji: "✏️" },
  { id: 2, word: "كِتَاب", missing_letter: "ا", options: ["ا", "و", "ي"], image_url: null, emoji: "📚" },
  { id: 3, word: "تُفَّاحَة", missing_letter: "ت", options: ["ت", "ب", "ث"], image_url: null, emoji: "🍎" },
  { id: 4, word: "بَيت", missing_letter: "ب", options: ["ب", "ت", "ن"], image_url: null, emoji: "🏠" },
  { id: 5, word: "شَجَرَة", missing_letter: "ش", options: ["ش", "س", "ص"], image_url: null, emoji: "🌳" },
  { id: 6, word: "نَجمَة", missing_letter: "ن", options: ["ن", "م", "ل"], image_url: null, emoji: "⭐" },
  { id: 7, word: "سَيَّارَة", missing_letter: "س", options: ["س", "ش", "ص"], image_url: null, emoji: "🚗" },
  { id: 8, word: "طَيَّارَة", missing_letter: "ط", options: ["ط", "ض", "ظ"], image_url: null, emoji: "✈️" },
];

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
      (w) =>
        w.word &&
        w.missing_letter &&
        Array.isArray(w.options) &&
        w.options.filter(Boolean).length > 0
    );

    if (valid.length === 0) {
      return NextResponse.json({ words: FALLBACK_WORDS, source: 'fallback' });
    }

    return NextResponse.json({ words: valid, source: 'database' });
  } catch {
    return NextResponse.json({ words: FALLBACK_WORDS, source: 'fallback' });
  }
}
