export const dynamic = 'force-dynamic';

import { NextResponse }       from 'next/server';
import { createClient }       from '../../../../lib/supabase-server';
import { createAdminClient }  from '../../../../lib/supabase-admin';
import { sendRejectionEmail } from '../../../../lib/email';

function guard(user) {
  return !user || user.user_metadata?.role !== 'super_admin';
}

// GET — list all applications (super_admin only)
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guard(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('recruitment_applications')
    .select('id, name, email, phone, experience, specialty, notes, status, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data ?? [] });
}

// DELETE — remove an application permanently
export async function DELETE(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guard(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('recruitment_applications').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH — update application status; auto-sends rejection email on first rejection
export async function PATCH(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guard(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });

  const admin = createAdminClient();

  // If rejecting, check current status to avoid duplicate emails
  if (status === 'rejected') {
    const { data: current } = await admin
      .from('recruitment_applications')
      .select('status, name, email')
      .eq('id', id)
      .single();

    if (current && current.status !== 'rejected') {
      // First-time rejection — update status then send email
      const { error: updErr } = await admin
        .from('recruitment_applications')
        .update({ status })
        .eq('id', id);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

      try {
        await sendRejectionEmail({ to: current.email, candidateName: current.name });
      } catch (e) {
        console.error('[recruitment] rejection email failed:', e.message);
        return NextResponse.json({ success: true, emailSent: false });
      }
      return NextResponse.json({ success: true, emailSent: true });
    }
  }

  // Normal status update (no email needed)
  const { error } = await admin
    .from('recruitment_applications')
    .update({ status })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, emailSent: false });
}
