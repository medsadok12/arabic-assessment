'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase';

function ResetForm() {
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [ready,       setReady]       = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    const code = searchParams.get('code');
    let settled = false;

    // سجّل المستمع أولاً — قبل أي نداء آخر (getSession/exchangeCodeForSession)
    // قد يُطلق حدث PASSWORD_RECOVERY فوراً أثناء معالجة الرابط الداخلية لعميل
    // Supabase؛ لو سُجِّل المستمع بعد ذلك النداء، يُفوَّت الحدث تماماً ويبقى
    // ready عالقاً على false للأبد رغم صحة الرابط — هذا فخ توقيت معروف.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!settled && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        settled = true;
        setReady(true);
      }
    });

    (async () => {
      // 1. If Supabase sent a PKCE code in the URL, exchange it now
      if (code) {
        const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchErr) { settled = true; setReady(true); return; }
      }

      // 2. Maybe the callback route already exchanged the code — check session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { settled = true; setReady(true); }
    })();

    // مهلة أمان: لو لم يُتحقَّق من الرابط خلال 8 ثوانٍ (منتهي الصلاحية،
    // مُستهلَك مسبقاً، أو غير صالح)، لا يبقى المستخدم عالقاً على "جارٍ
    // التحقق..." للأبد بلا أي مخرج — يظهر خيار طلب رابط جديد بدل ذلك.
    const timer = setTimeout(() => { if (!settled) setLinkExpired(true); }, 8000);

    return () => { subscription?.unsubscribe(); clearTimeout(timer); };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    if (password.length < 6)  { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError('حدث خطأ، يرجى المحاولة مجدداً أو طلب رابط جديد');
    } else {
      setSuccess(true);
      await supabase.auth.signOut();
      setTimeout(() => router.push('/auth/login'), 2500);
    }
  }

  if (!ready && linkExpired) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>⚠️</div>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>يبدو أن هذا الرابط منتهي الصلاحية أو غير صالح</p>
          <p style={{ color: 'var(--muted)', fontSize: '.88rem', marginBottom: 24 }}>
            روابط إعادة تعيين كلمة المرور صالحة لفترة محدودة فقط لحماية حسابك — لا مشكلة، اطلب رابطاً جديداً وستصلك خلال لحظات.
          </p>
          <Link href="/auth/forgot-password" className="btn btn-primary" style={{ display: 'block', textAlign: 'center' }}>
            طلب رابط جديد ←
          </Link>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <span className="spinner" style={{ margin: '0 auto 16px', display: 'block', width: 36, height: 36, borderWidth: 3 }} />
          <p style={{ color: 'var(--muted)' }}>جارٍ التحقق من الرابط...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🔒</span>
          <h1>أكاديمية عارم</h1>
        </div>
        <h2 className="auth-title">إعادة تعيين كلمة المرور</h2>

        {success ? (
          <div className="alert alert-success" style={{ marginTop: 8 }}>
            ✅ تم تغيير كلمة المرور بنجاح! جارٍ تحويلك لتسجيل الدخول...
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">كلمة المرور الجديدة</label>
                <input className="form-input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل" required dir="ltr" disabled={loading} />
              </div>
              <div className="form-group">
                <label className="form-label">تأكيد كلمة المرور</label>
                <input className="form-input" type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور" required dir="ltr" disabled={loading} />
              </div>
              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }} disabled={loading}>
                {loading ? <span className="spinner" /> : 'حفظ كلمة المرور الجديدة ←'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
