import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

// نفس حراسة analytics/leads بالضبط — أداة تسويقية، لا حاجة لتفويض معلمين
// (بخلاف canManageAssessments الخاص بالتقييم الحقيقي).
async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = getRole(user);
  if (role !== 'super_admin' && role !== 'admin') return null;
  return user;
}

// GET — كل الأسئلة (بما فيها المعطَّلة) لعرضها في لوحة الإدارة
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quicktest_questions')
    .select('*')
    .order('order_index');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: data });
}

// POST — إنشاء سؤال جديد (يُضاف في نهاية الترتيب دائماً)
export async function POST(req) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  const { question_text, options } = body;

  if (!question_text?.trim()) return NextResponse.json({ error: 'نص السؤال مطلوب' }, { status: 400 });
  if (!Array.isArray(options) || options.length < 2) return NextResponse.json({ error: 'يجب إضافة خيارين على الأقل' }, { status: 400 });
  if (!options.some(o => o.correct)) return NextResponse.json({ error: 'حدّد الإجابة الصحيحة' }, { status: 400 });

  const admin = createAdminClient();

  const { data: maxRow } = await admin
    .from('quicktest_questions')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const order_index = (maxRow?.order_index ?? -1) + 1;

  const { data, error } = await admin
    .from('quicktest_questions')
    .insert({
      order_index,
      question_text: question_text.trim(),
      image_url:        body.image_url || null,
      audio_url:        body.audio_url || null,
      prompt_emoji:     body.prompt_emoji || null,
      audio_prompt:     body.audio_prompt || null,
      reading_text:     body.reading_text || null,
      parent_read_hint: !!body.parent_read_hint,
      skill_tag:        body.skill_tag || null,
      options,
      enabled: body.enabled ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ question: data });
}
