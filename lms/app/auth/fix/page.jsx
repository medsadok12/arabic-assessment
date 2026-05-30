'use client';

import { useState } from 'react';
import { createClient } from '../../../lib/supabase';

export default function FixSessionPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [status,   setStatus]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  async function handleFix(e) {
    e.preventDefault();
    setLoading(true);
    setStatus('⏳ جاري تسجيل الدخول...');

    const supabase = createClient();

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      setStatus('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة');
      setLoading(false);
      return;
    }

    setStatus('⏳ جاري حذف الصورة الكبيرة...');
    const { error: updateErr } = await supabase.auth.updateUser({ data: { avatar_url: null } });
    if (updateErr) {
      setStatus('❌ فشل مسح الصورة: ' + updateErr.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setStatus('✅ تم الإصلاح! سيتم تحويلك للوحة التحكم خلال ثانيتين...');
    setTimeout(() => { window.location.href = '/dashboard'; }, 2000);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🔧</span>
          <h1>أكاديمية عارم</h1>
          <p>إصلاح جلسة المستخدم</p>
        </div>

        {!done && (
          <div style={{
            background: '#fff3e0', border: '1px solid #ff9800', borderRadius: 8,
            padding: '12px 14px', marginBottom: 20, fontSize: '.85rem', color: '#e65100', lineHeight: 1.7,
          }}>
            <strong>خطأ 494 — الكوكيز كبيرة جداً</strong><br />
            السبب: صورة شخصية كبيرة مخزنة في حسابك.<br />
            <strong>قبل استخدام هذه الصفحة:</strong> احذف كوكيز الموقع من المتصفح ثم افتح هذه الصفحة من جديد.
          </div>
        )}

        {status && (
          <div className={`alert ${status.startsWith('✅') ? 'alert-success' : status.startsWith('⏳') ? 'alert-info' : 'alert-error'}`}
            style={{ marginBottom: 16 }}>
            {status}
          </div>
        )}

        {!done && (
          <form onSubmit={handleFix} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">البريد الإلكتروني</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required dir="ltr"
                placeholder="example@email.com" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">كلمة المرور</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required dir="ltr"
                placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ marginTop: 4 }}>
              {loading ? <span className="spinner" /> : '🔧 إصلاح الجلسة تلقائياً ←'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
