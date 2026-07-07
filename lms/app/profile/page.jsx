'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import Navbar from '../../components/Navbar';

function Initials({ name, size = 80 }) {
  const letters = (name ?? '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #1A2B4A, #2d4373)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: '#fff',
      flexShrink: 0,
    }}>
      {letters}
    </div>
  );
}


export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      setUser(user);
    });
  }, []);

  if (!user) return null;

  const fullName = user.user_metadata?.full_name ?? '—';

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container" style={{ maxWidth: 600 }}>
          <h1 className="dash-welcome" style={{ marginBottom: 24 }}>الملف الشخصي</h1>
          <AvatarCard user={user} onUserUpdate={setUser} />
          <PasswordCard user={user} />
        </div>
      </main>
    </>
  );
}

const ROLE_LABELS = { admin: 'مدير', teacher: 'معلم', student: 'طالب' };
function roleLabel(role) { return ROLE_LABELS[role] ?? 'طالب'; }

/* ── بطاقة الصورة الشخصية — معزولة تماماً ── */
function AvatarCard({ user, onUserUpdate }) {
  const [avatarURL,  setAvatarURL]  = useState(user.user_metadata?.avatar_url ?? null);
  const [uploading,  setUploading]  = useState(false);
  const [msg,        setMsg]        = useState('');
  const [nameVal,     setNameVal]     = useState(user.user_metadata?.full_name ?? '');
  const [nameDirty,   setNameDirty]   = useState(false);
  const [nameSaving,  setNameSaving]  = useState(false);
  const [nameMsg,     setNameMsg]     = useState('');
  const [emailVal,    setEmailVal]    = useState(user.email ?? '');
  const [emailDirty,  setEmailDirty]  = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg,    setEmailMsg]    = useState('');
  const fileRef = useRef();

  const fullName    = user.user_metadata?.full_name ?? '—';
  const role        = user.user_metadata?.role ?? 'student';
  const canEdit     = role === 'admin' || role === 'teacher';

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMsg('❌ الحد الأقصى لحجم الصورة هو 5 ميغابايت');
      return;
    }

    setUploading(true);
    setMsg('');

    const supabase  = createClient();
    const ext       = file.name.split('.').pop() || 'jpg';
    const filePath  = `${user.id}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setMsg('❌ فشل رفع الصورة — تأكد من وجود bucket باسم avatars في Supabase Storage');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;

    const { error: updateErr } = await supabase.auth.updateUser({ data: { avatar_url: urlWithBust } });
    if (updateErr) {
      setMsg('❌ فشل تحديث الملف الشخصي، حاول مجدداً');
      setUploading(false);
      return;
    }

    // حفظ الرابط في app_metadata لحمايته من إعادة كتابة Google عند تسجيل الدخول
    try {
      await fetch('/api/profile/save-avatar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: publicUrl }),
      });
    } catch (_) {}

    // تحديث الجلسة برمجياً بعد التعديل — لا حاجة لتسجيل خروج أو مسح كوكيز
    const { data: { user: refreshed } } = await supabase.auth.refreshSession();
    if (refreshed) onUserUpdate(refreshed);

    setAvatarURL(urlWithBust);
    setMsg('✅ تم تحديث الصورة بنجاح');
    setUploading(false);
  }

  async function handleNameSave() {
    const trimmed = nameVal.trim();
    if (!trimmed) { setNameMsg('❌ الاسم لا يمكن أن يكون فارغاً'); return; }
    setNameSaving(true);
    setNameMsg('');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
    if (error) {
      setNameMsg('❌ فشل حفظ الاسم، حاول مجدداً');
    } else {
      const { data: { user: refreshed } } = await supabase.auth.refreshSession();
      if (refreshed) onUserUpdate(refreshed);
      setNameDirty(false);
      setNameMsg('✅ تم تحديث الاسم بنجاح');
    }
    setNameSaving(false);
  }

  async function handleEmailSave() {
    const trimmed = emailVal.trim().toLowerCase();
    if (!trimmed) { setEmailMsg('❌ البريد لا يمكن أن يكون فارغاً'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailMsg('❌ صيغة البريد غير صحيحة'); return; }
    setEmailSaving(true);
    setEmailMsg('');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    if (error) {
      setEmailMsg('❌ فشل تحديث البريد: ' + error.message);
    } else {
      setEmailDirty(false);
      setEmailMsg('✅ تم إرسال رابط تأكيد للبريد الجديد — تحقق من صندوقك');
    }
    setEmailSaving(false);
  }

  return (
    <div className="card" style={{ padding: '28px 24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        <div
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => fileRef.current?.click()}
          title="انقر لتغيير الصورة"
        >
          {avatarURL
            ? <img src={avatarURL} alt="صورة شخصية"
                onError={() => setAvatarURL(null)}
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #1A2B4A' }} />
            : <Initials name={fullName} />
          }
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            background: '#1A2B4A', borderRadius: '50%',
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#fff', border: '2px solid #fff',
          }}>
            {uploading ? '…' : '📷'}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1a237e' }}>{nameVal || fullName}</div>
          <div style={{ color: '#888', fontSize: '.9rem' }}>{user.email}</div>
          <div style={{ color: '#aaa', fontSize: '.8rem', marginTop: 2 }}>{roleLabel(role)}</div>
        </div>
      </div>

      {/* input معزول — لا علاقة له بنموذج كلمة المرور */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarUpload}
      />

      {msg && (
        <p style={{
          fontSize: '.85rem', marginBottom: 12,
          color: msg.startsWith('✅') ? '#2e7d32' : '#c62828',
        }}>
          {msg}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">الاسم الكامل</label>
          {canEdit ? (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  value={nameVal}
                  onChange={e => { setNameVal(e.target.value); setNameDirty(true); setNameMsg(''); }}
                  placeholder="الاسم الكامل"
                  style={{ flex: 1 }}
                />
                {nameDirty && (
                  <button
                    className="btn btn-primary"
                    onClick={handleNameSave}
                    disabled={nameSaving}
                    style={{ flexShrink: 0, padding: '0 16px' }}
                  >
                    {nameSaving ? <span className="spinner" /> : 'حفظ'}
                  </button>
                )}
              </div>
              {nameMsg && (
                <p style={{ fontSize: '.82rem', marginTop: 4, color: nameMsg.startsWith('✅') ? '#2e7d32' : '#c62828' }}>
                  {nameMsg}
                </p>
              )}
            </>
          ) : (
            <>
              <input
                className="form-input"
                value={fullName}
                readOnly
                style={{ background: '#f5f5f5', color: '#888', cursor: 'not-allowed' }}
              />
              <p style={{ fontSize: '.78rem', color: '#aaa', marginTop: 3 }}>
                🔒 لا يمكن تغيير الاسم — تواصل مع الإدارة إذا لزم الأمر
              </p>
            </>
          )}
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">البريد الإلكتروني</label>
          {canEdit ? (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  type="email"
                  value={emailVal}
                  onChange={e => { setEmailVal(e.target.value); setEmailDirty(true); setEmailMsg(''); }}
                  placeholder="example@email.com"
                  dir="ltr"
                  style={{ flex: 1 }}
                />
                {emailDirty && (
                  <button
                    className="btn btn-primary"
                    onClick={handleEmailSave}
                    disabled={emailSaving}
                    style={{ flexShrink: 0, padding: '0 16px' }}
                  >
                    {emailSaving ? <span className="spinner" /> : 'حفظ'}
                  </button>
                )}
              </div>
              {emailMsg && (
                <p style={{ fontSize: '.82rem', marginTop: 4, color: emailMsg.startsWith('✅') ? '#2e7d32' : '#c62828' }}>
                  {emailMsg}
                </p>
              )}
            </>
          ) : (
            <input
              className="form-input"
              value={user.email}
              readOnly
              style={{ background: '#f5f5f5', color: '#888', cursor: 'not-allowed' }}
              dir="ltr"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── بطاقة كلمة المرور — معزولة تماماً ── */
function PasswordCard({ user }) {
  const [phase,   setPhase]   = useState('form'); // 'form' | 'otp'
  const [current, setCurrent] = useState('');
  const [next,    setNext]    = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp,     setOtp]     = useState('');
  const [pwMsg,   setPwMsg]   = useState('');
  const [loading, setLoading] = useState(false);

  /* المرحلة 1 — التحقق من كلمة المرور الحالية وإرسال OTP */
  async function handleSendOtp(e) {
    e.preventDefault();
    setPwMsg('');
    if (!current)               { setPwMsg('❌ الرجاء إدخال كلمة المرور الحالية'); return; }
    if (!next)                  { setPwMsg('❌ الرجاء إدخال كلمة المرور الجديدة'); return; }
    if (next.length < 6)        { setPwMsg('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (next !== confirm)       { setPwMsg('❌ كلمتا المرور غير متطابقتين'); return; }

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/send-password-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currentPassword: current }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg('❌ ' + (data.error ?? 'حدث خطأ'));
      } else {
        setPhase('otp');
      }
    } catch {
      setPwMsg('❌ حدث خطأ في الاتصال، يرجى المحاولة مجدداً');
    }
    setLoading(false);
  }

  /* المرحلة 2 — التحقق من كود البريد وتغيير كلمة المرور */
  async function handleConfirmOtp(e) {
    e.preventDefault();
    setPwMsg('');
    if (!otp || otp.length < 6) { setPwMsg('❌ الرجاء إدخال الكود المكوّن من 6 أرقام'); return; }

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/update-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'change', newPassword: next, currentPassword: current, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg('❌ ' + (data.error ?? 'حدث خطأ أثناء تغيير كلمة المرور'));
      } else {
        setPwMsg('✅ تم تغيير كلمة المرور بنجاح');
        setPhase('form');
        setCurrent(''); setNext(''); setConfirm(''); setOtp('');
      }
    } catch {
      setPwMsg('❌ حدث خطأ في الاتصال، يرجى المحاولة مجدداً');
    }
    setLoading(false);
  }

  const isGoogleUser = (() => {
    const providers = user?.app_metadata?.providers ?? [];
    const provider  = user?.app_metadata?.provider  ?? '';
    return providers.includes('google') || provider === 'google';
  })();

  return (
    <div className="card" style={{ padding: '28px 24px' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a237e', marginBottom: 18 }}>
        🔑 تغيير كلمة المرور
      </h2>

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
      {pwMsg && (
        <div
          className={`alert ${pwMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}
          style={{ marginBottom: 14 }}
        >
          {pwMsg}
        </div>
      )}

      {phase === 'form' ? (
        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">كلمة المرور الحالية</label>
            <input
              className="form-input"
              type="password"
              value={current}
              onChange={e => { setCurrent(e.target.value); setPwMsg(''); }}
              placeholder="أدخل كلمة مرورك الحالية"
              autoComplete="current-password"
              dir="ltr"
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">كلمة المرور الجديدة</label>
            <input
              className="form-input"
              type="password"
              value={next}
              onChange={e => { setNext(e.target.value); setPwMsg(''); }}
              placeholder="6 أحرف على الأقل"
              autoComplete="new-password"
              dir="ltr"
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">تأكيد كلمة المرور الجديدة</label>
            <input
              className="form-input"
              type="password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setPwMsg(''); }}
              placeholder="أعد كتابة كلمة المرور"
              autoComplete="new-password"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? <span className="spinner" /> : 'إرسال كود التحقق'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirmOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
            padding: '10px 14px', fontSize: '.85rem', color: '#92400e',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span style={{ flexShrink: 0 }}>📧</span>
            <span>تم إرسال كود التحقق إلى بريدك الإلكتروني. أدخله أدناه لتأكيد تغيير كلمة المرور.</span>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">كود التحقق (6 أرقام)</label>
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setPwMsg(''); }}
              placeholder="أدخل الكود"
              autoComplete="one-time-code"
              dir="ltr"
              style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.2rem' }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? <span className="spinner" /> : 'تأكيد التغيير'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => { setPhase('form'); setOtp(''); setPwMsg(''); }}
              disabled={loading}
            >
              رجوع
            </button>
          </div>
        </form>
      )}
        </>
      )}
    </div>
  );
}
