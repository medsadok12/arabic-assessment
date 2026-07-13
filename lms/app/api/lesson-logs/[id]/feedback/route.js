import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { notifyUser }        from '../../../../../lib/notify';
import { getRole } from '../../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['admin', 'super_admin', 'supervisor'];

// POST — add feedback/guidance to a lesson log (admin/supervisor only)
export async function POST(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = getRole(user);
  if (!user || !ALLOWED_ROLES.includes(role))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { content } = await req.json();
  if (!content?.trim())
    return NextResponse.json({ error: 'نص التوجيه لا يمكن أن يكون فارغاً' }, { status: 400 });

  const admin = createAdminClient();

  const { data: logExists } = await admin
    .from('lesson_logs').select('id, teacher_id').eq('id', params.id).single();
  if (!logExists) return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 });

  const { data, error } = await admin
    .from('lesson_feedback')
    .insert({
      lesson_log_id: params.id,
      author_id:     user.id,
      author_name:   user.user_metadata?.full_name ?? user.email,
      author_role:   role,
      content:       content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the teacher
  const reviewerName = user.user_metadata?.full_name ?? user.email;
  notifyUser(
    logExists.teacher_id,
    'lesson_feedback',
    `📓 ${reviewerName} أضاف توجيهاً على كراس دروسك`,
    content.trim().slice(0, 60),
    '/teacher/logbook'
  );

  return NextResponse.json({ feedback: data }, { status: 201 });
}
