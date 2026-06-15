import { NextResponse } from 'next/server';

const FALLBACK_WORDS = [
  { id:  1, word:"قَلَم",      missing_letter:"ق", options:["ق","ف","ك","ح","ع"], image_url: null, emoji:"✏️" },
  { id:  2, word:"كِتَاب",     missing_letter:"ا", options:["ا","و","ي","ه","ء"], image_url: null, emoji:"📚" },
  { id:  3, word:"تُفَّاحَة",  missing_letter:"ت", options:["ت","ب","ث","ن","ي"], image_url: null, emoji:"🍎" },
  { id:  4, word:"بَيت",       missing_letter:"ب", options:["ب","ت","ن","م","ه"], image_url: null, emoji:"🏠" },
  { id:  5, word:"شَجَرَة",    missing_letter:"ش", options:["ش","س","ص","ض","ز"], image_url: null, emoji:"🌳" },
  { id:  6, word:"نَجمَة",     missing_letter:"ن", options:["ن","م","ل","ب","ر"], image_url: null, emoji:"⭐" },
  { id:  7, word:"سَيَّارَة",  missing_letter:"س", options:["س","ش","ص","ز","ط"], image_url: null, emoji:"🚗" },
  { id:  8, word:"طَيَّارَة",  missing_letter:"ط", options:["ط","ض","ظ","ت","ذ"], image_url: null, emoji:"✈️" },
  { id:  9, word:"مَدرَسَة",   missing_letter:"م", options:["م","ن","ب","ه","و"], image_url: null, emoji:"🏫" },
  { id: 10, word:"بَحر",       missing_letter:"ب", options:["ب","ت","ن","ف","ه"], image_url: null, emoji:"🌊" },
  { id: 11, word:"سَمَكَة",    missing_letter:"س", options:["س","ص","ش","ز","ث"], image_url: null, emoji:"🐟" },
  { id: 12, word:"دَجَاجَة",   missing_letter:"د", options:["د","ذ","ر","ز","و"], image_url: null, emoji:"🐔" },
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
      w => w.word && w.missing_letter && Array.isArray(w.options) && w.options.filter(Boolean).length > 0
    );
    if (valid.length === 0) {
      return NextResponse.json({ words: FALLBACK_WORDS, source: 'fallback' });
    }
    return NextResponse.json({ words: valid, source: 'database' });
  } catch {
    return NextResponse.json({ words: FALLBACK_WORDS, source: 'fallback' });
  }
}
