import { NextResponse } from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';

// GET — return cv_base64 + cv_filename for a single application (super_admin only)
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
    .select('cv_base64, cv_filename')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

  return NextResponse.json({ cv_base64: data.cv_base64, cv_filename: data.cv_filename });
}
