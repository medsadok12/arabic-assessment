import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

/* GET /api/game-results?game=letter_catcher
   Returns the latest result per category for the current user */
export async function GET(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ results: [] });

    const gameId = new URL(req.url).searchParams.get('game');
    if (!gameId) return NextResponse.json({ results: [] });

    const admin = createAdminClient();
    const { data } = await admin
      .from('game_results')
      .select('category, correct, wrong, total, played_at')
      .eq('user_id', user.id)
      .eq('game_id', gameId)
      .order('played_at', { ascending: false });

    // Keep only the most recent result per category
    const seen    = new Set();
    const results = (data ?? []).filter(r => {
      if (seen.has(r.category)) return false;
      seen.add(r.category);
      return true;
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}

/* POST /api/game-results
   Body: { game_id, category, correct, wrong, total } */
export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { game_id, category, correct, wrong, total } = await req.json();
    if (!game_id || !category || total == null) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const admin = createAdminClient();
    await admin.from('game_results').insert({
      user_id: user.id,
      game_id,
      category,
      correct: correct ?? 0,
      wrong:   wrong   ?? 0,
      total:   total   ?? 0,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
