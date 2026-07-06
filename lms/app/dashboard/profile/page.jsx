'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { createClient } from '../../../lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Account info state
  const [fullName, setFullName]         = useState('');
  const [nameLoading, setNameLoading]   = useState(false);
  const [nameMsg, setNameMsg]           = useState(null); // { type: 'success'|'error', text }

  // Password state
  const [passPhase, setPassPhase]             = useState('form'); // 'form' | 'otp'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passOtp, setPassOtp]                 = useState('');
  const [passLoading, setPassLoading]         = useState(false);
  const [passMsg, setPassMsg]                 = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        router.replace('/auth/login');
        return;
      }
      setUser(user);
      setFullName(user.user_metadata?.full_name ?? '');
      setLoading(false);
    });
  }, []);

  /* ── حفظ الاسم ── */
  async function handleSaveName(e) {
    e.preventDefault();
    if (!fullName.trim()) {
      setNameMsg({ type: 'error', text: 'الرجاء إدخال الاسم الكامل.' });
      return;
    }
    setNameLoading(true);
    setNameMsg(null);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    });
    setNameLoading(false);
    if (error) {
      setNameMsg({ type: 'error', text: 'حدث خطأ أثناء الحفظ: ' + error.message });
    } else {
      setNameMsg({ type: 'success', text: 'تم تحديث الاسم بنجاح.' });
    }
  }

  /* ── المرحلة 1: التحقق من كلمة المرور الحالية وإرسال OTP ── */
  async function handleSendOtp(e) {
    e.preventDefault();
    setPassMsg(null);
    if (!currentPassword) {
      setPassMsg({ type: 'error', text: 'الرجاء إدخال كلمة المرور الحالية.' });
      return;
    }
    if (!newPassword) {
      setPassMsg({ type: 'error', text: 'الرجاء إدخال كلمة المرور الجديدة.' });
      return;
    }
    if (newPassword.length < 8) {
      setPassMsg({ type: 'error', text: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'كلمتا المرور غير متطابقتين.' });
      return;
    }
    setPassLoading(true);
    try {
      const res  = await fetch('/api/auth/send-password-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currentPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassMsg({ type: 'error', text: data.error ?? 'حدث خطأ أثناء إرسال كود التحقق.' });
      } else {
        setPassPhase('otp');
      }
    } catch {
      setPassMsg({ type: 'error', text: 'حدث خطأ في الاتصال، يرجى المحاولة مجدداً.' });
    }
    setPassLoading(false);
  }

  /* ── المرحلة 2: تأكيد OTP وتغيير كلمة المرور ── */
  async function handleConfirmOtp(e) {
    e.preventDefault();
    setPassMsg(null);
    if (!passOtp || passOtp.length < 6) {
      setPassMsg({ type: 'error', text: 'الرجاء إدخال الكود المكوّن من 6 أرقام.' });
      return;
    }
    setPassLoading(true);
    try {
      const res  = await fetch('/api/auth/update-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'change', newPassword, currentPassword, otp: passOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassMsg({ type: 'error', text: data.error ?? 'حدث خطأ أثناء تغيير كلمة المرور.' });
      } else {
        setPassMsg({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح.' });
        setPassPhase('form');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPassOtp('');
      }
    } catch {
      setPassMsg({ type: 'error', text: 'حدث خطأ في الاتصال، يرجى المحاولة مجدداً.' });
    }
    setPassLoading(false);
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="page-wrap">
          <div className="container" style={{ textAlign: 'center', paddingTop: 60 }}>
            <div className="spinner" />
            <p style={{ color: 'var(--muted)', marginTop: 16 }}>جارٍ التحميل...</p>
          </div>
        </main>
      </>
    );
  }

  const isGoogleUser = (() => {
    const providers = user?.app_metadata?.providers ?? [];
    const provider  = user?.app_metadata?.provider  ?? '';
    return providers.includes('google') || provider === 'google';
  })();

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container" style={{ direction: 'rtl', maxWidth: 680 }}>

          {/* رأس الصفحة */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <Link
              href="/dashboard"
              className="btn btn-outline btn-sm"
              style={{ flexShrink: 0 }}
            >
              ← رجوع
            </Link>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text)' }}>
              الملف الشخصي
            </h1>
          </div>

          {/* بطاقة 1: معلومات الحساب */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{
              fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)',
              marginBottom: 22, paddingBottom: 12, borderBottom: '1px solid var(--border)',
            }}>
              👤 معلومات الحساب
            </h2>

            <form onSubmit={handleSaveName} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">البريد الإلكتروني</label>
                <input
                  id="profile-email"
                  type="email"
                  className="form-input"
                  value={user?.email ?? ''}
                  readOnly
                  style={{ background: 'var(--bg)', color: 'var(--muted)', cursor: 'default' }}
                />
                <p className="form-help">لا يمكن تغيير البريد الإلكتروني.</p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">الاسم الكامل</label>
                <input
                  id="profile-name"
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                  autoComplete="name"
                />
              </div>

              {nameMsg && (
                <div className={`alert alert-${nameMsg.type}`}>{nameMsg.text}</div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={nameLoading}
                style={{ minWidth: 140 }}
              >
                {nameLoading ? 'جارٍ الحفظ...' : 'حفظ الاسم'}
              </button>
            </form>
          </div>

          {/* بطاقة 2: تغيير كلمة المرور */}
          <div className="card">
            <h2 style={{
              fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)',
              marginBottom: 22, paddingBottom: 12, borderBottom: '1px solid var(--border)',
            }}>
              🔒 تغيير كلمة المرور
            </h2>

            {/* مستخدمو Google لا يملكون كلمة مرور محلية */}
            {isGoogleUser ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#f0f9ff', border: '1px solid #bae6fd',
                borderRadius: 10, padding: '14px 16px',
              }}>
                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🔐</span>
                <p style={{ margin: 0, color: '#0369a1', fontSize: '.9rem', fontWeight: 600, lineHeight: 1.5 }}>
                  حسابك مرتبط ومؤمَّن بواسطة Google
                </p>
              </div>
            ) : (
              <>
            {passMsg && (
              <div className={`alert alert-${passMsg.type}`} style={{ marginBottom: 16 }}>
                {passMsg.text}
              </div>
            )}

            {passPhase === 'form' ? (
              <form onSubmit={handleSendOtp} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-current-pass">
                    كلمة المرور الحالية
                  </label>
                  <input
                    id="profile-current-pass"
                    type="password"
                    className="form-input"
                    value={currentPassword}
                    onChange={e => { setCurrentPassword(e.target.value); setPassMsg(null); }}
                    placeholder="أدخل كلمة مرورك الحالية"
                    autoComplete="current-password"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="profile-new-pass">
                    كلمة المرور الجديدة
                  </label>
                  <input
                    id="profile-new-pass"
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setPassMsg(null); }}
                    placeholder="8 أحرف على الأقل"
                    autoComplete="new-password"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="profile-confirm-pass">
                    تأكيد كلمة المرور
                  </label>
                  <input
                    id="profile-confirm-pass"
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setPassMsg(null); }}
                    placeholder="أعد كتابة كلمة المرور الجديدة"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passLoading}
                  style={{ minWidth: 180 }}
                >
                  {passLoading ? 'جارٍ الإرسال...' : 'إرسال كود التحقق'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmOtp} noValidate>
                <div style={{
                  background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
                  padding: '10px 14px', marginBottom: 20, fontSize: '.85rem', color: '#92400e',
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  <span style={{ flexShrink: 0 }}>📧</span>
                  <span>تم إرسال كود التحقق إلى بريدك الإلكتروني. أدخله أدناه لتأكيد تغيير كلمة المرور.</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="profile-otp">
                    كود التحقق (6 أرقام)
                  </label>
                  <input
                    id="profile-otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="form-input"
                    value={passOtp}
                    onChange={e => { setPassOtp(e.target.value.replace(/\D/g, '')); setPassMsg(null); }}
                    placeholder="أدخل الكود"
                    autoComplete="one-time-code"
                    style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.2rem' }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={passLoading}
                    style={{ minWidth: 160 }}
                  >
                    {passLoading ? 'جارٍ التأكيد...' : 'تأكيد التغيير'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => { setPassPhase('form'); setPassOtp(''); setPassMsg(null); }}
                    disabled={passLoading}
                  >
                    رجوع
                  </button>
                </div>
              </form>
            )}
              </>
            )}
          </div>

        </div>
      </main>
    </>
  );
}
