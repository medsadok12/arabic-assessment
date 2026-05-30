'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'teacher', code: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    if (form.password.length < 6)       { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (!form.code.trim())              { setError('يرجى إدخال كود الأكاديمية'); return; }

    setLoading(true);
    const supabase = createClient();

    // التحقق من كود الأكاديمية
    const { data: codeData } = await supabase
      .from('academy_codes')
      .select('id')
      .eq('code', form.code.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!codeData) {
      setError('كود الأكاديمية غير صحيح أو غير مفعّل — تواصل مع إدارة الأكاديمية للحصول على الكود');
      setLoading(false);
      return;
    }

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
          <div className="form-group">
            <label className="form-label">
              كود الأكاديمية <span style={{ color: '#e53935', fontSize: '0.85em' }}>*</span>
            </label>
            <input
              className="form-input"
              type="text"
              value={form.code}
              onChange={e => set('code', e.target.value)}
              placeholder="أدخل كود الأكاديمية"
              required
              dir="ltr"
              style={{ letterSpacing: 2, textTransform: 'uppercase' }}
            />
            <p style={{ fontSize: '.8rem', color: '#888', marginTop: 4 }}>
              يُوفَّر الكود من إدارة أكاديمية عارم
            </p>
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
