'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getRole } from '../../../lib/auth-role';

/* ── icon input helper ── */
function IconInput({ icon, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', right: 12, top: '50%',
        transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none',
      }}>{icon}</span>
      {children}
    </div>
  );
}

/* ── Google SVG logo (official brand colours) ── */
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

/* ── Friendly error messages ── */
function resolveError(code, fallback) {
  const MAP = {
    students_blocked:     'هذا الحساب طالب — استخدم بوابة الطالب.',
    teachers_blocked:     'هذا حساب معلم/إداري — استخدم بوابة المعلم.',
    confirmation_failed:  'فشل تسجيل الدخول، يرجى المحاولة مجدداً.',
    network_error:        'تعذَّر الاتصال بالخادم — تحقق من الإنترنت وأعد المحاولة.',
    oauth_error:          'تعذَّر فتح نافذة جوجل — تأكد من أن المتصفح لا يحجب النوافذ المنبثقة.',
    invalid_credentials:  'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    not_registered:       'هذا الحساب غير مسجّل في المنصة — تواصل مع الإدارة لإضافتك.',
    suspended:            'حسابك معلَّق مؤقتاً — يرجى التواصل مع إدارة الأكاديمية.',
    unexpected:           'حدث خطأ غير متوقع — يرجى المحاولة مجدداً.',
  };
  return MAP[code] ?? fallback ?? MAP.unexpected;
}

