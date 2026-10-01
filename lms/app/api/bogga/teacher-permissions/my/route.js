import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';
import { getRole } from '../../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

// يستخدمها المعلم نفسه (لوحة /teacher) ليعرف الروابط الإضافية المتاحة له
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || getRole(user) !== 'teacher') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('teacher_permissions')
    .select('tab_key')
    .eq('teacher_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tabKeys: (data ?? []).map(r => r.tab_key) });
}
