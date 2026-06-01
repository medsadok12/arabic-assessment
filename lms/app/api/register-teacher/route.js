import { createAdminClient } from '../../../lib/supabase-admin';

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'طلب غير صالح' }, { status: 400 }); }

  const { name, email, password, invitationCode } = body;
  if (!name || !email || !password || !invitationCode) {
    return Response.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const code = invitationCode.trim().toUpperCase();

  // Atomically mark the code as used — fails silently if code is wrong or already used
  const { data: claimed, error: claimErr } = await supabase
    .from('teacher_invitation_codes')
    .update({ is_used: true })
    .eq('code', code)
    .eq('is_used', false)
    .select('id')
    .maybeSingle();

  if (claimErr || !claimed) {
    return Response.json({
      error: 'كود تفعيل المعلم غير صحيح أو تم استخدامه من قبل، يرجى التواصل مع المدير',
    }, { status: 400 });
  }

  // Create the teacher account (email auto-confirmed — invitation code is proof enough)
  const { data: created, error: signupErr } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: name, role: 'teacher' },
    email_confirm: true,
  });

  if (signupErr) {
    // Roll back: free the code so it can be reused
    await supabase
      .from('teacher_invitation_codes')
      .update({ is_used: false })
      .eq('id', claimed.id);

    const msg = signupErr.message.toLowerCase().includes('already registered')
      ? 'هذا البريد الإلكتروني مسجل مسبقاً'
      : signupErr.message;
    return Response.json({ error: msg }, { status: 400 });
  }

  // Record who consumed the code (user ID + full name)
  await supabase
    .from('teacher_invitation_codes')
    .update({ used_by: created.user.id, used_by_name: name, used_at: new Date().toISOString() })
    .eq('id', claimed.id);

  return Response.json({ success: true });
}
