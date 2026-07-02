'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState('student');
  const [form, setForm] = useState({ name: '', age: '', email: '', password: '', confirm: '', code: '', teacherCode: '' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); setError(''); }
  function switchTab(type) { setAccountType(type); setError(''); setSuccess(''); }

  async function handleStudentSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.age)                        { setError('من فضلك اكتب عمرك 🌟'); return; }
    if (+form.age < 4 || +form.age > 20) { setError('العمر يجب أن يكون بين 4 و 20 سنة 😊'); return; }
    if (form.password !== form.confirm)   { setError('كلمتا المرور غير متطابقتين'); return; }
    if (form.password.length < 6)        { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (!form.code.trim())               { setError('يرجى إدخال كود الأكاديمية'); return; }

    setLoading(true);
    const res  = await fetch('/api/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: form.code }),
    });
    const { valid } = await res.json();
    if (!valid) {
      setError('كود الأكاديمية غير صحيح أو غير مفعّل — تواصل مع إدارة الأكاديمية');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: { full_name: form.name, role: 'student', age: +form.age },
        emailRedirectTo: 'https://aarem-lms.vercel.app/auth/callback',
      },
    });

    if (error) {
      setError(error.message === 'User already registered' ? 'هذا البريد مسجل مسبقاً' : error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess('تم إنشاء حسابك! تحقق من بريدك الإلكتروني واضغط على رابط التأكيد.');
  }

  async function handleTeacherSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    if (form.password.length < 6)       { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (!form.teacherCode.trim())       { setError('يرجى إدخال كود تفعيل المعلم'); return; }

    setLoading(true);
    const res = await fetch('/api/register-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:           form.name,
        email:          form.email,
        password:       form.password,
        invitationCode: form.teacherCode,
      }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      setError(data.error || 'حدث خطأ، حاول مجدداً');
      setLoading(false);
      return;
    }

    // Auto-login: account is already confirmed
    const supabase = createClient();
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email:    form.email,
      password: form.password,
    });

    setLoading(false);
    if (loginErr) {
      setSuccess('تم إنشاء حساب المعلم بنجاح! يمكنك الآن تسجيل الدخول.');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">📚</span>
          <h1>أكاديمية عارم</h1>
          <p>إنشاء حساب جديد</p>
        </div>

        {/* ── نوع الحساب ── */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${accountType === 'student' ? 'active' : ''}`}
            onClick={() => switchTab('student')}
          >
            👤 حساب طالب
          </button>
          <button
            type="button"
            className={`auth-tab ${accountType === 'teacher' ? 'active' : ''}`}
            onClick={() => switchTab('teacher')}
          >
            👨‍🏫 حساب معلم
          </button>
        </div>

        {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

        {/* ── نموذج الطالب ── */}
        {accountType === 'student' && !success && (
          <form onSubmit={handleStudentSubmit}>
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
              <label className="form-label">العمر</label>
              <input
                className="form-input"
                type="number"
                value={form.age}
                onChange={e => set('age', e.target.value)}
                placeholder="اكتب عمرك"
                min="4"
                max="20"
                required
              />
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
        )}

        {/* ── نموذج المعلم ── */}
        {accountType === 'teacher' && !success && (
          <form onSubmit={handleTeacherSubmit}>
            <div className="form-group">
              <label className="form-label">الاسم الكامل</label>
              <input className="form-input" type="text" value={form.name}
                onChange={e => set('name', e.target.value)} placeholder="أدخل اسمك الكامل" required />
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
                🔑 كود تفعيل المعلم <span style={{ color: '#e53935', fontSize: '0.85em' }}>*</span>
              </label>
              <input
                className="form-input"
                type="text"
                value={form.teacherCode}
                onChange={e => set('teacherCode', e.target.value)}
                placeholder="أدخل كود الدعوة"
                required
                dir="ltr"
                style={{ letterSpacing: 3, textTransform: 'uppercase' }}
              />
              <p style={{ fontSize: '.8rem', color: '#888', marginTop: 4 }}>
                🔒 كل كود صالح للاستخدام مرة واحدة — اطلبه من مدير الأكاديمية
              </p>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'إنشاء حساب المعلم ←'}
            </button>
          </form>
        )}

        {success && accountType === 'student' && (
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
