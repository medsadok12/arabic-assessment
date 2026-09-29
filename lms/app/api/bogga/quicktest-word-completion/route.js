import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

// نفس حراسة quicktest-alphabet/quicktest-voice بالضبط.
async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = getRole(user);
  if (role !== 'super_admin' && role !== 'admin') return null;
  return user;
}

function validateWordShape(wordText, missingIndex) {
  if (!wordText?.trim()) return 'نص الكلمة مطلوب';
  if (!Number.isInteger(missingIndex) || missingIndex < 0 || missingIndex >= wordText.trim().length) {
    return 'موضع الحرف الناقص غير صحيح';
  }
  return null;
}

// GET — كل العناصر (بما فيها المعطَّلة) لعرضها في لوحة الإدارة
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quicktest_word_completion_items')
    .select('*')
    .order('order_index');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

// POST — إضافة كلمة جديدة (تُضاف في نهاية الترتيب دائماً)
export async function POST(req) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { word_text, missing_index, distractor_options, emoji } = await req.json();
  const wordText = word_text?.trim();
  const validationError = validateWordShape(wordText, missing_index);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (!emoji?.trim()) return NextResponse.json({ error: 'الإيموجي مطلوب' }, { status: 400 });
  if (!Array.isArray(distractor_options) || distractor_options.length === 0) {
    return NextResponse.json({ error: 'يجب إدخال خيار خاطئ واحد على الأقل' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: maxRow } = await admin
    .from('quicktest_word_completion_items')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const order_index = (maxRow?.order_index ?? -1) + 1;

  const { data, error } = await admin
    .from('quicktest_word_completion_items')
    .insert({
      order_index, word_text: wordText, missing_index,
      distractor_options: distractor_options.map(d => String(d).trim()).filter(Boolean),
      emoji: emoji.trim(), enabled: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}
