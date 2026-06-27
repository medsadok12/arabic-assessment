import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { sendTeacherInviteEmail, sendTeacherDeclineEmail } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET — invites for the current teacher (pending + accepted)
export async function GET() {
  const user = await getUser();
  if (!user || user.user_metadata?.role !== 'teacher')
    return NextResponse.json({ invites: [] });

  const admin = createAdminClient();
  const { data: invites } = await admin
    .from('session_teacher_invites')
    .select('*')
    .eq('teacher_id', user.id)
    .in('status', ['pending', 'accepted'])
    .order('invited_at', { ascending: false });

  if (!invites?.length) return NextResponse.json({ invites: [] });

  // Enrich with session details
  const sessionIds = [...new Set(invites.map(i => i.session_id))];
  const { data: sessions } = await admin
    .from('sessions')
    .select('id, teacher_name, session_date, start_time, duration_minutes, subject, meet_link, room_name, status')
    .in('id', sessionIds);

  const map = Object.fromEntries((sessions ?? []).map(s => [s.id, s]));
  const enriched = invites.map(i => ({ ...i, session: map[i.session_id] ?? null }));

  return NextResponse.json({ invites: enriched });
}

// POST — send invite from session owner to a colleague teacher
export async function POST(req) {
  const user = await getUser();
  if (!user || user.user_metadata?.role !== 'teacher')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { session_id, teacher_id } = await req.json();
  if (!session_id || !teacher_id)
    return NextResponse.json({ error: 'session_id و teacher_id مطلوبان' }, { status: 400 });

  const admin = createAdminClient();

  // Verify session belongs to caller
  const { data: session } = await admin
    .from('sessions')
    .select('id, teacher_name, session_date, start_time, duration_minutes, subject')
    .eq('id', session_id)
    .eq('teacher_id', user.id)
    .single();
  if (!session) return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });

  // Get invited teacher info
  const { data: { user: invited }, error: userErr } = await admin.auth.admin.getUserById(teacher_id);
  if (userErr || !invited) return NextResponse.json({ error: 'المعلم غير موجود' }, { status: 404 });

  const teacher_name  = invited.user_metadata?.full_name ?? invited.email;
  const teacher_email = invited.email;

  const { data, error } = await admin
    .from('session_teacher_invites')
    .insert({ session_id, teacher_id, teacher_email, teacher_name })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'المعلم مدعو مسبقاً' }, { status: 409 });
    if (error.code === '42P01') return NextResponse.json({ error: 'جدول الدعوات غير موجود — شغّل SQL' }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send email notification
  sendTeacherInviteEmail({
    to:              teacher_email,
    teacherName:     teacher_name,
    inviterName:     session.teacher_name,
    sessionDate:     session.session_date,
    startTime:       session.start_time,
    durationMinutes: session.duration_minutes,
    subject:         session.subject,
  }).catch(() => {});

  return NextResponse.json({ invite: data });
}

// PATCH — respond to an invite (accept / decline)
export async function PATCH(req) {
  const user = await getUser();
  if (!user || user.user_metadata?.role !== 'teacher')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { id, status } = await req.json();
  if (!id || !['accepted', 'declined'].includes(status))
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });

  const admin = createAdminClient();

  const { data: invite, error } = await admin
    .from('session_teacher_invites')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', id)
    .eq('teacher_id', user.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // On decline → notify session owner
  if (status === 'declined') {
    const { data: session } = await admin
      .from('sessions')
      .select('teacher_id, teacher_name, session_date, start_time, subject')
      .eq('id', invite.session_id)
      .single();

    if (session) {
      const { data: { user: owner } } = await admin.auth.admin.getUserById(session.teacher_id);
      if (owner?.email) {
        sendTeacherDeclineEmail({
          to:          owner.email,
          ownerName:   session.teacher_name,
          inviteeName: user.user_metadata?.full_name ?? user.email,
          sessionDate: session.session_date,
          startTime:   session.start_time,
          subject:     session.subject,
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ invite });
}
