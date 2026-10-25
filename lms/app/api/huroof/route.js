import { NextResponse }      from 'next/server';
import { createClient }      from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { loadHuroofRows, loadHuroofSettings } from '../../../lib/huroof-server';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

// GET — تعديلات الإدارة على الحروف الهجائية (صف لكل حرف مُعدَّل) + إعدادات التحدّي.
// تُجلب حيّة بلا كاش؛ الصفحة تدمجها فوق المحتوى الافتراضي (lib/huroof.js)
// وتبقى على الافتراضي بصمت إن فشل الطلب.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 401, headers: NO_STORE });

  try {
    const admin = createAdminClient();
    const [rows, settings] = await Promise.all([loadHuroofRows(admin), loadHuroofSettings(admin)]);
    return NextResponse.json({ rows, settings }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: NO_STORE });
  }
}
