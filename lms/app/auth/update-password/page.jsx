'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/update-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'forced', newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'حدث خطأ، يرجى المحاولة مجدداً');
        setLoading(false);
        return;
      }

      // Refresh session so middleware sees cleared temp_password
      const { createClient } = await import('../../../lib/supabase');
      await createClient().auth.refreshSession();

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('حدث خطأ في الاتصال، يرجى المحاولة مجدداً');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4EFE6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Header */}
        <div style={{
          background: '#1A2B4A', borderRadius: '18px 18px 0 0',
          padding: '32px 28px 28px', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#E8B84B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', margin: '0 auto 14px',
          }}>🔐</div>
          <h1 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
            إنشاء كلمة مرور جديدة
          </h1>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '.85rem', margin: '8px 0 0' }}>
            لحماية حسابك، يجب تغيير كلمة المرور المؤقتة قبل المتابعة
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: '0 0 18px 18px',
          boxShadow: '0 16px 40px rgba(26,43,74,.18)',
          padding: '28px 24px 24px',
        }}>
          {/* Info banner */}
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
            padding: '10px 14px', marginBottom: 20, fontSize: '.82rem', color: '#92400e',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span style={{ flexShrink: 0 }}>🔑</span>
            <span>تم إنشاء حسابك بكلمة مرور مؤقتة من قِبل الإدارة. يرجى اختيار كلمة مرور خاصة بك الآن.</span>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">كلمة المرور الجديدة</label>
              <input
                className="form-input"
                type="password"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError(''); }}
                placeholder="8 أحرف على الأقل"
                required
                dir="ltr"
                autoComplete="new-password"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">تأكيد كلمة المرور</label>
              <input
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="أعد كتابة كلمة المرور"
                required
                dir="ltr"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            {/* Password strength hint */}
            {newPassword.length > 0 && (
              <div style={{
                marginTop: -8, marginBottom: 16, fontSize: '.78rem',
                color: newPassword.length >= 8 ? '#15803d' : '#b45309',
              }}>
                {newPassword.length >= 8 ? '✓ طول جيد' : `${8 - newPassword.length} أحرف إضافية مطلوبة`}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'حفظ كلمة المرور والمتابعة ←'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
