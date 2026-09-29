import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';
import { getRole } from '../../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

// PATCH — إعادة ترتيب دفعة واحدة: [{id, order_index}, ...] — نفس نمط
// quicktest-alphabet/quicktest-voice بالضبط (أزرار ▲▼، لا سحب وإفلات).
export async function PATCH(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user ? getRole(user) : null;
  if (!user || (role !== 'super_admin' && role !== 'admin')) {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const { items } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'لا توجد عناصر لإعادة الترتيب' }, { status: 400 });
  }

  const admin = createAdminClient();
  const results = await Promise.all(
    items.map(({ id, order_index }) =>
      admin.from('quicktest_word_completion_items').update({ order_index }).eq('id', id)
    )
  );
  const failed = results.find(r => r.error);
  if (failed) return NextResponse.json({ error: failed.error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
