'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase';

export default function GoogleCodePage() {
  const [code,    setCode]    = useState('');
  const [name,    setName]    = useState('');
  const [age,     setAge]     = useState('');
  const [grade,   setGrade]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!code.trim()) { setError('يرجى إدخال كود الأكاديمية'); return; }
    if (!age.trim())  { setError('يرجى إدخال عمر الطالب');     return; }

    setLoading(true);

    const res = await fetch('/api/auth/complete-google', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code: code.trim(), name: name.trim(), age: age.trim(), grade: grade || null }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'حدث خطأ — حاول مجدداً');
      setLoading(false);
      return;
    }

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

        <h2 className="auth-title">استكمال البيانات</h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.88rem', marginBottom: 22 }}>
          تسجيلك عبر Google ناجح! أدخل بياناتك أدناه للمتابعة.
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">الاسم الكامل</label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="اسمك الكامل (اختياري)"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              كود الأكاديمية <span style={{ color: '#dc2626' }}>*</span>
            </label>
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
            <p style={{ fontSize: '.8rem', color: '#888', marginTop: 4 }}>
              يُوفَّر الكود من إدارة أكاديمية عارم —{' '}
              <a href="https://api.whatsapp.com/send/?phone=447400755914"
                target="_blank" rel="noopener noreferrer"
                style={{ color: '#1a7c40', fontWeight: 700 }}>تواصل معنا</a>
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">
              عمر الطالب <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              value={age}
              onChange={e => { setAge(e.target.value); setError(''); }}
              placeholder="اكتب عمرك"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">الصف الدراسي</label>
            <select
              className="form-input"
              value={grade}
              onChange={e => setGrade(e.target.value)}
              disabled={loading}
            >
              <option value="">اختر الصف (اختياري)</option>
              {[1,2,3,4,5,6,7].map(g => (
                <option key={g} value={g}>الصف {g}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'تأكيد والدخول ←'}
          </button>
        </form>

        <button
          onClick={handleCancel}
          style={{
            width: '100%', marginTop: 12, background: 'none', border: 'none',
            color: 'var(--muted)', fontSize: '.82rem', cursor: 'pointer', padding: 8,
          }}
        >
          إلغاء وتسجيل الخروج
        </button>
      </div>
    </div>
  );
}
