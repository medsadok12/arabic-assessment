import { createAdminClient } from '../../../../lib/supabase-admin';
import { cleanupUserData }   from '../../../../lib/cleanup-user';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'طلب غير صالح' }, { status: 400 }); }

  const { userId } = body;
  if (!userId) return Response.json({ error: 'userId مطلوب' }, { status: 400 });

  const admin = createAdminClient();

  const { data: { user: target }, error: fetchErr } = await admin.auth.admin.getUserById(userId);
  if (fetchErr || !target) return Response.json({ error: 'المستخدم غير موجود' }, { status: 404 });

  await cleanupUserData(userId, target.email, admin);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
