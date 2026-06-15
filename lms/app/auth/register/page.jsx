'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase';

export default function RegisterPage() {
  const [form, setForm]     = useState({ name: '', email: '', password: '', confirm: '', code: '', grade: '' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); setError(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    if (form.password.length < 6)       { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (!form.code.trim())              { setError('يرجى إدخال كود الأكاديمية'); return; }

    setLoading(true);
    const supabase = createClient();

    // ── الخطوة 1: إنشاء الحساب أولاً ──
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: { full_name: form.name, role: 'student', grade: form.grade || null },
        emailRedirectTo: 'https://www.aarem.net/auth/callback',
      },
    });

    if (signUpError) {
      setError(signUpError.message === 'User already registered'
        ? 'هذا البريد مسجل مسبقاً — استخدم صفحة تسجيل الدخول'
        : signUpError.message);
      setLoading(false);
      return;
    }

    // حالة: البريد موجود مسبقاً (email confirmation مفعّل)
    if (signUpData?.user?.identities?.length === 0) {
      setError('هذا البريد مسجل مسبقاً — استخدم صفحة تسجيل الدخول');
      setLoading(false);
      return;
    }

    // حالة: البريد موجود مسبقاً بدور آخر (معلم / مدير) — email confirmation معطّل
    const existingRole = signUpData?.user?.user_metadata?.role;
    if (existingRole && existingRole !== 'student') {
      await supabase.auth.signOut();
      setError('هذا البريد مسجل بدور آخر — استخدم صفحة تسجيل الدخول');
      setLoading(false);
      return;
    }

    // ── الخطوة 2: التحقق من الكود (فقط بعد التأكد من الحساب جديد) ──
    const res  = await fetch('/api/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: form.code, name: form.name }),
    });
    const { valid } = await res.json();

    if (!valid) {
      // الكود غير صالح — نحذف الجلسة (الحساب ينتظر التأكيد بدون كود)
      await supabase.auth.signOut();
      setError('كود الأكاديمية غير صحيح أو غير مفعّل — تواصل مع إدارة الأكاديمية');
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess('تم إنشاء حسابك! تحقق من بريدك الإلكتروني واضغط على رابط التأكيد.');
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">📚</span>
          <h1>أكاديمية عارم</h1>
          <p>إنشاء حساب طالب جديد</p>
        </div>

        {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">الاسم الكامل</label>
              <input className="form-input" type="text" value={form.name}
                onChange={e => set('name', e.target.value)} placeholder="أدخل الاسم الكامل" required />
            </div>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => set('email', e.target.value)} placeholder="example@email.com" required dir="ltr" />
            </div>
            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <input className="form-input" type="password" value={form.password}
                onChange={e => set('password', e.target.value)} placeholder="6 أحرف على الأقل" required dir="ltr" />
            </div>
            <div className="form-group">
              <label className="form-label">تأكيد كلمة المرور</label>
              <input className="form-input" type="password" value={form.confirm}
                onChange={e => set('confirm', e.target.value)} placeholder="أعد كتابة كلمة المرور" required dir="ltr" />
            </div>
            <div className="form-group">
              <label className="form-label">
                كود الأكاديمية <span style={{ color: '#e53935', fontSize: '0.85em' }}>*</span>
              </label>
              <input className="form-input" type="text" value={form.code}
                onChange={e => set('code', e.target.value)}
                placeholder="أدخل كود الأكاديمية" required dir="ltr"
                style={{ letterSpacing: 2, textTransform: 'uppercase' }} />
              <p style={{ fontSize: '.8rem', color: '#888', marginTop: 4 }}>
                يُوفَّر الكود من إدارة أكاديمية عارم —{' '}
                <a href="https://api.whatsapp.com/send/?phone=447400755914"
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: '#1a7c40', fontWeight: 700 }}>تواصل معنا</a>
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">الصف الدراسي</label>
              <select className="form-input" value={form.grade} onChange={e => set('grade', e.target.value)}>
                <option value="">اختر الصف (اختياري)</option>
                {[1,2,3,4,5,6,7].map(g => (
                  <option key={g} value={g}>الصف {g}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'إنشاء الحساب ←'}
            </button>
          </form>
        )}

        {success && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <Link href="/auth/login" className="btn btn-primary" style={{ display: 'inline-block', marginTop: 8 }}>
              تسجيل الدخول ←
            </Link>
          </div>
        )}

        <p className="auth-footer">
          لديك حساب بالفعل؟ <Link href="/auth/login">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
}
