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
      background: 'linear-gradient(135deg, #185FA5, #1e88e5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: '#fff',
      flexShrink: 0,
    }}>
      {letters}
    </div>
  );
}

// ترجمة أخطاء Supabase
const PW_ERRORS = {
  'New password should be different from the old password': 'يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور الحالية',
  'Password should be at least 6 characters.': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
  'Auth session missing!': 'انتهت الجلسة، يرجى إعادة تسجيل الدخول',
  'For security purposes, you can only request this once every 60 seconds': 'لأسباب أمنية، يمكنك المحاولة مرة واحدة كل دقيقة',
};
function translatePwError(msg) { return PW_ERRORS[msg] ?? msg; }

export default function ProfilePage() {
  const router = useRouter();

  const [user,      setUser]      = useState(null);
  const [avatarURL, setAvatarURL] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [pwForm,    setPwForm]    = useState({ next: '', confirm: '' });
  const [pwMsg,     setPwMsg]     = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      setUser(user);
      setAvatarURL(user.user_metadata?.avatar_url ?? null);
    });
  }, []);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setUploadMsg('❌ الحد الأقصى لحجم الصورة هو 5 ميغابايت'); return; }

    setUploading(true);
    setUploadMsg('');

    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Upload to Supabase Storage — only the URL is stored in user_metadata (keeps JWT small)
    const ext      = file.name.split('.').pop() || 'jpg';
    const filePath = `${currentUser.id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setUploadMsg('❌ فشل رفع الصورة — تأكد من إنشاء bucket باسم avatars في Supabase Storage');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
    // Append timestamp to bust browser cache after re-upload
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;

    const { error } = await supabase.auth.updateUser({ data: { avatar_url: urlWithBust } });
    if (error) { setUploadMsg('❌ فشل تحديث الملف الشخصي، حاول مجدداً'); }
    else        { setAvatarURL(urlWithBust); setUploadMsg('✅ تم تحديث الصورة بنجاح'); }
    setUploading(false);
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwMsg('');
    if (!pwForm.next && !pwForm.confirm) return;
    if (pwForm.next !== pwForm.confirm) { setPwMsg('❌ كلمتا المرور غير متطابقتين'); return; }
    if (pwForm.next.length < 6)         { setPwMsg('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setPwLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    if (error) { setPwMsg('❌ ' + translatePwError(error.message)); }
    else        { setPwMsg('✅ تم تغيير كلمة المرور بنجاح'); setPwForm({ next: '', confirm: '' }); }
    setPwLoading(false);
  }

  if (!user) return null;

  const fullName = user.user_metadata?.full_name ?? '—';

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container" style={{ maxWidth: 600 }}>
          <h1 className="dash-welcome" style={{ marginBottom: 24 }}>الملف الشخصي</h1>

          {/* Avatar + info */}
          <div className="card" style={{ padding: '28px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                {avatarURL
                  ? <img src={avatarURL} alt="صورة شخصية"
                      style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #185FA5' }} />
                  : <Initials name={fullName} />
                }
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  background: '#185FA5', borderRadius: '50%',
                  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: '#fff', border: '2px solid #fff',
                }}>
                  {uploading ? '…' : '📷'}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1a237e' }}>{fullName}</div>
                <div style={{ color: '#888', fontSize: '.9rem' }}>{user.email}</div>
                <div style={{ color: '#aaa', fontSize: '.8rem', marginTop: 2 }}>طالب</div>
              </div>
            </div>

            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            {uploadMsg && <p style={{ fontSize: '.85rem', marginTop: -8, marginBottom: 12, color: uploadMsg.startsWith('✅') ? '#2e7d32' : '#c62828' }}>{uploadMsg}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">الاسم الكامل</label>
                <input
                  className="form-input"
                  value={fullName}
                  readOnly
                  style={{ background: '#f5f5f5', color: '#888', cursor: 'not-allowed' }}
                />
                <p style={{ fontSize: '.78rem', color: '#aaa', marginTop: 3 }}>
                  🔒 لا يمكن تغيير الاسم — تواصل مع الإدارة إذا لزم الأمر
                </p>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">البريد الإلكتروني</label>
                <input
                  className="form-input"
                  value={user.email}
                  readOnly
                  style={{ background: '#f5f5f5', color: '#888', cursor: 'not-allowed' }}
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Password change */}
          <div className="card" style={{ padding: '28px 24px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a237e', marginBottom: 18 }}>
              🔑 تغيير كلمة المرور
            </h2>
            {pwMsg && (
              <div className={`alert ${pwMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 14 }}>
                {pwMsg}
              </div>
            )}
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">كلمة المرور الجديدة</label>
                <input
                  className="form-input"
                  type="password"
                  value={pwForm.next}
                  onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
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
                  value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="أعد كتابة كلمة المرور"
                  autoComplete="new-password"
                  dir="ltr"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={pwLoading}
                style={{ marginTop: 4 }}>
                {pwLoading ? <span className="spinner" /> : 'حفظ التغييرات ←'}
              </button>
            </form>
          </div>

        </div>
      </main>
    </>
  );
}
