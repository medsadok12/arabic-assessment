import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '../../../../../lib/supabase-server';
import { getRole } from '../../../../../lib/auth-role';
export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_ROLES.has(getRole(user))) return null;
  return user;
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'غير مخول' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'طلب غير صالح' }, { status: 400 }); }

  const { id, name } = body;
  if (!id || !name?.trim()) return Response.json({ error: 'id والاسم مطلوبان' }, { status: 400 });

  const supabase = getClient();
  const { error } = await supabase
    .from('student_groups')
    .update({ name: name.trim() })
    .eq('id', id);

  if (error) {
    const isDup = error.message.includes('unique') || error.message.includes('duplicate') || error.code === '23505';
    return Response.json({ error: isDup ? 'يوجد مجموعة بهذا الاسم مسبقاً' : error.message }, { status: 400 });
  }
  return Response.json({ success: true });
}
