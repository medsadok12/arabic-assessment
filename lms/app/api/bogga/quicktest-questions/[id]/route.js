import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';
import { getRole } from '../../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = getRole(user);
  if (role !== 'super_admin' && role !== 'admin') return null;
  return user;
}

const PATCHABLE = ['question_text', 'image_url', 'audio_url', 'prompt_emoji', 'audio_prompt', 'reading_text', 'parent_read_hint', 'skill_tag', 'options', 'enabled'];

// PUT — تحديث سؤال قائم — لا يمس order_index (يُحدَّث حصراً عبر reorder/route.js)
export async function PUT(req, { params }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  if (body.options !== undefined) {
    if (!Array.isArray(body.options) || body.options.length < 2) {
      return NextResponse.json({ error: 'يجب إضافة خيارين على الأقل' }, { status: 400 });
    }
    if (!body.options.some(o => o.correct)) {
      return NextResponse.json({ error: 'حدّد الإجابة الصحيحة' }, { status: 400 });
    }
  }

  const patch = {};
  for (const key of PATCHABLE) if (body[key] !== undefined) patch[key] = body[key];
  patch.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quicktest_questions')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ question: data });
}

// DELETE
export async function DELETE(req, { params }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.from('quicktest_questions').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
