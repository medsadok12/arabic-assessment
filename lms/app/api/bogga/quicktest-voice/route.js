import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

// نفس حراسة quicktest-alphabet/quicktest-questions بالضبط.
async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = getRole(user);
  if (role !== 'super_admin' && role !== 'admin') return null;
  return user;
}

// GET — كل الجمل (بما فيها المعطَّلة) لعرضها في لوحة الإدارة
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quicktest_voice_sentences')
    .select('*')
    .order('order_index');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sentences: data });
}

// POST — إضافة جملة جديدة (تُضاف في نهاية الترتيب دائماً)
export async function POST(req) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { sentence_text, emoji } = await req.json();
  if (!sentence_text?.trim()) return NextResponse.json({ error: 'نص الجملة مطلوب' }, { status: 400 });
  if (!emoji?.trim()) return NextResponse.json({ error: 'الإيموجي مطلوب' }, { status: 400 });

  const admin = createAdminClient();

  const { data: maxRow } = await admin
    .from('quicktest_voice_sentences')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const order_index = (maxRow?.order_index ?? -1) + 1;

  const { data, error } = await admin
    .from('quicktest_voice_sentences')
    .insert({ order_index, sentence_text: sentence_text.trim(), emoji: emoji.trim(), enabled: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ sentence: data });
}
