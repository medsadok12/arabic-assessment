import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { isAdmin } from '../../../../lib/auth-role';
import { SIGNUP_CODES_KEY, loadSignupCodes, normalizeSignupCodes } from '../../../../lib/signup-codes';

export const dynamic = 'force-dynamic';

// PUT { student_code_required?, assessment_code_required? } — إظهار خانة الكود أو إخفاؤها
// (المشرف والمدير المطلق فقط). القيمة غير المرسلة تبقى كما هي.
export async function PUT(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'هذا الإعداد للمشرف فقط' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const current = await loadSignupCodes(admin);
    const next = normalizeSignupCodes({ ...current, ...body });
    const { error } = await admin.from('platform_settings').upsert(
      { key: SIGNUP_CODES_KEY, value: next, updated_at: new Date().toISOString(), updated_by: user.id },
      { onConflict: 'key' },
    );
    if (error) throw error;
    return NextResponse.json(next, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر حفظ الإعداد' }, { status: 500 });
  }
}