function LoginForm() {
  const [view,     setView]     = useState('choose'); // 'choose' | 'login' | 'register'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);

  const router       = useRouter();
  const searchParams = useSearchParams();
  const forTeacher   = searchParams.get('for') === 'teacher';
  const urlError     = searchParams.get('error');
  const { t } = useLanguage();

  const urlErrorMsg = urlError ? resolveError(urlError) : null;

  /* ── Email/password login ── */
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        const msg = authError.message?.toLowerCase() ?? '';
        if (msg.includes('email not confirmed') || msg.includes('confirmation') || authError.code === 'email_not_confirmed') {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
          return;
        }
        setError(resolveError('invalid_credentials'));
        return;
      }

      const role          = getRole(user);
      const isTeacherRole = ['teacher', 'admin', 'super_admin', 'supervisor'].includes(role);

      if (forTeacher && !isTeacherRole) {
        await supabase.auth.signOut();
        setError(resolveError('students_blocked'));
        return;
      }

      if (!forTeacher && isTeacherRole) {
        await supabase.auth.signOut();
        setError(resolveError('teachers_blocked'));
        return;
      }

      router.push(
        role === 'admin' || role === 'super_admin' ? '/bogga'
        : role === 'teacher'                        ? '/teacher'
        : role === 'supervisor'                     ? '/supervisor'
        : '/dashboard'
      );
      router.refresh();

    } catch (err) {
      const isNetwork = !navigator.onLine || err?.message?.includes('fetch');
      setError(resolveError(isNetwork ? 'network_error' : 'unexpected'));
    } finally {
      setLoading(false);
    }
  }

  /* ── Google OAuth login ── */
  async function handleGoogleLogin() {
    setGLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const callbackUrl =
        `${window.location.origin}/auth/callback?for=${forTeacher ? 'teacher' : 'student'}`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });

      if (oauthError) {
        setError(resolveError('oauth_error'));
        setGLoading(false);
      }
    } catch (err) {
      const isNetwork = !navigator.onLine || err?.message?.includes('fetch');
      setError(resolveError(isNetwork ? 'network_error' : 'oauth_error'));
      setGLoading(false);
    }
  }

  useEffect(() => {
    function onPageShow(e) { if (e.persisted) { setGLoading(false); setLoading(false); } }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const anyLoading = loading || gLoading;
  const registerHref = forTeacher ? '/auth/register/teacher' : '/auth/register';

  /* ════════════════════════════════════
     RENDER
  ════════════════════════════════════ */
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* ── شريط الرأس الأزرق ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0d1f38 0%, #1A2B4A 100%)',
          padding: '26px 24px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46, height: 46, background: '#E8B84B',
              borderRadius: 13, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.4rem', fontWeight: 900, color: '#1A2B4A',
            }}>ع</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.08rem' }}>
                {t('siteName')}
              </div>
              <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '.78rem' }}>
                {forTeacher ? t('login.teacherLogin') : t('login.studentLogin')}
              </div>
            </div>
          </div>
        </div>

        {/* ════════ عرض الاختيار (الحالة الأولى) ════════ */}
        {view === 'choose' && (
          <div style={{ padding: '32px 24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {(urlErrorMsg) && (
              <div className="alert alert-error" style={{ marginBottom: 4 }}>{urlErrorMsg}</div>
            )}

            <p style={{
              textAlign: 'center', color: '#6b7280', fontSize: '.9rem', marginBottom: 6,
            }}>
              كيف تريد المتابعة؟
            </p>

            {/* زر: لدي حساب */}
            <button
              onClick={() => { setError(''); setView('login'); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', padding: '15px 20px',
                background: '#1A2B4A', color: '#fff',
                border: 'none', borderRadius: 14, cursor: 'pointer',
                fontSize: '1rem', fontFamily: 'inherit', fontWeight: 700,
                boxShadow: '0 4px 16px rgba(26,43,74,.25)',
                transition: 'transform .12s, box-shadow .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,43,74,.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,43,74,.25)'; }}
            >
              <span style={{ fontSize: '1.2rem' }}>🔑</span>
              <span>لدي حساب — دخول</span>
            </button>

            {/* زر: تسجيل جديد */}
            <Link
              href={registerHref}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', padding: '15px 20px',
                background: '#E8B84B', color: '#1A2B4A',
                border: 'none', borderRadius: 14, cursor: 'pointer',
                fontSize: '1rem', fontFamily: 'inherit', fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(232,184,75,.35)',
                transition: 'transform .12s, box-shadow .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(232,184,75,.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(232,184,75,.35)'; }}
            >
              <span style={{ fontSize: '1.2rem' }}>✨</span>
              <span>تسجيل جديد — إنشاء حساب</span>
            </Link>

            {/* رابط إصلاح الجلسة */}
            <p style={{ textAlign: 'center', marginTop: 4, fontSize: '.75rem', color: '#bbb' }}>
              هل تواجه مشكلة في الدخول؟{' '}
              <Link href="/auth/fix" style={{ color: '#bbb', textDecoration: 'underline' }}>اضغط هنا</Link>
            </p>
          </div>
        )}

        {/* ════════ نموذج الدخول (بعد الضغط على "لدي حساب") ════════ */}
        {view === 'login' && (
          <div style={{ padding: '20px 24px 24px' }}>

            {/* رجوع */}
            <button
              onClick={() => { setView('choose'); setError(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6b7280', fontSize: '.85rem', fontFamily: 'inherit',
                padding: '0 0 14px', marginBottom: 6,
              }}
            >
              ← رجوع
            </button>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
            )}

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={anyLoading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, width: '100%', padding: '11px 16px', marginBottom: 18,
                background: '#fff', border: '1.5px solid #dadce0', borderRadius: 10,
                cursor: gLoading ? 'wait' : anyLoading ? 'not-allowed' : 'pointer',
                fontSize: '1rem', fontFamily: 'inherit', fontWeight: 600, color: '#3c4043',
                boxShadow: '0 1px 3px rgba(0,0,0,.08)',
                transition: 'box-shadow .15s, border-color .15s',
                outline: 'none', WebkitTapHighlightColor: 'transparent',
                opacity: anyLoading && !gLoading ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!anyLoading) { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.18)'; e.currentTarget.style.borderColor = '#c0c0c0'; } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = '#dadce0'; }}
            >
              {gLoading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : <GoogleLogo />}
              <span>{gLoading ? 'جارٍ التحويل...' : 'تسجيل الدخول بواسطة Google'}</span>
            </button>

            {/* فاصل */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 18, color: '#9CA3AF', fontSize: '.85rem',
            }}>
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              <span>أو بالبريد الإلكتروني</span>
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            </div>

            {/* نموذج البريد وكلمة المرور */}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('login.email')}</label>
                <IconInput icon="📧">
                  <input className="form-input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@email.com" required dir="ltr"
                    disabled={anyLoading} style={{ paddingRight: 38 }} />
                </IconInput>
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>{t('login.password')}</label>
                  <Link href="/auth/forgot-password" style={{ fontSize: '.82rem', color: 'var(--accent)', textDecoration: 'none' }}>
                    نسيت كلمة المرور؟
                  </Link>
                </div>
                <IconInput icon="🔒">
                  <input className="form-input" type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required dir="ltr"
                    disabled={anyLoading} style={{ paddingRight: 38 }} />
                </IconInput>
              </div>
              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }} disabled={anyLoading}>
                {loading ? <span className="spinner" /> : t('login.signIn')}
              </button>
            </form>

            {/* رابط التسجيل */}
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: '.83rem', color: '#6b7280' }}>
              ليس لديك حساب؟{' '}
              <Link href={registerHref} style={{ color: '#1A2B4A', fontWeight: 700, textDecoration: 'none' }}>
                سجّل الآن
              </Link>
            </p>

            <p style={{ textAlign: 'center', marginTop: 8, fontSize: '.75rem', color: '#bbb' }}>
              هل تواجه مشكلة في الدخول؟{' '}
              <Link href="/auth/fix" style={{ color: '#bbb', textDecoration: 'underline' }}>اضغط هنا</Link>
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
