import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';

function destForRole(role) {
  if (role === 'super_admin' || role === 'admin') return '/bogga';
  if (role === 'teacher')    return '/teacher';
  if (role === 'supervisor') return '/supervisor';
  return '/dashboard';
}

const STAFF_ROLES = new Set(['teacher', 'admin', 'super_admin', 'supervisor']);

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code   = searchParams.get('code');
  const forCtx = searchParams.get('for');   // 'teacher' | 'student' | null
  const next   = searchParams.get('next');  // e.g. '/auth/reset-password'

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll()      { return cookieStore.getAll(); },
          setAll(toSet) {
            try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
            catch {}
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // ── إعادة تعيين كلمة المرور ──
      if (next && next.startsWith('/')) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const role         = user.user_metadata?.role;
      const isStaff      = STAFF_ROLES.has(role);
      const isTeacherCtx = forCtx === 'teacher';

      // ── المستخدم لديه دور معروف ── (مسجّل مسبقاً)
      if (role) {
        // طالب يحاول الدخول لبوابة المعلم
        if (isTeacherCtx && !isStaff) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/auth/login?for=teacher&error=students_blocked`);
        }
        // معلم/مشرف يحاول الدخول لبوابة الطالب
        if (!isTeacherCtx && isStaff && !next) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/auth/login?error=teachers_blocked`);
        }
        return NextResponse.redirect(`${origin}${destForRole(role)}`);
      }

      // ── المستخدم بدون دور (حساب Google جديد) ──
      // تحقق أولاً إن كان مسجّلاً بنفس الإيميل عبر طريقة أخرى
      try {
        const admin = createAdminClient();
        const { data: { users: all } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = all.find(u =>
          u.email === user.email &&
          u.id    !== user.id   &&
          u.user_metadata?.role
        );

        if (existing) {
          const existingRole  = existing.user_metadata.role;
          const existingStaff = STAFF_ROLES.has(existingRole);

          // تحقق من تطابق السياق
          if (isTeacherCtx && !existingStaff) {
            await supabase.auth.signOut();
            return NextResponse.redirect(`${origin}/auth/login?for=teacher&error=students_blocked`);
          }
          if (!isTeacherCtx && existingStaff && !next) {
            await supabase.auth.signOut();
            return NextResponse.redirect(`${origin}/auth/login?error=teachers_blocked`);
          }

          // انقل الدور لحساب Google الجديد
          await admin.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              role:      existingRole,
              full_name: existing.user_metadata.full_name ?? user.user_metadata?.full_name,
            },
          });
          return NextResponse.redirect(`${origin}${destForRole(existingRole)}`);
        }
      } catch (_) {}

      // مستخدم جديد كلياً غير مسجّل في المنصة
      if (isTeacherCtx) {
        // المعلمون لا يُسجَّلون بأنفسهم — يُضافون من الإدارة
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/auth/login?for=teacher&error=not_registered`);
      }

      // طالب جديد → يحتاج كود الأكاديمية
      return NextResponse.redirect(`${origin}/auth/google-code`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`);
}
