import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

// نفس حراسة quicktest-questions/quicktest-levels بالضبط.
async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = getRole(user);
  if (role !== 'super_admin' && role !== 'admin') return null;
  return user;
}

// GET — كل الحروف (بما فيها المعطَّلة) لعرضها في لوحة الإدارة
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quicktest_alphabet_letters')
    .select('*')
    .order('order_index');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ letters: data });
}

// POST — إضافة حرف جديد (يُضاف في نهاية الترتيب دائماً)
export async function POST(req) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { letter } = await req.json();
  if (!letter?.trim()) return NextResponse.json({ error: 'الحرف مطلوب' }, { status: 400 });

  const admin = createAdminClient();

  const { data: maxRow } = await admin
    .from('quicktest_alphabet_letters')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const order_index = (maxRow?.order_index ?? -1) + 1;

  const { data, error } = await admin
    .from('quicktest_alphabet_letters')
    .insert({ order_index, letter: letter.trim(), enabled: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ letter: data });
}
