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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  /* ── تغيير كلمة المرور ── */
  async function handleSavePassword(e) {
    e.preventDefault();
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
    setPassMsg(null);

    try {
      const res  = await fetch('/api/auth/update-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'change', newPassword, currentPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassMsg({ type: 'error', text: data.error ?? 'حدث خطأ أثناء تغيير كلمة المرور.' });
      } else {
        setPassMsg({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
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
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--primary)',
              marginBottom: 22,
              paddingBottom: 12,
              borderBottom: '1px solid var(--border)',
            }}>
              👤 معلومات الحساب
            </h2>

            <form onSubmit={handleSaveName} noValidate>
              {/* البريد الإلكتروني — للقراءة فقط */}
              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">
                  البريد الإلكتروني
                </label>
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

              {/* الاسم الكامل */}
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">
                  الاسم الكامل
                </label>
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

              {/* رسالة نتيجة الحفظ */}
              {nameMsg && (
                <div className={`alert alert-${nameMsg.type}`}>
                  {nameMsg.text}
                </div>
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
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--primary)',
              marginBottom: 22,
              paddingBottom: 12,
              borderBottom: '1px solid var(--border)',
            }}>
              🔒 تغيير كلمة المرور
            </h2>

            <form onSubmit={handleSavePassword} noValidate>
              {/* كلمة المرور الحالية */}
              <div className="form-group">
                <label className="form-label" htmlFor="profile-current-pass">
                  كلمة المرور الحالية
                </label>
                <input
                  id="profile-current-pass"
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة مرورك الحالية"
                  autoComplete="current-password"
                  required
                />
              </div>

              {/* كلمة المرور الجديدة */}
              <div className="form-group">
                <label className="form-label" htmlFor="profile-new-pass">
                  كلمة المرور الجديدة
                </label>
                <input
                  id="profile-new-pass"
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  autoComplete="new-password"
                />
              </div>

              {/* تأكيد كلمة المرور */}
              <div className="form-group">
                <label className="form-label" htmlFor="profile-confirm-pass">
                  تأكيد كلمة المرور
                </label>
                <input
                  id="profile-confirm-pass"
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور الجديدة"
                  autoComplete="new-password"
                />
              </div>

              {/* رسالة نتيجة التغيير */}
              {passMsg && (
                <div className={`alert alert-${passMsg.type}`}>
                  {passMsg.text}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={passLoading}
                style={{ minWidth: 180 }}
              >
                {passLoading ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
              </button>
            </form>
          </div>

        </div>
      </main>
    </>
  );
}
