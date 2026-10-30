import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { resolveActiveIdentity } from '../../../../lib/active-child';
import { loadHeroData, heroSummary } from '../../../../lib/hero-progress';

export const dynamic = 'force-dynamic';

/* جائزة تحدّي الأسبوع: تُمنح فقط إن اكتمل تقدّم تحدّي هذا الأسبوع (يُحسب على الخادم من points_log) */
export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const admin = createAdminClient();
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    const { weekly } = heroSummary(await loadHeroData(admin, effectiveUserId));
    if (weekly.claimed) return NextResponse.json({ success: true, reward: weekly.reward, already: true });
    if (weekly.progress < weekly.goal) {
      return NextResponse.json({ error: `بَقِيَ ${weekly.goal - weekly.progress} ⭐ وَتَفُوزُ بِجَائِزَةِ الْأُسْبُوعِ 💪`, weekly }, { status: 400 });
    }
    const { error } = await admin.from('avatar_items')
      .upsert({ user_id: effectiveUserId, item_id: weekly.reward, equipped: false }, { onConflict: 'user_id,item_id', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: 'تعذّر استلام الجائزة، حاول مرة أخرى' }, { status: 500 });
    return NextResponse.json({ success: true, reward: weekly.reward });
  } catch {
    return NextResponse.json({ error: 'تعذّر استلام الجائزة، حاول مرة أخرى' }, { status: 500 });
  }
}
