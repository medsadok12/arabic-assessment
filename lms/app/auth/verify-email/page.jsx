'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase';
import { dashboardPathFor } from '../../../lib/email-confirm';

const HANDOFF_KEY = 'aarem_handoff';
const WATCH_MS    = 60 * 60 * 1000;   // مدة صلاحية التذكرة نفسها
const POLL_MS     = 4000;

function readTicket(email) {
  try {
    const v = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || 'null');
    return v && v.email === email ? v.token : null;
  } catch { return null; }
}
function clearTicket() { try { sessionStorage.removeItem(HANDOFF_KEY); } catch {} }

/* الدخول التلقائي بعد تأكيد البريد (طلب الأستاذ محمد 2026-10-20): يؤكّد الطالب من
   تطبيق البريد ثم يعود هنا فيدخل وحده. نتحقق فور العودة للصفحة وكل بضع ثوانٍ:
   1) جلسة فُتحت في هذا المتصفح نفسه (أكّد من المتصفح أو من تطبيق يشاركه الكوكيز)
   2) تذكرة العبور من التسجيل ← /api/auth/handoff يفتح الجلسة فور التأكيد */
function useAutoEnter(email) {
  const [state, setState] = useState('idle'); // idle | waiting | entering
  useEffect(() => {
    let stopped = false;
    let busy = false;
    let token = readTicket(email);
    const startedAt = Date.now();
    const supabase = createClient();
    if (token) setState('waiting');

    const enter = (path) => {
      stopped = true;
      clearTicket();
      setState('entering');
      window.location.replace(path);
    };

    async function check() {
      if (stopped || busy || document.visibilityState !== 'visible') return;
      if (Date.now() - startedAt > WATCH_MS) { stopped = true; setState('idle'); return; }
      busy = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email_confirmed_at) { enter(dashboardPathFor(user)); return; }
        }
        if (token) {
          const res = await fetch('/api/auth/handoff', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }), cache: 'no-store',
          });
          const j = await res.json().catch(() => ({}));
          if (j.ok && j.redirect) { enter(j.redirect); return; }
          if (j.expired) { token = null; clearTicket(); setState('idle'); }
        }
      } catch {
        // انقطاع مؤقت — نعيد المحاولة في الدورة التالية
      } finally {
        busy = false;
      }
    }

    check();
    const timer = setInterval(check, POLL_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', check);
    };
  }, [email]);
  return state;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email        = searchParams.get('email') ?? '';
  // سبب الوصول: بعد التسجيل (الافتراضي)، أو دخول بحساب لم يُؤكَّد (from=login)،
  // أو رابط تأكيد قديم لحساب لم يُؤكَّد (reason=expired) — لكلٍّ نصّه الصادق
  const mode = searchParams.get('reason') === 'expired' ? 'expired'
    : searchParams.get('from') === 'login' ? 'login' : 'signup';
  const TEXT = {
    signup:  { title: 'تحقق من بريدك الإلكتروني', lead: <>تم إنشاء حسابك بنجاح!<br />أرسلنا رابط التأكيد إلى:</>,
               body: <>افتح بريدك الإلكتروني واضغط على رابط التحقق لتفعيل حسابك.<br />إذا لم تجد الرسالة، تحقق من مجلد البريد المزعج (Spam).</> },
    login:   { title: 'بريدك لم يُؤكَّد بعد', lead: <>هذا الحساب لم يُفعَّل بعد:</>,
               body: <>اضغط «إعادة إرسال رابط التحقق» ثم افتح الرسالة الجديدة واضغط الرابط.<br />تأكّد أيضاً أن هذا هو البريد نفسه الذي سجّلت به.</> },
    expired: { title: 'انتهت صلاحية رابط التأكيد', lead: <>اطلب رابطاً جديداً لتفعيل الحساب:</>,
               body: <>اضغط «إعادة إرسال رابط التحقق» ثم افتح أحدث رسالة واضغط الرابط مرة واحدة.</> },
  }[mode];
  const [status,  setStatus]  = useState('idle'); // 'idle' | 'sending' | 'sent' | 'error'
  const [message, setMessage] = useState('');
  const auto = useAutoEnter(email);

  async function resend() {
    if (status === 'sending' || status === 'sent') return;
    setStatus('sending');
    setMessage('');
    try {
      const res  = await fetch('/api/auth/resend-verification', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(body.error ?? 'تعذَّر إعادة إرسال الرسالة — يرجى المحاولة مجدداً أو التواصل مع إدارة الأكاديمية.');
      } else {
        setStatus('sent');
        setMessage('تم إعادة إرسال رابط التحقق! تحقق من صندوق الوارد وملف البريد المزعج (Spam).');
      }
    } catch {
      setStatus('error');
      setMessage('تعذَّر الاتصال بالخادم — تحقق من الإنترنت وأعد المحاولة.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4EFE6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{
        maxWidth: 420, width: '100%',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 16px 40px rgba(26,43,74,.14), 0 4px 12px rgba(26,43,74,.07)',
        padding: '36px 28px 32px',
        textAlign: 'center',
      }}>

        {/* أيقونة الظرف */}
        <div style={{
          width: 72, height: 72, margin: '0 auto 20px',
          borderRadius: '50%', background: '#E8B84B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem',
          boxShadow: '0 6px 18px rgba(232,184,75,.4)',
        }}>
          ✉️
        </div>

        <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A2B4A', marginBottom: 10 }}>
          {TEXT.title}
        </h1>

        <p style={{ color: '#475569', fontSize: '.93rem', lineHeight: 1.8, marginBottom: email ? 6 : 20 }}>
          {TEXT.lead}
        </p>

        {email && (
          <div style={{
            background: '#F4EFE6', borderRadius: 10, padding: '10px 14px',
            fontSize: '.9rem', fontWeight: 700, color: '#1A2B4A',
            marginBottom: 20, wordBreak: 'break-all', direction: 'ltr',
          }}>
            {email}
          </div>
        )}

        <p style={{ color: '#64748b', fontSize: '.85rem', lineHeight: 1.7, marginBottom: 24 }}>
          {TEXT.body}
        </p>

        {/* الدخول التلقائي فور التأكيد */}
        {auto !== 'idle' && (
          <div role="status" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '12px 14px', borderRadius: 12, marginBottom: 18, fontSize: '.88rem', fontWeight: 700,
            background: auto === 'entering' ? '#dcfce7' : '#FAF7F2',
            color:      auto === 'entering' ? '#166534' : '#1A2B4A',
            border:     `1.5px solid ${auto === 'entering' ? '#bbf7d0' : '#EDE5D8'}`,
          }}>
            <style>{`@keyframes vePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.75)}}`}</style>
            {auto === 'entering'
              ? <span>✅ تم تأكيد بريدك! ندخلك الآن…</span>
              : <>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E8B84B', flexShrink: 0, animation: 'vePulse 1.2s ease infinite' }} />
                  <span>بعد الضغط على الرابط عُد إلى هنا — سندخلك تلقائياً</span>
                </>}
          </div>
        )}

        {/* رسالة نجاح / خطأ إعادة الإرسال */}
        {message && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: '.88rem', fontWeight: 600,
            background: status === 'sent'  ? '#dcfce7' : '#fee2e2',
            color:      status === 'sent'  ? '#166534' : '#991b1b',
            border:     `1px solid ${status === 'sent' ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {message}
          </div>
        )}

        {/* زر إعادة الإرسال */}
        {email && (
          <button
            onClick={resend}
            disabled={status === 'sending' || status === 'sent'}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, marginBottom: 14,
              border: '1.5px solid #1A2B4A',
              background: status === 'sent' ? '#f1f5f9' : 'transparent',
              color: status === 'sent' ? '#94a3b8' : '#1A2B4A',
              fontWeight: 700, fontSize: '.93rem', cursor: status === 'sending' || status === 'sent' ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background .15s',
            }}
          >
            {status === 'sending' ? 'جارٍ الإرسال...' : status === 'sent' ? 'تم الإرسال ✓' : 'إعادة إرسال رابط التحقق'}
          </button>
        )}

        <Link
          href={email ? `/auth/login?email=${encodeURIComponent(email)}` : '/auth/login'}
          style={{
            display: 'block', width: '100%', padding: '13px', borderRadius: 12,
            background: '#1A2B4A', color: '#E8B84B',
            fontWeight: 800, fontSize: '.93rem', textDecoration: 'none',
            boxShadow: '0 3px 12px rgba(26,43,74,.25)',
          }}
        >
          العودة لصفحة الدخول
        </Link>

        {mode === 'signup' && auto === 'idle' && (
          <p style={{ color: '#94a3b8', fontSize: '.8rem', lineHeight: 1.7, marginTop: 14, marginBottom: 0 }}>
            أكّدت بريدك من تطبيق أو جهاز آخر؟ اضغط «العودة لصفحة الدخول» وادخل بالبريد نفسه.
          </p>
        )}

      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
