'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase';

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

/* ── زخرفة خلفية خفيفة للشريط الأزرق: دوائر شفافة + حرف "ع" كبير شفاف،
     بنفس روح خلفية الهيرو في الصفحة الرئيسية ── */
function BannerDecor() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', top: -60, left: -40, width: 200, height: 200,
        borderRadius: '50%', background: 'rgba(255,255,255,.06)',
      }} />
      <div style={{
        position: 'absolute', bottom: -70, right: -30, width: 160, height: 160,
        borderRadius: '50%', background: 'rgba(232,184,75,.10)',
      }} />
      <div style={{
        position: 'absolute', top: -30, right: '18%', fontSize: '9rem', fontWeight: 900,
        color: 'rgba(255,255,255,.05)', lineHeight: 1, userSelect: 'none',
      }}>ع</div>
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm]     = useState({ name: '', email: '', password: '', confirm: '', code: '', grade: '', age: '' });
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
        data: { full_name: form.name, role: 'student', grade: form.grade || null, age: form.age ? parseInt(form.age) : null },
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
    setSuccess('تم إنشاء حسابك بنجاح! 🎉 مرحباً بك في رحلتك مع أكاديمية عارم');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4EFE6' }}>

      {/* ── الشريط الأزرق العلوي ── */}
      <div style={{ position: 'relative', background: '#1A2B4A', overflow: 'hidden', paddingBottom: 56 }}>
        <BannerDecor />
        <div style={{
          position: 'relative', zIndex: 2, maxWidth: 440, margin: '0 auto',
          padding: '44px 24px 0', textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, margin: '0 auto 14px', borderRadius: '50%',
            background: '#E8B84B', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 900, color: '#1A2B4A',
          }}>ع</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>
            أكاديمية عارم
          </div>
          <div style={{ color: 'rgba(255,255,255,.72)', fontSize: '.85rem', marginTop: 4 }}>
            إنشاء حساب طالب جديد
          </div>
        </div>

        {/* موجة انتقالية بين الشريط الأزرق والخلفية الكريمية */}
        <svg style={{ display: 'block', width: '100%', position: 'absolute', bottom: 0, left: 0, zIndex: 1 }}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,80 L0,44 C240,80 480,8 720,44 C960,80 1200,8 1440,44 L1440,80 Z" fill="#F4EFE6" />
        </svg>
      </div>

      {/* ── البطاقة البيضاء، متداخلة مع أسفل الشريط الأزرق ── */}
      <div style={{
        maxWidth: 440, margin: '-40px auto 40px', padding: '0 24px',
        position: 'relative', zIndex: 3,
      }}>
        <div style={{
          background: '#fff', borderRadius: 18,
          boxShadow: '0 16px 40px rgba(26,43,74,.18), 0 4px 12px rgba(26,43,74,.08)',
          padding: '28px 24px 24px',
        }}>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

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
                <label className="form-label">
                  عمر الطالب <span style={{ color: '#e53935', fontSize: '0.85em' }}>*</span>
                </label>
                <select className="form-input" value={form.age} onChange={e => set('age', e.target.value)} required>
                  <option value="">اختر العمر</option>
                  {Array.from({ length: 17 }, (_, i) => i + 4).map(a => (
                    <option key={a} value={a}>{a} سنوات</option>
                  ))}
                </select>
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

              <p style={{ textAlign: 'center', marginTop: 16, fontSize: '.85rem', color: '#888' }}>
                لديك حساب بالفعل؟{' '}
                <Link href="/auth/login" style={{ color: '#1A2B4A', fontWeight: 700, textDecoration: 'underline' }}>
                  سجّل الدخول
                </Link>
              </p>
            </form>
          )}

          {success && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 64, height: 64, margin: '0 auto 18px', borderRadius: '50%',
                background: '#2ABB7A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', color: '#fff', boxShadow: '0 6px 18px rgba(42,187,122,.4)',
              }}>✓</div>
              <p style={{ color: '#1A2B4A', fontSize: '1rem', fontWeight: 700, marginBottom: 22, lineHeight: 1.7 }}>
                {success}
              </p>
              <Link href="/dashboard"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                  width: '100%', padding: '14px 0', borderRadius: 10,
                  background: '#1A2B4A', color: '#E8B84B', fontWeight: 800, fontSize: '1rem',
                  textDecoration: 'none', boxShadow: '0 3px 12px rgba(26,43,74,.3)',
                }}>
                الذهاب للوحتي ←
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
