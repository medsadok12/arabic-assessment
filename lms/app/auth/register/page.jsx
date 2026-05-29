'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'teacher' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    if (form.password.length < 6)       { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: { full_name: form.name, role: form.role },
        emailRedirectTo: 'https://aarem-lms.vercel.app/auth/callback',
      },
    });
    if (error) {
      setError(error.message === 'User already registered' ? 'هذا البريد مسجل مسبقاً' : error.message);
      setLoading(false);
      return;
    }
    setError('');
    setLoading(false);
    alert('تم إنشاء الحساب! تحقق من بريدك الإلكتروني واضغط على رابط التأكيد.');
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">📚</span>
          <h1>أكاديمية عارم</h1>
          <p>إنشاء حساب جديد</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">الاسم الكامل</label>
            <input className="form-input" type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="محمد الغندوزي" required />
          </div>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="example@email.com" required dir="ltr" />
          </div>
          <div className="form-group">
            <label className="form-label">الدور</label>
            <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="teacher">معلم</option>
              <option value="admin">مدير أكاديمية</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">كلمة المرور</label>
            <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="6 أحرف على الأقل" required dir="ltr" />
          </div>
          <div className="form-group">
            <label className="form-label">تأكيد كلمة المرور</label>
            <input className="form-input" type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="أعد كتابة كلمة المرور" required dir="ltr" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? <span className="spinner" /> : 'إنشاء الحساب ←'}
          </button>
        </form>
        <p className="auth-footer">
          لديك حساب بالفعل؟ <Link href="/auth/login">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
}
