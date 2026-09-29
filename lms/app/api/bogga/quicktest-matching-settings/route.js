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

// GET — صفَّا إعدادات تدريبَي المطابقة (matching-1/matching-2)
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin.from('quicktest_matching_settings').select('*').order('exercise_key');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

const PATCHABLE = ['enabled', 'title', 'subtitle', 'label', 'skill_tag'];

// PATCH — تحديث إعدادات تدريب واحد: { exercise_key, ...patch }
export async function PATCH(req) {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  const { exercise_key } = body;
  if (!exercise_key) return NextResponse.json({ error: 'معرّف التدريب مطلوب' }, { status: 400 });

  const patch = {};
  for (const key of PATCHABLE) if (body[key] !== undefined) patch[key] = body[key];
  if (['title', 'subtitle', 'label', 'skill_tag'].some(k => patch[k] !== undefined && !patch[k]?.trim())) {
    return NextResponse.json({ error: 'الحقول النصية لا يمكن أن تكون فارغة' }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quicktest_matching_settings')
    .update(patch)
    .eq('exercise_key', exercise_key)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ settings: data });
}
