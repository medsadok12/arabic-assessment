import { NextResponse } from 'next/server';
import { createAdminClient, fetchAllUsers } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

// إدارة صلاحيات المعلمين الفرعية (مثل assessment_cms) — super_admin حصراً؛
// تفويض صلاحية خادمية حقيقية (لا مجرد تبويب ظاهر)، راجع lib/teacher-permissions.js.
async function guardSuper() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || getRole(user) !== 'super_admin') return null;
  return user;
}

// GET — كل المعلمين + الصلاحيات الفرعية الممنوحة لكل واحد منهم
export async function GET() {
  if (!(await guardSuper())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  let users;
  try { users = await fetchAllUsers(admin); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }

  const teachers = users
    .filter(u => getRole(u) === 'teacher')
    .map(u => ({ id: u.id, name: u.user_metadata?.full_name ?? '—', email: u.email ?? '' }));

  const { data: grants, error } = await admin.from('teacher_permissions').select('teacher_id, tab_key');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grantsByTeacher = {};
  for (const g of grants ?? []) (grantsByTeacher[g.teacher_id] ??= []).push(g.tab_key);

  return NextResponse.json({
    teachers: teachers.map(t => ({ ...t, tabKeys: grantsByTeacher[t.id] ?? [] })),
  });
}

// POST — منح أو سحب صلاحية فرعية واحدة لمعلم واحد
export async function POST(req) {
  const user = await guardSuper();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { teacher_id, tab_key, granted } = await req.json();
  if (!teacher_id || !tab_key) {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (granted) {
    const { error } = await admin
      .from('teacher_permissions')
      .upsert({ teacher_id, tab_key, granted_by: user.id }, { onConflict: 'teacher_id,tab_key' });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await admin
      .from('teacher_permissions')
      .delete()
      .eq('teacher_id', teacher_id)
      .eq('tab_key', tab_key);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
