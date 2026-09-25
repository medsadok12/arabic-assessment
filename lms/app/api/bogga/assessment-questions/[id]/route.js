import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';
import { getRole } from '../../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['super_admin', 'admin'];

async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED_ROLES.includes(getRole(user))) return null;
  return user;
}

// PUT — تحديث سؤال قائم (محتوى، مهارة، وزن، تفعيل...) — لا يمس order_index
// (يُحدَّث حصراً عبر reorder/route.js لتفادي تضارب الترتيب بين طلبين متزامنين)
export async function PUT(req, { params }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { id } = params;
  const body = await req.json();
  const patch = {};
  if (body.skill !== undefined)   patch.skill   = body.skill;
  if (body.payload !== undefined) patch.payload = body.payload;
  if (body.weight !== undefined)  patch.weight  = body.weight;
  if (body.enabled !== undefined) patch.enabled = body.enabled;
  if (body.shuffle_within_level !== undefined) patch.shuffle_within_level = body.shuffle_within_level;
  patch.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('assessment_questions')
    .update(patch)
    .eq('id', id)
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
  const { error } = await admin.from('assessment_questions').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
