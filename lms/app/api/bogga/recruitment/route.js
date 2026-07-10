export const dynamic = 'force-dynamic';

import { NextResponse }       from 'next/server';
import { createClient }       from '../../../../lib/supabase-server';
import { createAdminClient }  from '../../../../lib/supabase-admin';
import { sendRejectionEmail, sendAcceptanceEmail } from '../../../../lib/email';
import { getRole } from '../../../../lib/auth-role';

function guard(user) {
  const role = getRole(user);
  return !user || (role !== 'super_admin' && role !== 'admin');
}

function isSuperAdmin(user) {
  return getRole(user) === 'super_admin';
}

// GET — list applications; super_admin sees all, admin sees only visible ones
export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (guard(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  if (user.user_metadata?.status === 'suspended') return NextResponse.json({ error: 'حسابك معطل' }, { status: 403 });

  const admin = createAdminClient();
  let q = admin
    .from('recruitment_applications')
    .select('id, name, email, phone, experience, specialty, notes, status, is_visible_to_assistants, created_at')
    .order('created_at', { ascending: false });

  if (!isSuperAdmin(user)) q = q.eq('is_visible_to_assistants', true);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data ?? [] });
}

// DELETE — remove an application permanently (super_admin only)
export async function DELETE(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdmin(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('recruitment_applications').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH — update status or visibility (super_admin only)
export async function PATCH(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdmin(user)) return NextResponse.json({ error: 'غير مخول' }, { status: 403 });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });

  // Visibility toggle
  if ('is_visible_to_assistants' in body) {
    const admin = createAdminClient();
    const { error } = await admin
      .from('recruitment_applications')
      .update({ is_visible_to_assistants: body.is_visible_to_assistants })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { status } = body;
  if (!status) return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });

  const admin = createAdminClient();

  // If rejecting, check current status to avoid duplicate emails
  if (status === 'accepted') {
    const { data: current } = await admin
      .from('recruitment_applications')
      .select('status, name, email')
      .eq('id', id)
      .single();

    if (current && current.status !== 'accepted') {
      const { error: updErr } = await admin
        .from('recruitment_applications')
        .update({ status })
        .eq('id', id);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

      try {
        await sendAcceptanceEmail({ to: current.email, candidateName: current.name });
      } catch (e) {
        console.error('[recruitment] acceptance email failed:', e.message);
        return NextResponse.json({ success: true, emailSent: false });
      }
      return NextResponse.json({ success: true, emailSent: true });
    }
  }

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
