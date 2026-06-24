'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [ready,    setReady]    = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    if (password.length < 6)  { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError('حدث خطأ، يرجى المحاولة مجدداً أو طلب رابط جديد');
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    }
  }

  if (!ready) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <span className="spinner" style={{ margin: '0 auto 16px', display: 'block', width: 36, height: 36, borderWidth: 3 }} />
          <p style={{ color: 'var(--muted)' }}>جارٍ التحقق من الرابط...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🔒</span>
          <h1>أكاديمية عارم</h1>
        </div>
        <h2 className="auth-title">إعادة تعيين كلمة المرور</h2>

        {success ? (
          <div className="alert alert-success" style={{ marginTop: 8 }}>
            ✅ تم تغيير كلمة المرور بنجاح! جارٍ تحويلك لتسجيل الدخول...
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">كلمة المرور الجديدة</label>
                <input
                  className="form-input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل" required dir="ltr" disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">تأكيد كلمة المرور</label>
                <input
                  className="form-input" type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور" required dir="ltr" disabled={loading}
                />
              </div>
              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }} disabled={loading}>
                {loading ? <span className="spinner" /> : 'حفظ كلمة المرور الجديدة ←'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
