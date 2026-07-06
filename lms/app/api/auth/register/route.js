import { NextResponse }       from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';

/**
 * POST /api/auth/register
 *
 * Atomic student self-registration with email verification:
 *   1. Validate academy code (read-only) — fail fast, no account created
 *   2. Create user + send verification email via admin generateLink (email NOT pre-confirmed)
 *   3. Consume academy code atomically — if race-condition, delete user and fail
 *
 * Body: { name, email, password, code, age, grade? }
 * Response: { ok: true } — client must redirect to /auth/verify-email, NOT auto-login
 */
export async function POST(req) {
  try {
    const { name, email, password, code, age, grade } = await req.json();

    if (!name?.trim())           return NextResponse.json({ error: 'الاسم الكامل مطلوب' },                { status: 400 });
    if (!email?.trim())          return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' },            { status: 400 });
    if (!password || password.length < 6)
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    if (!code?.trim())           return NextResponse.json({ error: 'كود الأكاديمية مطلوب' },              { status: 400 });
    if (!age?.toString().trim()) return NextResponse.json({ error: 'عمر الطالب مطلوب' },                  { status: 400 });

    const admin      = createAdminClient();
    const normalized = code.trim().toUpperCase();
    const lowerEmail = email.trim().toLowerCase();

    // ── Step 1: validate code (read-only — no account created yet) ────────────
    const { data: codeRow } = await admin
      .from('student_invitation_codes')
      .select('id')
      .eq('code', normalized)
      .eq('is_used', false)
      .maybeSingle();

    if (!codeRow) {
      return NextResponse.json(
        { error: 'كود الأكاديمية غير صحيح أو غير مفعّل — تواصل مع إدارة الأكاديمية' },
        { status: 400 }
      );
    }

    // ── Step 2: create account (unconfirmed) ──────────────────────────────────
    // Use admin createUser WITHOUT email_confirm so the account is created but
    // the email is NOT confirmed yet. We then trigger the verification email via
    // Supabase's /auth/v1/resend endpoint (the public endpoint that actually
    // sends the mail — generateLink only returns the link without sending it).
    const host       = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'www.aarem.net';
    const proto      = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
    const redirectTo = `${proto}://${host}/auth/callback?for=student`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email:         lowerEmail,
      password,
      email_confirm: false,
      user_metadata: {
        full_name:           name.trim(),
        role:                'student',
        age:                 age.toString().trim(),
        grade:               grade || null,
        onboarding_complete: true,
      },
    });

    if (createErr) {
      const msg = createErr.message ?? '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        return NextResponse.json({ error: 'هذا البريد مسجل مسبقاً — استخدم صفحة تسجيل الدخول' }, { status: 409 });
      }
      console.error('[register] createUser error:', msg);
      return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الحساب — يرجى المحاولة مجدداً أو التواصل مع إدارة الأكاديمية' }, { status: 500 });
    }

    const userId = created?.user?.id;

    // ── Step 2b: trigger verification email via Supabase's resend endpoint ────
    // generateLink only RETURNS the link — it never sends it. The resend endpoint
    // is the correct mechanism to have Supabase mail the confirmation link.
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/resend`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        type:                 'signup',
        email:                lowerEmail,
        gotrue_meta_security: {},
        redirect_to:          redirectTo,
      }),
    }).catch(() => {
      // If the send fails (rate limit / SMTP error), the user can still
      // request a resend via the button on /auth/verify-email.
    });

    // ── Step 3: consume code atomically ──────────────────────────────────────
    const { data: consumed } = await admin
      .from('student_invitation_codes')
      .update({
        is_used:       true,
        used_at:       new Date().toISOString(),
        used_by_name:  name.trim(),
        used_by_email: lowerEmail,
      })
      .eq('code', normalized)
      .eq('is_used', false)
      .select('id')
      .maybeSingle();

    if (!consumed) {
      // Race condition: another request consumed this code between steps 1 and 3
      if (userId) await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'كود الأكاديمية غير صحيح أو غير مفعّل — تواصل مع إدارة الأكاديمية' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
