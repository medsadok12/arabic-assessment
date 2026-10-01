import { NextResponse }       from 'next/server';
import { createAdminClient, fetchAllUsers } from '../../../../lib/supabase-admin';
import { sendVerificationEmail } from '../../../../lib/email';
import { getClientIP, ipRateCheck } from '../../../../lib/ip-rate-check';
import { getRole } from '../../../../lib/auth-role';

/**
 * POST /api/auth/resend-verification
 *
 * Re-sends the email-verification link to an unconfirmed student.
 * Uses admin.generateLink({ type:'magiclink' }) which also sets email_confirmed_at
 * when clicked — same end-result as a signup confirmation link.
 *
 * Body: { email }
 * Guards: only works for role=student + email_confirmed_at=null accounts.
 * Always returns 200 for non-student / non-existent emails to avoid enumeration.
 */
export async function POST(req) {
  try {
    const ip = getClientIP(req);
    if (!await ipRateCheck(ip, 'rl:resend-verify', 3, 5)) {
      return NextResponse.json(
        { error: 'عدد الطلبات تجاوز الحد المسموح. يرجى المحاولة بعد دقيقة.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const { email } = await req.json();
    if (!email?.trim()) return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 });

    const admin      = createAdminClient();
    const lowerEmail = email.trim().toLowerCase();

    // Find the user and verify it's an unconfirmed student
    let target;
    try {
      const all = await fetchAllUsers(admin);
      target = all.find(u => u.email === lowerEmail);
    } catch (e) {
      console.error('[resend-verification] fetchAllUsers error:', e.message);
      return NextResponse.json({ error: 'تعذّر الاتصال بالخادم — يرجى المحاولة مجدداً' }, { status: 500 });
    }

    // Silent success for non-existent emails (don't reveal whether account exists)
    if (!target) return NextResponse.json({ ok: true });

    // Only resend for unconfirmed students — silently ignore others
    if (getRole(target) !== 'student' || !!target.email_confirmed_at) {
      return NextResponse.json({ ok: true });
    }

    // Build redirect URL
    const host       = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'www.aarem.net';
    const proto      = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
    const redirectTo = `${proto}://${host}/auth/callback?for=student`;

    // Generate a magic link — clicking it confirms the email AND creates a session
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type:  'magiclink',
      email: lowerEmail,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[resend-verification] generateLink error:', linkError?.message);
      return NextResponse.json({ error: 'تعذّر إعادة إرسال البريد — يرجى المحاولة مجدداً' }, { status: 500 });
    }

    const name        = target.user_metadata?.full_name ?? '';
    const hashedToken = linkData.properties.hashed_token;
    const confirmUrl  = `${proto}://${host}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`;

    await sendVerificationEmail({ to: lowerEmail, name, link: confirmUrl });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[resend-verification] unexpected error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
