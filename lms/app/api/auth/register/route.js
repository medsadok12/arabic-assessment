import { NextResponse }       from 'next/server';
import { createClient }       from '@supabase/supabase-js';
import { createAdminClient } from '../../../../lib/supabase-admin';

/**
 * POST /api/auth/register
 *
 * Atomic student self-registration with email verification:
 *   1. Validate academy code (read-only) — fail fast, no account created
 *   2. Create user + send verification email via public signUp() (guaranteed to send mail)
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

    // ── Step 2: create user + send verification email ─────────────────────────
    // We use the public anon-key signUp() — it creates the user AND automatically
    // sends the confirmation email in one atomic call. The admin createUser API
    // does NOT send the email; the separate /auth/v1/resend endpoint is unreliable
    // server-side. signUp() is the only guaranteed path to email delivery.
    const host       = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'www.aarem.net';
    const proto      = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
    const redirectTo = `${proto}://${host}/auth/callback?for=student`;

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: signupData, error: signupError } = await anonClient.auth.signUp({
      email:    lowerEmail,
      password,
      options: {
        data: {
          full_name:           name.trim(),
          role:                'student',
          age:                 age.toString().trim(),
          grade:               grade || null,
          onboarding_complete: true,
        },
        emailRedirectTo: redirectTo,
      },
    });

    if (signupError) {
      const msg = signupError.message ?? '';
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        return NextResponse.json({ error: 'هذا البريد مسجل مسبقاً — استخدم صفحة تسجيل الدخول' }, { status: 409 });
      }
      console.error('[register] signUp error:', msg);
      return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الحساب — يرجى المحاولة مجدداً أو التواصل مع إدارة الأكاديمية' }, { status: 500 });
    }

    const userId    = signupData?.user?.id;
    const identities = signupData?.user?.identities ?? [];

    // Supabase returns an empty identities array (no error) when the email is
    // already confirmed — to avoid leaking whether an email is registered.
    if (!userId) {
      return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الحساب — يرجى المحاولة مجدداً' }, { status: 500 });
    }
    if (identities.length === 0) {
      return NextResponse.json({ error: 'هذا البريد مسجل مسبقاً — استخدم صفحة تسجيل الدخول' }, { status: 409 });
    }

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
