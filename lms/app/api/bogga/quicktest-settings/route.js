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

// GET — صف الإعدادات الوحيد (id=1)
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin.from('quicktest_settings').select('*').eq('id', 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

// PATCH — تحديث قالب رسالة واتساب و/أو إعدادات تمرين الحروف الافتتاحي
export async function PATCH(req) {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  const patch = {};

  if (body.whatsapp_template !== undefined) {
    if (!body.whatsapp_template?.trim()) return NextResponse.json({ error: 'نص الرسالة مطلوب' }, { status: 400 });
    patch.whatsapp_template = body.whatsapp_template.trim();
  }
  if (body.alphabet_enabled !== undefined) patch.alphabet_enabled = !!body.alphabet_enabled;
  if (body.alphabet_title !== undefined) {
    if (!body.alphabet_title?.trim()) return NextResponse.json({ error: 'عنوان تمرين الحروف مطلوب' }, { status: 400 });
    patch.alphabet_title = body.alphabet_title.trim();
  }
  if (body.alphabet_subtitle !== undefined) {
    if (!body.alphabet_subtitle?.trim()) return NextResponse.json({ error: 'النص الفرعي لتمرين الحروف مطلوب' }, { status: 400 });
    patch.alphabet_subtitle = body.alphabet_subtitle.trim();
  }
  if (body.voice_enabled !== undefined) patch.voice_enabled = !!body.voice_enabled;
  if (body.voice_title !== undefined) {
    if (!body.voice_title?.trim()) return NextResponse.json({ error: 'عنوان تقييم القراءة الجهرية مطلوب' }, { status: 400 });
    patch.voice_title = body.voice_title.trim();
  }
  if (body.voice_subtitle !== undefined) {
    if (!body.voice_subtitle?.trim()) return NextResponse.json({ error: 'النص الفرعي لتقييم القراءة الجهرية مطلوب' }, { status: 400 });
    patch.voice_subtitle = body.voice_subtitle.trim();
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'لا توجد بيانات للتحديث' }, { status: 400 });
  patch.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quicktest_settings')
    .update(patch)
    .eq('id', 1)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ settings: data });
}
