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

const PATCHABLE = ['icon', 'label', 'min_correct', 'max_correct', 'strengths_text', 'recommendation', 'program_name', 'program_pitch'];

// GET — كل المستويات (عادة 3: البراعم/المستكشفون/المبدعون)
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin.from('quicktest_levels').select('*').order('sort_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ levels: data });
}

// PATCH — تحديث حدود/نصوص مستوى واحد: { id, ...patch }
export async function PATCH(req) {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'معرّف المستوى مطلوب' }, { status: 400 });

  const patch = {};
  for (const key of PATCHABLE) if (body[key] !== undefined) patch[key] = body[key];
  if (patch.min_correct !== undefined && patch.max_correct !== undefined && Number(patch.min_correct) > Number(patch.max_correct)) {
    return NextResponse.json({ error: 'الحد الأدنى يجب أن يكون أصغر من أو يساوي الحد الأقصى' }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin.from('quicktest_levels').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ level: data });
}
