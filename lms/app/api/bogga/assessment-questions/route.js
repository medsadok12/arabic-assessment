import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { canManageAssessments } from '../../../../lib/teacher-permissions';

export const dynamic = 'force-dynamic';

// أكثر حساسية من letter_catcher_words (يحمل الإجابات الصحيحة لتقييم فعلي)
// — super_admin/admin دائماً، ومعلّم فقط إن مُنح صراحةً tab_key
// 'assessment_cms' (راجع lib/teacher-permissions.js وlوحة "صلاحيات المعلمين").
async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await canManageAssessments(user))) return null;
  return user;
}

// GET — كل الأسئلة (بما فيها المعطَّلة) لعرضها في لوحة الإدارة، مع فلترة اختيارية
export async function GET(req) {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get('level');

  const admin = createAdminClient();
  let query = admin.from('assessment_questions').select('*').order('level').order('order_index');
  if (level) query = query.eq('level', Number(level));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: data });
}

// POST — إنشاء سؤال جديد
export async function POST(req) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  const { id, level, skill, type, payload, weight, enabled } = body;

  if (!id?.trim()) return NextResponse.json({ error: 'معرف السؤال مطلوب' }, { status: 400 });
  if (![1, 2, 3].includes(Number(level))) return NextResponse.json({ error: 'مستوى غير صالح' }, { status: 400 });
  if (!skill) return NextResponse.json({ error: 'المهارة مطلوبة' }, { status: 400 });

  const admin = createAdminClient();

  // ترتيب جديد = آخر ترتيب في نفس المستوى + 1
  const { data: maxRow } = await admin
    .from('assessment_questions')
    .select('order_index')
    .eq('level', Number(level))
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const order_index = (maxRow?.order_index ?? -1) + 1;

  const { data, error } = await admin
    .from('assessment_questions')
    .insert({
      id: id.trim(),
      level: Number(level),
      skill,
      type: type || 'mcq',
      order_index,
      shuffle_within_level: false,
      enabled: enabled ?? true,
      weight: weight ?? 1,
      payload: payload || {},
    })
    .select()
    .single();

  if (error) {
    const msg = error.code === '23505' ? 'معرّف السؤال مستخدَم بالفعل' : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ question: data });
}
