import { NextResponse }       from 'next/server';
import { createClient }       from '../../../../lib/supabase-server';
import { createAdminClient }  from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

async function checkAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') return null;
  return user;
}

// GET /api/bogga/sessions — all sessions
export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sessions')
    .select('id, teacher_id, teacher_name, student_name, student_email, session_date, start_time, duration_minutes, subject, status, meet_link, room_name, notes, recording_url, reminder_sent, created_at')
    .order('session_date', { ascending: false })
    .order('start_time',   { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

// PATCH /api/bogga/sessions — update status / notes / recording_url
export async function PATCH(req) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const body = await req.json();
  const { id, status, notes, recording_url } = body;
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const updates = {};
  if (status       !== undefined) updates.status        = status;
  if (notes        !== undefined) updates.notes         = notes;
  if (recording_url !== undefined) updates.recording_url = recording_url;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sessions').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

// DELETE /api/bogga/sessions — cancel session
export async function DELETE(req) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('sessions').update({ status: 'cancelled' }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
