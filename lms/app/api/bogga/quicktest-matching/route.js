import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = getRole(user);
  if (role !== 'super_admin' && role !== 'admin') return null;
  return user;
}

// GET — كل أزواج المطابقة (بما فيها المعطَّلة) لكلا التدريبين معاً
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quicktest_matching_pairs')
    .select('*')
    .order('exercise_key')
    .order('order_index');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pairs: data });
}

// POST — إضافة زوج جديد لتدريب مُحدَّد: { exercise_key, emoji, word }
export async function POST(req) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { exercise_key, emoji, word } = await req.json();
  if (!exercise_key || !['matching-1', 'matching-2'].includes(exercise_key)) {
    return NextResponse.json({ error: 'معرّف التدريب غير صالح' }, { status: 400 });
  }
  if (!emoji?.trim() || !word?.trim()) {
    return NextResponse.json({ error: 'الإيموجي والكلمة مطلوبان' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: maxRow } = await admin
    .from('quicktest_matching_pairs')
    .select('order_index')
    .eq('exercise_key', exercise_key)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const order_index = (maxRow?.order_index ?? -1) + 1;

  const { data, error } = await admin
    .from('quicktest_matching_pairs')
    .insert({ exercise_key, order_index, emoji: emoji.trim(), word: word.trim(), enabled: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ pair: data });
}
