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

const PATCHABLE = ['sentence_text', 'emoji', 'enabled'];

// PUT — تحديث جملة قائمة (نصها/إيموجيها/حالة تفعيلها) — لا يمس order_index
// (يُحدَّث حصراً عبر reorder/route.js)
export async function PUT(req, { params }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  if (body.sentence_text !== undefined && !body.sentence_text?.trim()) {
    return NextResponse.json({ error: 'نص الجملة لا يمكن أن يكون فارغاً' }, { status: 400 });
  }
  if (body.emoji !== undefined && !body.emoji?.trim()) {
    return NextResponse.json({ error: 'الإيموجي لا يمكن أن يكون فارغاً' }, { status: 400 });
  }

  const patch = {};
  for (const key of PATCHABLE) {
    if (body[key] === undefined) continue;
    patch[key] = key === 'enabled' ? body[key] : body[key].trim();
  }
  patch.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quicktest_voice_sentences')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ sentence: data });
}

// DELETE
export async function DELETE(req, { params }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.from('quicktest_voice_sentences').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
