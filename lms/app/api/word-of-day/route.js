import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/* GET /api/word-of-day
   Returns ONE deterministic word for today — the same word for every child all day,
   rotating each day. Shared public content, so it is safely cached at the edge. */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('lexicon_words')
      .select('id, word, word_type, topic, sentence')
      .order('id', { ascending: true });

    if (error || !data?.length) {
      return NextResponse.json({ word: null }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
    }

    // Deterministic rotation: index = whole days since epoch, modulo the word count.
    const dayNumber = Math.floor(Date.now() / 86400000);
    const pick      = data[dayNumber % data.length];

    return NextResponse.json(
      { word: pick, date: new Date().toISOString().slice(0, 10) },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch {
    return NextResponse.json({ word: null }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
  }
}
