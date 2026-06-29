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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message === 'User already registered'
        ? 'هذا البريد مسجل مسبقاً — استخدم صفحة تسجيل الدخول'
        : signUpError.message);
      setLoading(false);
      return;
    }

    if (signUpData?.user?.identities?.length === 0) {
      setError('هذا البريد مسجل مسبقاً — استخدم صفحة تسجيل الدخول');
      setLoading(false);
      return;
    }

    const existingRole = signUpData?.user?.user_metadata?.role;
    if (existingRole && existingRole !== 'student') {
      await supabase.auth.signOut();
      setError('هذا البريد مسجل بدور آخر — استخدم صفحة تسجيل الدخول');
      setLoading(false);
      return;
    }

    // ── الخطوة 2: استهلاك الكود مع تسجيل بيانات الطالب ──
    const res = await fetch('/api/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: form.code, name: form.name, email: form.email }),
    });
    const { valid } = await res.json();

    if (!valid) {
      await supabase.auth.signOut();
      setError('كود الأكاديمية غير صحيح أو غير مفعّل — تواصل مع إدارة الأكاديمية');
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess('تم إنشاء حسابك! تحقق من بريدك الإلكتروني واضغط على رابط التأكيد.');
  }

  /* ── icon input helper ── */
  function IconInput({ icon, children }) {
    return (
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', right: 12, top: '50%',
          transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none',
        }}>{icon}</span>
        {children}
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* override card padding so the blue header goes edge-to-edge */}
      <div className="auth-card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* ── Blue header strip ── */}
        <div style={{
          background: 'linear-gradient(135deg, #104880 0%, #185FA5 100%)',
          padding: '22px 24px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 44, height: 44, background: 'rgba(255,255,255,.15)',
              borderRadius: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.5rem',
            }}>📚</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>
                أكاديمية عارم
              </div>
              <div style={{ color: 'rgba(255,255,255,.72)', fontSize: '.78rem' }}>
                إنشاء حساب طالب جديد
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          background: '#e8f0fb', padding: '6px', gap: 4,
        }}>
          <Link href="/auth/login"
            style={{
              padding: '10px 0', borderRadius: 10, fontFamily: 'inherit',
              fontWeight: 700, fontSize: '.9rem', background: 'transparent',
              color: '#6b7280', textDecoration: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🔑 دخول</Link>
          <button style={{
            padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'default',
            fontFamily: 'inherit', fontWeight: 700, fontSize: '.9rem',
            background: '#fff', color: '#185FA5',
            boxShadow: '0 2px 10px rgba(24,95,165,.14)',
          }}>✨ تسجيل جديد</button>
        </div>

        {/* ── Form body ── */}
        <div style={{ padding: '22px 24px 24px' }}>

          {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

          {!success && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">الاسم الكامل</label>
                <IconInput icon="👤">
                  <input className="form-input" type="text" value={form.name}
                    onChange={e => set('name', e.target.value)} placeholder="أدخل الاسم الكامل" required
                    style={{ paddingRight: 38 }} />
                </IconInput>
              </div>
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني</label>
                <IconInput icon="📧">
                  <input className="form-input" type="email" value={form.email}
                    onChange={e => set('email', e.target.value)} placeholder="example@email.com" required dir="ltr"
                    style={{ paddingRight: 38 }} />
                </IconInput>
              </div>
              <div className="form-group">
                <label className="form-label">كلمة المرور</label>
                <IconInput icon="🔒">
                  <input className="form-input" type="password" value={form.password}
                    onChange={e => set('password', e.target.value)} placeholder="6 أحرف على الأقل" required dir="ltr"
                    style={{ paddingRight: 38 }} />
                </IconInput>
              </div>
              <div className="form-group">
                <label className="form-label">تأكيد كلمة المرور</label>
                <IconInput icon="🔒">
                  <input className="form-input" type="password" value={form.confirm}
                    onChange={e => set('confirm', e.target.value)} placeholder="أعد كتابة كلمة المرور" required dir="ltr"
                    style={{ paddingRight: 38 }} />
                </IconInput>
              </div>
              <div className="form-group">
                <label className="form-label">
                  كود الأكاديمية <span style={{ color: '#e53935', fontSize: '0.85em' }}>*</span>
                </label>
                <IconInput icon="🎓">
                  <input className="form-input" type="text" value={form.code}
                    onChange={e => set('code', e.target.value)}
                    placeholder="أدخل كود الأكاديمية" required dir="ltr"
                    style={{ letterSpacing: 2, textTransform: 'uppercase', paddingRight: 38 }} />
                </IconInput>
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
              <p style={{ color: '#555', fontSize: '.9rem', marginBottom: 16, lineHeight: 1.7 }}>
                ✅ تم إنشاء حسابك! تحقق من بريدك الإلكتروني لتفعيل الحساب.
              </p>
              <Link href="/assessment" className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center', width: '100%', marginBottom: 10 }}>
                ابدأ التقييم الآن ←
              </Link>
              <Link href="/auth/login" style={{ fontSize: '.85rem', color: '#888', textDecoration: 'underline' }}>
                تسجيل الدخول لاحقاً
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
