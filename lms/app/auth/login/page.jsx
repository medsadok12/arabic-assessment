'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase';

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      setLoading(false);
      return;
    }
    const role = user?.user_metadata?.role;
    router.push(role === 'admin' || role === 'super_admin' ? '/bogga' : '/dashboard');
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">📚</span>
          <h1>أكاديمية عارم</h1>
        </div>
        <h2 className="auth-title">تسجيل الدخول</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              dir="ltr"
            />
          </div>
          <div className="form-group">
            <label className="form-label">كلمة المرور</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              dir="ltr"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? <span className="spinner" /> : 'دخول ←'}
          </button>
        </form>
        <p className="auth-footer">
          ليس لديك حساب؟ <Link href="/auth/register">إنشاء حساب جديد</Link>
        </p>
      </div>
    </div>
  );
}
