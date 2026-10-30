import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { resolveActiveIdentity } from '../../../lib/active-child';
import { normalizeLook, unpaidItems, isValidPreview } from '../../../lib/hero-catalog';
import { loadHeroData, heroSummary, isAchievement } from '../../../lib/hero-progress';

export const dynamic = 'force-dynamic';

const EMPTY = { look: null, preview_url: null, equipped: {}, owned: [], points: 0 };

/* بطل الطالب + تقدّمه الحقيقي (المستوى، الحروف المتقنة، الألقاب، تحدّي الأسبوع، البيضة، المواسم) */
export async function GET(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(EMPTY);

    const admin = createAdminClient();
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    const data = await loadHeroData(admin, effectiveUserId);
    const { cfg } = data;

    return NextResponse.json({
      // بطل الاستوديو ثلاثي الأبعاد — null حتى يحفظ الطالب بطله أول مرة
      look:        cfg?.look ? normalizeLook(cfg.look) : null,
      preview_url: cfg?.look ? cfg?.preview_url ?? null : null,
      base_seed:   cfg?.base_seed ?? effectiveUserId,
      // زينة الأفاتار ثنائي الأبعاد القديم (AvatarWithAccessory) — للقراءة فقط
      equipped: {
        hat:        cfg?.equipped_hat        ?? null,
        glasses:    cfg?.equipped_glasses    ?? null,
        scarf:      cfg?.equipped_scarf      ?? null,
        halo:       cfg?.equipped_halo       ?? null,
        companion:  cfg?.equipped_companion  ?? null,
        background: cfg?.equipped_background ?? null,
      },
      points: data.points,
      ...heroSummary(data),
    });
  } catch {
    return NextResponse.json(EMPTY);
  }
}

/* حفظ البطل: { look, preview_url?, title? } — لا يُحفظ بطل يلبس قطعة لا يملكها، ولا لقب لم يكسبه */
export async function PATCH(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.look || typeof body.look !== 'object') {
      return NextResponse.json({ error: 'بيانات البطل ناقصة' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    const look = normalizeLook(body.look);

    const data = await loadHeroData(admin, effectiveUserId);
    const summary = heroSummary(data);
    const unpaid = unpaidItems(look, summary.owned);
    if (unpaid.length) {
      return NextResponse.json({ error: 'اشترِ القطع الجديدة أولاً ثم احفظ بطلك 🛒', unpaid: unpaid.map(x => x.key) }, { status: 400 });
    }

    const row = {
      user_id: effectiveUserId,
      look,
      avatar_id: 'studio3d',
      avatar_url: null,
      updated_at: new Date().toISOString(),
    };
    if (isValidPreview(body.preview_url)) row.preview_url = body.preview_url;
    if ('title' in body) {
      if (body.title !== null && !(isAchievement(body.title) && summary.achievements.includes(body.title))) {
        return NextResponse.json({ error: 'هذا اللقب لم تكسبه بعد — أكمل التحدي لتحصل عليه 🏅' }, { status: 400 });
      }
      row.title = body.title;
    }
    // وضع البيضة في العش يبدأ عدّ نجوم التعلّم من الآن
    if (look.pet === 'egg' && !data.cfg?.egg_started_at && !summary.egg.hatched) row.egg_started_at = new Date().toISOString();

    const { error } = await admin.from('hero_config').upsert(row, { onConflict: 'user_id' });
    if (error) return NextResponse.json({ error: 'تعذّر حفظ البطل، حاول مرة أخرى' }, { status: 500 });
    return NextResponse.json({ success: true, look, title: 'title' in row ? row.title : summary.title, eggStarted: !!(row.egg_started_at || data.cfg?.egg_started_at) });
  } catch {
    return NextResponse.json({ error: 'تعذّر حفظ البطل، حاول مرة أخرى' }, { status: 500 });
  }
}
