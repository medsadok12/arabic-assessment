'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase';

function LoginForm() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const forTeacher   = searchParams.get('for') === 'teacher';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      setLoading(false);
      return;
    }

    const role          = user?.user_metadata?.role;
    const isTeacherRole = role === 'teacher' || role === 'admin' || role === 'super_admin';

    // Teacher entry point — block students
    if (forTeacher && !isTeacherRole) {
      await supabase.auth.signOut();
      setError('هذا البريد مسجل كطالب — استخدم خانة "دخول الطالب" في الشريط الجانبي');
      setLoading(false);
      return;
    }

    // Student entry point — block teachers/admins
    if (!forTeacher && isTeacherRole) {
      await supabase.auth.signOut();
      setError('هذا البريد مسجل كمعلم — استخدم خانة "دخول المعلم 🔑" أسفل الصفحة الرئيسية');
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
          <h1>أكاديمية عارم</h1>
        </div>
        <h2 className="auth-title">{forTeacher ? 'دخول المعلم' : 'دخول الطالب'}</h2>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input className="form-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com" required dir="ltr" />
          </div>
          <div className="form-group">
            <label className="form-label">كلمة المرور</label>
            <input className="form-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required dir="ltr" />
          </div>
          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? <span className="spinner" /> : 'دخول ←'}
          </button>
        </form>

        <p className="auth-footer">
          {forTeacher
            ? <>معلم جديد؟ <Link href="/auth/register/teacher">إنشاء حساب معلم</Link></>
            : <>ليس لديك حساب؟ <Link href="/auth/register">إنشاء حساب جديد</Link></>
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
