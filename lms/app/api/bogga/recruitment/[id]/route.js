import { NextResponse } from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';

// GET — return CV data for a single application (super_admin only)
export async function GET(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const { id } = params;
  if (!id) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('recruitment_applications')
    .select('cv_path')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

  if (!data.cv_path) {
    return NextResponse.json({ error: 'لا توجد سيرة ذاتية مرفقة بهذا الطلب' }, { status: 404 });
  }

  // cv_path stores JSON: { filename, base64 }
  try {
    const parsed = JSON.parse(data.cv_path);
    if (!parsed.base64) throw new Error('no base64');
    return NextResponse.json({ cv_base64: parsed.base64, cv_filename: parsed.filename });
  } catch {
    return NextResponse.json({ error: 'صيغة السيرة الذاتية غير مدعومة (طلب قديم)' }, { status: 404 });
  }
}
