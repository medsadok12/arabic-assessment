'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../lib/supabase';

export default function TeacherRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', teacherCode: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); setError(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim())        { setError('يرجى إدخال الاسم الكامل'); return; }
    if (form.password !== form.confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    if (form.password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (!form.teacherCode.trim()) { setError('يرجى إدخال كود تفعيل المعلم'); return; }

    setLoading(true);

    const res = await fetch('/api/register-teacher', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:           form.name.trim(),
        email:          form.email.trim().toLowerCase(),
        password:       form.password,
        invitationCode: form.teacherCode,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      setError(data.error || 'حدث خطأ، يرجى المحاولة مجدداً');
      setLoading(false);
      return;
    }

    // تسجيل دخول مباشر بعد إنشاء الحساب
    // يُخزَّن في الكوكيز: { full_name, role: 'teacher' } فقط — لا صور ولا base64
    const supabase = createClient();
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email:    form.email.trim().toLowerCase(),
      password: form.password,
    });

    setLoading(false);

    if (loginErr) {
      // الحساب أُنشئ لكن تعذّر الدخول — وجّه لصفحة الدخول
      router.push('/auth/login?registered=teacher');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* ── الشعار ── */}
        <div className="auth-logo">
          <span className="logo-icon">📚</span>
          <h1>أكاديمية عارم</h1>
          <p>تسجيل حساب معلم</p>
        </div>

        {/* ── شارة التمييز ── */}
        <div className="teacher-badge">
          <span>👨‍🏫</span>
          <span>حساب معلم — يتطلب كود تفعيل خاص</span>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">الاسم الكامل</label>
            <input
              className="form-input"
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="أدخل اسمك الكامل"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
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
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="6 أحرف على الأقل"
              required
              dir="ltr"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">تأكيد كلمة المرور</label>
            <input
              className="form-input"
              type="password"
              value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
              placeholder="أعد كتابة كلمة المرور"
              required
              dir="ltr"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              🔑 كود تفعيل المعلم
              <span style={{ color: '#e53935', fontSize: '.85em', marginRight: 4 }}>*</span>
            </label>
            <input
              className="form-input teacher-code-input"
              type="text"
              value={form.teacherCode}
              onChange={e => set('teacherCode', e.target.value)}
              placeholder="TEACH-XXXX-XX"
              required
              dir="ltr"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="field-hint">
              🔒 كل كود صالح للاستخدام مرة واحدة فقط — اطلبه من مدير الأكاديمية
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'إنشاء حساب المعلم ←'}
          </button>
        </form>

        <div className="auth-footer-links">
          <p className="auth-footer">
            لديك حساب بالفعل؟ <Link href="/auth/login">تسجيل الدخول</Link>
          </p>
          <p className="auth-footer" style={{ marginTop: 6 }}>
            هل تريد حساب طالب؟ <Link href="/auth/register">التسجيل كطالب</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
