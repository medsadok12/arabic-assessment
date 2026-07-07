import { NextResponse }       from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { sendVerificationEmail } from '../../../../lib/email';

/**
 * POST /api/auth/register
 *
 * Atomic student self-registration with email verification:
 *   1. Validate academy code (read-only) — fail fast, no account created
 *   2. Create user via admin.generateLink({ type:'signup' }) — always unconfirmed
 *      regardless of Supabase project autoconfirm setting
 *   3. Consume academy code atomically — if race-condition, delete user and fail
 *   4. Send verification email via Resend (not Supabase SMTP)
 *      — if send fails, rollback user + code
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

    // ── Step 2: create user + generate verification link ─────────────────────
    // generateLink({ type:'signup' }) always creates the user as UNCONFIRMED,
    // bypassing the project-level autoconfirm setting. This is the only reliable
    // way to get an action_link when Supabase autoconfirm is ON.
    const host       = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'www.aarem.net';
    const proto      = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
    const redirectTo = `${proto}://${host}/auth/callback?for=student`;

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type:  'signup',
      email: lowerEmail,
      password,
      options: {
        data: {
          full_name:           name.trim(),
          role:                'student',
          age:                 age.toString().trim(),
          grade:               grade || null,
          onboarding_complete: true,
        },
        redirectTo,
      },
    });

    if (linkError) {
      const msg = linkError.message ?? '';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        return NextResponse.json({ error: 'هذا البريد مسجل مسبقاً — استخدم صفحة تسجيل الدخول' }, { status: 409 });
      }
      console.error('[register] generateLink error:', msg);
      return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الحساب — يرجى المحاولة مجدداً أو التواصل مع إدارة الأكاديمية' }, { status: 500 });
    }

    const userId     = linkData?.user?.id;
    const actionLink = linkData?.properties?.action_link;

    if (!userId || !actionLink) {
      return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الحساب — يرجى المحاولة مجدداً' }, { status: 500 });
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
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'كود الأكاديمية غير صحيح أو غير مفعّل — تواصل مع إدارة الأكاديمية' },
        { status: 400 }
      );
    }

    // ── Step 4: send verification email via Resend ────────────────────────────
    try {
      await sendVerificationEmail({ to: lowerEmail, name: name.trim(), link: actionLink });
    } catch (emailErr) {
      console.error('[register] sendVerificationEmail failed:', emailErr.message);
      // Rollback: delete user + free the invitation code so student can retry
      await admin.auth.admin.deleteUser(userId);
      await admin
        .from('student_invitation_codes')
        .update({ is_used: false, used_at: null, used_by_name: null, used_by_email: null })
        .eq('code', normalized);
      return NextResponse.json(
        { error: 'تعذّر إرسال بريد التحقق — يرجى المحاولة مجدداً أو التواصل مع إدارة الأكاديمية' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
