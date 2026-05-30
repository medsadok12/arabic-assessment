'use client';

import { useState } from 'react';
import { createClient } from '../../../lib/supabase';

export default function FixSessionPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [steps,    setSteps]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  function addStep(text) { setSteps(s => [...s, text]); }

  async function handleFix(e) {
    e.preventDefault();
    setLoading(true);
    setSteps([]);

    const supabase = createClient();

    // 1. تسجيل الدخول
    addStep('⏳ جاري تسجيل الدخول...');
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      addStep('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة');
      setLoading(false);
      return;
    }
    addStep('✅ تسجيل الدخول ناجح');

    // 2. فحص الصورة الحالية
    const currentAvatar = signInData.user?.user_metadata?.avatar_url ?? '';
    const isBase64 = currentAvatar.startsWith('data:image');

    if (isBase64) {
      addStep('⚠️ تم اكتشاف صورة base64 ضخمة — جاري حذفها...');
      const { error: updateErr } = await supabase.auth.updateUser({ data: { avatar_url: null } });
      if (updateErr) {
        addStep('❌ فشل حذف الصورة: ' + updateErr.message);
        setLoading(false);
        return;
      }
      addStep('✅ تم حذف الصورة الضخمة من user_metadata');
    } else if (currentAvatar) {
      addStep('✅ الصورة سليمة (رابط URL) — لا تحتاج إصلاح');
    } else {
      addStep('✅ لا توجد صورة مخزنة — الحساب سليم');
    }

    // 3. تحديث الجلسة لتصغير الـ JWT
    addStep('⏳ جاري تحديث الجلسة...');
    const { error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr) {
      addStep('⚠️ تحذير: تعذّر تحديث الجلسة (' + refreshErr.message + ')');
    } else {
      addStep('✅ تم تحديث JWT — الكوكيز الآن صغيرة');
    }

    addStep('✅ الإصلاح مكتمل — جاري التحويل...');
    setDone(true);
    setTimeout(() => { window.location.href = '/dashboard'; }, 2500);
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <span className="logo-icon">🔧</span>
          <h1>أكاديمية عارم</h1>
          <p>إصلاح جلسة المستخدم — خطأ 494</p>
        </div>

        {!done && steps.length === 0 && (
          <div style={{
            background: '#fff3e0', border: '1px solid #ff9800', borderRadius: 8,
            padding: '12px 14px', marginBottom: 20, fontSize: '.85rem', color: '#e65100', lineHeight: 1.8,
          }}>
            <strong>تعليمات مهمة قبل الاستخدام:</strong><br />
            ١. افتح هذه الصفحة من متصفح نظيف (Incognito / هاتف)<br />
            ٢. أدخل بيانات الحساب المتضرر<br />
            ٣. الصفحة ستكشف وتحذف الصورة الضخمة تلقائياً
          </div>
        )}

        {steps.length > 0 && (
          <div style={{
            background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 8,
            padding: '12px 14px', marginBottom: 16, fontSize: '.84rem', lineHeight: 2,
          }}>
            {steps.map((s, i) => <div key={i}>{s}</div>)}
          </div>
        )}

        {!done && (
          <form onSubmit={handleFix} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">البريد الإلكتروني</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required dir="ltr"
                placeholder="example@email.com" disabled={loading} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">كلمة المرور</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required dir="ltr"
                placeholder="••••••••" disabled={loading} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <span className="spinner" /> : '🔧 فحص وإصلاح الحساب ←'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
