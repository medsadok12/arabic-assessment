import { createClient as createServerClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_ROLES.has(user.user_metadata?.role)) return null;
  return user;
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'غير مخول' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'طلب غير صالح' }, { status: 400 }); }

  const { userId, name, email } = body;
  if (!userId) return Response.json({ error: 'userId مطلوب' }, { status: 400 });

  const admin = createAdminClient();

  // Update Auth email first — abort entirely if it fails to avoid inconsistency
  if (email?.trim()) {
    const { error } = await admin.auth.admin.updateUserById(userId, { email: email.trim() });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  if (name?.trim()) {
    const { error } = await admin
      .from('assessments')
      .update({ student_name: name.trim() })
      .eq('user_id', userId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
