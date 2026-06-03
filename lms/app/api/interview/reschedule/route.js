export const dynamic = 'force-dynamic';

import { NextResponse }      from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const { token, reason } = body;
  if (!token) return NextResponse.json({ error: 'رابط غير صالح' }, { status: 400 });
  if (!reason?.trim()) return NextResponse.json({ error: 'يرجى كتابة سبب الطلب' }, { status: 400 });

  const admin = createAdminClient();
  const { data: iv, error } = await admin
    .from('interviews')
    .select('id, candidate_response')
    .eq('response_token', token)
    .single();

  if (error || !iv) return NextResponse.json({ error: 'الرابط غير صالح أو منتهي الصلاحية' }, { status: 404 });

  const { error: updErr } = await admin
    .from('interviews')
    .update({
      candidate_response: 'reschedule_requested',
      reschedule_reason:  reason.trim(),
      updated_at:         new Date().toISOString(),
    })
    .eq('id', iv.id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
