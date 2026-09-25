import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';
import { getRole } from '../../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['super_admin', 'admin'];

// PATCH — إعادة ترتيب دفعة واحدة: [{id, order_index}, ...] لكل أسئلة مستوى
// واحد بعد سحب/إفلات أو ضغط أسهم الأعلى/الأسفل في اللوحة.
export async function PATCH(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED_ROLES.includes(getRole(user))) {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const { items } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'لا توجد عناصر لإعادة الترتيب' }, { status: 400 });
  }

  const admin = createAdminClient();
  const results = await Promise.all(
    items.map(({ id, order_index }) =>
      admin.from('assessment_questions').update({ order_index }).eq('id', id)
    )
  );
  const failed = results.find(r => r.error);
  if (failed) return NextResponse.json({ error: failed.error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
