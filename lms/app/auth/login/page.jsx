'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase';
import { useLanguage } from '../../../contexts/LanguageContext';

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

function LoginForm() {
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

  /* ── map URL error codes to Arabic messages ── */
  const urlErrorMsg =
    urlError === 'students_blocked'    ? t('login.studentBlocked')
    : urlError === 'teachers_blocked'  ? t('login.teacherBlocked')
    : urlError === 'confirmation_failed' ? 'فشل تسجيل الدخول، يرجى المحاولة مجدداً.'
    : null;

  /* ── Email/password login ── */
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(t('login.wrongCredentials'));
      setLoading(false);
      return;
    }

    const role          = user?.user_metadata?.role;
    const isTeacherRole = ['teacher', 'admin', 'super_admin', 'supervisor'].includes(role);

    if (forTeacher && !isTeacherRole) {
      await supabase.auth.signOut();
      setError(t('login.studentBlocked'));
      setLoading(false);
      return;
    }

    if (!forTeacher && isTeacherRole) {
      await supabase.auth.signOut();
      setError(t('login.teacherBlocked'));
      setLoading(false);
      return;
    }

    router.push(
      role === 'admin' || role === 'super_admin' ? '/bogga'
      : role === 'teacher'                        ? '/teacher'
      : role === 'supervisor'                     ? '/supervisor'
      : '/dashboard'
    );
    router.refresh();
  }

  /* ── Google OAuth login ── */
  async function handleGoogleLogin() {
    setGLoading(true);
    setError('');
    const supabase = createClient();

    const callbackUrl = `${window.location.origin}/auth/callback?for=${forTeacher ? 'teacher' : 'student'}`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (oauthError) {
      setError('تعذّر فتح نافذة جوجل. يرجى المحاولة مجدداً.');
      setGLoading(false);
    }
    // On success the browser navigates away — no need to reset gLoading
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">{forTeacher ? '👨‍🏫' : '📚'}</span>
          <h1>{t('siteName')}</h1>
        </div>
        <h2 className="auth-title">{forTeacher ? t('login.teacherLogin') : t('login.studentLogin')}</h2>

        {(error || urlErrorMsg) && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {error || urlErrorMsg}
          </div>
        )}

        {/* ── Google Sign-In Button ── */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={gLoading || loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            padding: '11px 16px',
            marginBottom: 18,
            background: '#fff',
            border: '1.5px solid #dadce0',
            borderRadius: 10,
            cursor: gLoading ? 'wait' : 'pointer',
            fontSize: '1rem',
            fontFamily: 'Cairo, Tajawal, sans-serif',
            fontWeight: 600,
            color: '#3c4043',
            boxShadow: '0 1px 3px rgba(0,0,0,.08)',
            transition: 'box-shadow .15s, border-color .15s',
            outline: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.18)'; e.currentTarget.style.borderColor = '#c0c0c0'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = '#dadce0'; }}
        >
          {gLoading
            ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            : <GoogleLogo />
          }
          <span>{gLoading ? 'جارٍ التحويل...' : 'تسجيل الدخول بواسطة Google'}</span>
        </button>

        {/* ── Divider ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 18, color: '#9CA3AF', fontSize: '.85rem',
        }}>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
          <span>أو بالبريد الإلكتروني</span>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
        </div>

        {/* ── Email/Password Form ── */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('login.email')}</label>
            <input className="form-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com" required dir="ltr" />
          </div>
          <div className="form-group">
            <label className="form-label">{t('login.password')}</label>
            <input className="form-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required dir="ltr" />
          </div>
          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }} disabled={loading || gLoading}>
            {loading ? <span className="spinner" /> : t('login.signIn')}
          </button>
        </form>

        <p className="auth-footer">
          {forTeacher
            ? <>{t('login.newTeacher')} <Link href="/auth/register/teacher">{t('login.createTeacher')}</Link></>
            : <>{t('login.noAccount')} <Link href="/auth/register">{t('login.createAccount')}</Link></>
          }
        </p>
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
