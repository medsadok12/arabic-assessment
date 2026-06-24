'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (err) {
      setError('حدث خطأ، تأكد من البريد الإلكتروني وأعد المحاولة');
    } else {
      setSent(true);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🔑</span>
          <h1>أكاديمية عارم</h1>
        </div>
        <h2 className="auth-title">نسيت كلمة المرور؟</h2>

        {sent ? (
          <div>
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              ✅ تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني
            </div>
            <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 20, fontSize: '.93rem' }}>
              تحقق من بريدك الإلكتروني واضغط على الرابط لإعادة تعيين كلمة المرور
            </p>
            <Link href="/auth/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center' }}>
              العودة لتسجيل الدخول
            </Link>
          </div>
        ) : (
          <>
            <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 20, fontSize: '.93rem' }}>
              أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
            </p>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

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
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }}
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : 'إرسال رابط إعادة التعيين ←'}
              </button>
            </form>

            <p className="auth-footer">
              <Link href="/auth/login">العودة لتسجيل الدخول</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
