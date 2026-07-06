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

    // ── Step 2: create account + send verification email ─────────────────────
    // generateLink(type:'signup') creates the user UNCONFIRMED and sends the
    // verification email via Supabase's configured mailer in one atomic call.
    // The user can only access protected routes after clicking the link.
    const host       = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'www.aarem.net';
    const proto      = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
    const redirectTo = `${proto}://${host}/auth/callback?for=student`;

    const { data: linkData, error: createErr } = await admin.auth.admin.generateLink({
      type:     'signup',
      email:    lowerEmail,
      password,
      options:  {
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

    if (createErr) {
      const msg = createErr.message ?? '';
      if (
        msg.includes('already registered') ||
        msg.includes('already been registered') ||
        msg.includes('already confirmed') ||
        msg.includes('email address is already registered')
      ) {
        return NextResponse.json({ error: 'هذا البريد مسجل مسبقاً — استخدم صفحة تسجيل الدخول' }, { status: 409 });
      }
      console.error('[register] generateLink error:', msg);
      return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الحساب — يرجى المحاولة مجدداً أو التواصل مع إدارة الأكاديمية' }, { status: 500 });
    }

    const userId = linkData?.user?.id;

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
