import { NextResponse } from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

// نفس حراسة analytics/route.js بالضبط — بيانات تواصل حساسة (هاتف/بريد
// ولي أمر)، لا تُخفَّف الصلاحية عنها أبداً.
async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = getRole(user);
  if (role !== 'super_admin' && role !== 'admin') return null;
  return { user, role };
}

// GET — كل العملاء المحتملين مرتبين تنازلياً. لا حاجة لترقيم صفحات هنا:
// جدول جديد يبدأ من صفر ويُتوقَّع نمو بطيء نسبياً (راجع القسم 12.4 من
// CLAUDE.md — لا تصميم لحمل مستقبلي افتراضي).
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 401 });

  const admin = createAdminClient();
  const { data: leads, error } = await admin
    .from('marketing_leads')
    .select('id, parent_name, phone, email, child_name, child_age, score, level, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leads: leads ?? [] });
}
