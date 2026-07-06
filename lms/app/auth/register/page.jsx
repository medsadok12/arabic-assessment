'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase';

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

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
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '', code: '', grade: '', age: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onPageShow(e) { if (e.persisted) { setGLoading(false); setLoading(false); } }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  async function handleGoogleRegister() {
    setGLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?for=student`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (oauthError) { setError('تعذَّر فتح نافذة Google — تأكد من أن المتصفح لا يحجب النوافذ المنبثقة.'); setGLoading(false); }
    } catch {
      setError('حدث خطأ أثناء الاتصال — تحقق من الإنترنت وأعد المحاولة.');
      setGLoading(false);
    }
  }

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); setError(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim())              { setError('يرجى إدخال الاسم الكامل'); return; }
    if (!form.age.toString().trim())    { setError('يرجى إدخال عمر الطالب'); return; }
    if (form.password !== form.confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    if (form.password.length < 6)       { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (!form.code.trim())              { setError('يرجى إدخال كود الأكاديمية'); return; }

    setLoading(true);

    // ── خطوة واحدة، ذرية تماماً: التحقق من الكود + إنشاء الحساب + استهلاك الكود ──
    const res  = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:     form.name,
        email:    form.email,
        password: form.password,
        code:     form.code,
        age:      form.age,
        grade:    form.grade,
      }),
    });
    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'حدث خطأ غير متوقع — يرجى المحاولة مجدداً');
      return;
    }

    // أرسلنا رابط التحقق — لا نُسجِّل دخوله تلقائياً قبل تأكيد البريد
    router.replace(`/auth/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
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

          {(
            <>
              {/* ── زر Google ── */}
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={gLoading || loading}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, padding: '12px 16px', borderRadius: 10, marginBottom: 18,
                  border: '1.5px solid #dadce0', background: gLoading ? '#f5f5f5' : '#fff',
                  cursor: gLoading ? 'not-allowed' : 'pointer',
                  fontSize: '.95rem', fontWeight: 700, color: '#1A2B4A',
                  boxShadow: '0 1px 4px rgba(0,0,0,.08)',
                  transition: 'box-shadow .15s, background .15s',
                }}
                onMouseEnter={e => { if (!gLoading) e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,.14)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.08)'; }}
              >
                {gLoading ? <span className="spinner" /> : <GoogleLogo />}
                التسجيل عبر Google
              </button>

              {/* ── فاصل ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                <span style={{ color: '#9ca3af', fontSize: '.82rem', whiteSpace: 'nowrap' }}>أو أنشئ حساباً بالبريد</span>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              </div>
            </>
          )}

          {(
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
                <IconInput icon="🎂">
                  <input className="form-input" type="text" value={form.age}
                    onChange={e => set('age', e.target.value)}
                    placeholder="اكتب عمرك" required
                    style={{ paddingRight: 38 }} />
                </IconInput>
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
                style={{ width: '100%', marginTop: 8 }} disabled={loading || gLoading}>
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

        </div>
      </div>
    </div>
  );
}
