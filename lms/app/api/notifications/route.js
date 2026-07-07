import { NextResponse }      from 'next/server';
import { createClient }      from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { getRole } from '../../../lib/auth-role';

export const dynamic = 'force-dynamic';

const ALLOWED    = ['teacher', 'supervisor', 'admin', 'super_admin'];
const ADMIN_ROLES = ['admin', 'super_admin'];

// GET — fetch notifications for the current user
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED.includes(getRole(user)))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin    = createAdminClient();
  const isAdmin  = ADMIN_ROLES.includes(getRole(user));

  // Admins see both global (recipient_id IS NULL) + personal
  const filter = isAdmin
    ? `recipient_id.is.null,recipient_id.eq.${user.id}`
    : `recipient_id.eq.${user.id}`;

  const { data, error } = await admin
    .from('notifications')
    .select('id, type, title, body, link, is_read, created_at')
    .or(filter)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ notifications: [], unread: 0 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notifications = data ?? [];
  const unread = notifications.filter(n => !n.is_read).length;
  return NextResponse.json({ notifications, unread });
}

// PATCH — mark notifications as read (all or specific id)
export async function PATCH(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ALLOWED.includes(getRole(user)))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const admin   = createAdminClient();
  const isAdmin = ADMIN_ROLES.includes(getRole(user));

  if (body.id) {
    const filter = isAdmin
      ? `recipient_id.is.null,recipient_id.eq.${user.id}`
      : `recipient_id.eq.${user.id}`;
    await admin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', body.id)
      .or(filter);
  } else {
    const filter = isAdmin
      ? `recipient_id.is.null,recipient_id.eq.${user.id}`
      : `recipient_id.eq.${user.id}`;
    await admin
      .from('notifications')
      .update({ is_read: true })
      .or(filter)
      .eq('is_read', false);
  }

  return NextResponse.json({ success: true });
}
