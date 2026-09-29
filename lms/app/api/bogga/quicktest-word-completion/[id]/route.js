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

const PATCHABLE = ['word_text', 'missing_index', 'distractor_options', 'emoji', 'enabled', 'image_url'];

// PUT — تحديث عنصر قائم — لا يمس order_index (يُحدَّث حصراً عبر reorder/route.js)
// image_url: أولوية على emoji عند العرض الحيّ (نفس نمط quicktest_matching_pairs/
// quicktest_voice_sentences) — يُقبَل null صراحةً لإزالة الصورة والعودة للإيموجي.
export async function PUT(req, { params }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  if (body.word_text !== undefined && !body.word_text?.trim()) {
    return NextResponse.json({ error: 'نص الكلمة لا يمكن أن يكون فارغاً' }, { status: 400 });
  }
  if (body.emoji !== undefined && !body.emoji?.trim()) {
    return NextResponse.json({ error: 'الإيموجي لا يمكن أن يكون فارغاً' }, { status: 400 });
  }
  if (body.missing_index !== undefined && !Number.isInteger(body.missing_index)) {
    return NextResponse.json({ error: 'موضع الحرف الناقص غير صحيح' }, { status: 400 });
  }

  const patch = {};
  for (const key of PATCHABLE) {
    if (body[key] === undefined) continue;
    if (key === 'enabled' || key === 'missing_index') { patch[key] = body[key]; continue; }
    if (key === 'image_url') { patch[key] = body[key] || null; continue; }
    if (key === 'distractor_options') {
      patch[key] = Array.isArray(body[key]) ? body[key].map(d => String(d).trim()).filter(Boolean) : [];
      continue;
    }
    patch[key] = body[key].trim();
  }
  patch.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quicktest_word_completion_items')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}

// DELETE
export async function DELETE(req, { params }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.from('quicktest_word_completion_items').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
