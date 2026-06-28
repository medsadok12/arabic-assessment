'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase';

export default function GoogleCodePage() {
  const [code,    setCode]    = useState('');
  const [name,    setName]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) { setError('يرجى إدخال كود الأكاديمية'); return; }

    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/complete-google', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code: code.trim(), name: name.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'حدث خطأ — حاول مجدداً');
      setLoading(false);
      return;
    }

    // تحديث الجلسة لتعكس الدور الجديد
    const supabase = createClient();
    await supabase.auth.refreshSession();

    router.replace('/dashboard');
  }

  async function handleCancel() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/auth/login');
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">📚</span>
          <h1>أكاديمية عارم</h1>
        </div>

        <h2 className="auth-title">أدخل كود الأكاديمية</h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.88rem', marginBottom: 22 }}>
          تسجيلك عبر Google ناجح! يرجى إدخال الكود الذي حصلت عليه من الأكاديمية للمتابعة.
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">الاسم الكامل</label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="اسمك الكامل (اختياري)"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">كود الأكاديمية <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              className="form-input"
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              placeholder="مثال: AAREM-XXXX"
              dir="ltr"
              required
              disabled={loading}
              style={{ letterSpacing: '.08em', fontWeight: 700, textAlign: 'center' }}
            />
          </div>

          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? <span className="spinner" /> : 'تأكيد والدخول ←'}
          </button>
        </form>

        <button onClick={handleCancel}
          style={{ width: '100%', marginTop: 12, background: 'none', border: 'none',
            color: 'var(--muted)', fontSize: '.82rem', cursor: 'pointer', padding: 8 }}>
          إلغاء وتسجيل الخروج
        </button>
      </div>
    </div>
  );
}
