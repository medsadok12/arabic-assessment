import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';

// Node runtime عمداً (لا edge): دوال edge تنفَّذ في أقرب نقطة جغرافية للزائر،
// ورُصد فعلياً أن بعض هذه النقاط أعادت قراءات قديمة من قاعدة البيانات بينما
// مسار Node (منطقة واحدة ثابتة) بقي طازجاً طوال الوقت. لا تعيدوه edge.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

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
      return NextResponse.json({ word: null }, { headers: NO_CACHE });
    }

    // Deterministic rotation: index = whole days since epoch, modulo the word count.
    const dayNumber = Math.floor(Date.now() / 86400000);
    const pick      = data[dayNumber % data.length];

    return NextResponse.json(
      // count يُكشف عمداً: يسمح بتشخيص فوري لأي قراءة قديمة (عدد الكلمات لا يطابق الإدارة)
      { word: pick, date: new Date().toISOString().slice(0, 10), count: data.length },
      { headers: NO_CACHE }
    );
  } catch {
    return NextResponse.json({ word: null }, { headers: NO_CACHE });
  }
}
