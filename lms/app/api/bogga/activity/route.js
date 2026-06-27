export const dynamic = 'force-dynamic';

import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

const SESSION_GAP_MS = 10 * 60 * 1000; // 10-minute gap = new session

function isAllowed(user) {
  const r = user?.user_metadata?.role;
  return r === 'admin' || r === 'super_admin';
}

// POST — heartbeat ping (any admin/super_admin)
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAllowed(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const db   = createAdminClient();
  const now  = new Date();
  const name = user.user_metadata?.full_name ?? user.email;

  const { data: existing } = await db
    .from('admin_online_status')
    .select('last_seen, session_start')
    .eq('admin_id', user.id)
    .single();

  const isNewSession = !existing ||
    (now - new Date(existing.last_seen)) > SESSION_GAP_MS;

  if (isNewSession && existing?.session_start) {
    const duration = Math.max(1, Math.round(
      (new Date(existing.last_seen) - new Date(existing.session_start)) / 60000
    ));
    await db.from('admin_sessions').insert({
      admin_id:         user.id,
      admin_email:      user.email,
      admin_name:       name,
      session_start:    existing.session_start,
      session_end:      existing.last_seen,
      duration_minutes: duration,
    });
  }

  await db.from('admin_online_status').upsert({
    admin_id:      user.id,
    admin_email:   user.email,
    admin_name:    name,
    last_seen:     now.toISOString(),
    session_start: isNewSession ? now.toISOString() : (existing?.session_start ?? now.toISOString()),
  }, { onConflict: 'admin_id' });

  return NextResponse.json({ ok: true });
}

// GET — all admins' last_seen (no admin_id) OR one admin's sessions (with admin_id)
export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const adminId = new URL(req.url).searchParams.get('admin_id');
  const db = createAdminClient();

  if (!adminId) {
    const { data } = await db
      .from('admin_online_status')
      .select('admin_id, last_seen, session_start');
    return NextResponse.json({ online_status: data ?? [] });
  }

  const [{ data: sessions }, { data: online }] = await Promise.all([
    db.from('admin_sessions')
      .select('id, session_start, session_end, duration_minutes')
      .eq('admin_id', adminId)
      .order('session_start', { ascending: false })
      .limit(50),
    db.from('admin_online_status')
      .select('last_seen, session_start')
      .eq('admin_id', adminId)
      .single(),
  ]);

  return NextResponse.json({ sessions: sessions ?? [], online: online ?? null });
}
