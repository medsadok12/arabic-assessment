import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient } from '../../../lib/supabase-server';
import { resolveActiveIdentity } from '../../../lib/active-child';

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
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    const { data, error } = await admin
      .from('game_results')
      .select('category, correct, wrong, total, played_at')
      .eq('user_id', effectiveUserId)
      .eq('game_id', gameId)
      .order('played_at', { ascending: false });
    if(error)throw error;

    // Keep only the most recent result per category
    const seen    = new Set();
    const results = (data ?? []).filter(r => {
      if (seen.has(r.category)) return false;
      seen.add(r.category);
      return true;
    });

    return NextResponse.json({ results },{headers:{'Cache-Control':'private, no-store'}});
  } catch {
    return NextResponse.json({ results: [], error:'تعذّر عرض التقرير الآن.' },{status:503,headers:{'Cache-Control':'private, no-store'}});
  }
}

/* حفظ الدرجات العامة من المتصفح أُلغي بعد انتقال جميع الألعاب لمسارات التصحيح.
   القراءة التاريخية أعلاه باقية؛ الدرجة الجديدة تُكتب من الخادم فقط. */
export async function POST() {
  const {data:{user}}=await createClient().auth.getUser();
  return NextResponse.json({error:user?'تُحفظ النتائج من مسار التدريب بعد تصحيح الإجابات.':'سجّل الدخول أولًا.'},{status:user?409:401});
}
