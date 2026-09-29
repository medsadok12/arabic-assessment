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

const PATCHABLE = ['emoji', 'word', 'enabled'];

// PUT — تحديث زوج قائم — لا يمس order_index (يُحدَّث حصراً عبر reorder/route.js)
export async function PUT(req, { params }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  if (body.emoji !== undefined && !body.emoji?.trim()) return NextResponse.json({ error: 'الإيموجي لا يمكن أن يكون فارغاً' }, { status: 400 });
  if (body.word !== undefined && !body.word?.trim()) return NextResponse.json({ error: 'الكلمة لا يمكن أن تكون فارغة' }, { status: 400 });

  const patch = {};
  for (const key of PATCHABLE) if (body[key] !== undefined) patch[key] = (key === 'enabled') ? body[key] : body[key].trim();
  patch.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quicktest_matching_pairs')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ pair: data });
}

// DELETE
export async function DELETE(req, { params }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.from('quicktest_matching_pairs').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
