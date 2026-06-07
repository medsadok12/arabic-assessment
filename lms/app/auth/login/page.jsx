'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase';
import { useLanguage } from '../../../contexts/LanguageContext';

function LoginForm() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const forTeacher   = searchParams.get('for') === 'teacher';
  const { t } = useLanguage();

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
    const isTeacherRole = role === 'teacher' || role === 'admin' || role === 'super_admin';

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
      : '/dashboard'
    );
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">{forTeacher ? '👨‍🏫' : '📚'}</span>
          <h1>{t('siteName')}</h1>
        </div>
        <h2 className="auth-title">{forTeacher ? t('login.teacherLogin') : t('login.studentLogin')}</h2>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

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
            style={{ width: '100%', marginTop: 8 }} disabled={loading}>
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
