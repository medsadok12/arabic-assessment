import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { canManageAssessments } from '../../../../lib/teacher-permissions';

export const dynamic = 'force-dynamic';

async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await canManageAssessments(user))) return null;
  return user;
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin.from('assessment_skills').select('*').order('sort_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ skills: data });
}

// PUT — تحديث وزن مهارة واحدة (لا تُغيَّر id/الاسم من هنا)
export async function PUT(req) {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  const { id, weight } = await req.json();
  if (!id || typeof weight !== 'number' || weight < 0) {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('assessment_skills')
    .update({ weight, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ skill: data });
}
