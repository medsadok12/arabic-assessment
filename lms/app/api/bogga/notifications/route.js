export const dynamic = 'force-dynamic';

import { NextResponse }     from 'next/server';
import { createClient }     from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { cookies }           from 'next/headers';

async function getRole() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // app_metadata أولاً (آمن) ثم user_metadata احتياطياً — إغلاق ثغرة رفع الصلاحيات
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role ?? '';
  return { user, role };
}

// GET — fetch recent notifications (max 30)
export async function GET() {
  const { role } = await getRole();
  if (role !== 'admin' && role !== 'super_admin')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('notifications')
    .select('id, type, title, body, meta, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    if (error.code === '42P01')
      return NextResponse.json({ notifications: [], unread: 0 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const unread = (data ?? []).filter(n => !n.is_read).length;
  return NextResponse.json({ notifications: data ?? [], unread });
}

// PATCH — mark notifications as read
export async function PATCH(req) {
  const { role } = await getRole();
  if (role !== 'admin' && role !== 'super_admin')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  let body = {};
  try { body = await req.json(); } catch { /* no body = mark all */ }

  const admin = createAdminClient();
  let query = admin.from('notifications').update({ is_read: true });
  if (body.id) {
    query = query.eq('id', body.id);
  } else {
    query = query.eq('is_read', false);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
