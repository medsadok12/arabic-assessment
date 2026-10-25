import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { getRole }           from '../../../../lib/auth-role';
import { validateHuroofSettings } from '../../../../lib/huroof';
import { loadHuroofSettings, saveHuroofSettings } from '../../../../lib/huroof-server';

export const dynamic = 'force-dynamic';

const ALLOWED = ['teacher', 'admin', 'super_admin'];

async function getStaff() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && ALLOWED.includes(getRole(user) ?? '') ? user : null;
}

// PUT — إعدادات تحدّي الحروف لكل الطلاب (الوضع، مسار فهيم، الخلط، القفل، التلميحات…) — معلم أو مدير.
// القراءة تصل مع الحروف في GET /api/huroof
export async function PUT(req) {
  const user = await getStaff();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  try {
    const admin = createAdminClient();
    const current = await loadHuroofSettings(admin);
    const next = validateHuroofSettings(await req.json().catch(() => null), current);
    if (!next) return NextResponse.json({ error: 'قيم الإعدادات غير صالحة' }, { status: 400 });
    return NextResponse.json({ settings: await saveHuroofSettings(admin, next, user.id) });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل حفظ الإعدادات' }, { status: 500 });
  }
}

// POST { action: 'reset_all' } — جولة جديدة: يبدأ كل الطلاب المسار من أوله (التقدّم القديم يبقى في
// السجل بجولته، والنقاط المكتسبة لا تُسحب ولا تُمنح مرتين)
export async function POST(req) {
  const user = await getStaff();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (body?.action !== 'reset_all') return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  try {
    const admin = createAdminClient();
    const current = await loadHuroofSettings(admin);
    const settings = await saveHuroofSettings(admin, { ...current, epoch: current.epoch + 1 }, user.id);
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّرت إعادة الضبط' }, { status: 500 });
  }
}
