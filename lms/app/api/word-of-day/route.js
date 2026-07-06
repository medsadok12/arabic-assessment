import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/* GET /api/word-of-day
   Returns ONE deterministic word for today — the same word for every child all day,
   rotating each day. Read live on every request (no-store) so any word added or
   removed from the admin lexicon is reflected immediately, never a stale copy. */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('lexicon_words')
      .select('id, word, word_type, topic, sentence, syllables, has_image')
      .order('id', { ascending: true });

    if (error || !data?.length) {
      return NextResponse.json({ word: null }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } });
    }

    // Deterministic rotation: index = whole days since epoch, modulo the word count.
    const dayNumber = Math.floor(Date.now() / 86400000);
    const pick      = data[dayNumber % data.length];

    return NextResponse.json(
      { word: pick, date: new Date().toISOString().slice(0, 10) },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch {
    return NextResponse.json({ word: null }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } });
  }
}
