'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email        = searchParams.get('email') ?? '';
  const [status,  setStatus]  = useState('idle'); // 'idle' | 'sending' | 'sent' | 'error'
  const [message, setMessage] = useState('');

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
          تحقق من بريدك الإلكتروني
        </h1>

        <p style={{ color: '#475569', fontSize: '.93rem', lineHeight: 1.8, marginBottom: email ? 6 : 20 }}>
          تم إنشاء حسابك بنجاح!
          <br />
          أرسلنا رابط التأكيد إلى:
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
          افتح بريدك الإلكتروني واضغط على رابط التحقق لتفعيل حسابك.
          <br />
          إذا لم تجد الرسالة، تحقق من مجلد البريد المزعج (Spam).
        </p>

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
          href="/auth/login"
          style={{
            display: 'block', width: '100%', padding: '13px', borderRadius: 12,
            background: '#1A2B4A', color: '#E8B84B',
            fontWeight: 800, fontSize: '.93rem', textDecoration: 'none',
            boxShadow: '0 3px 12px rgba(26,43,74,.25)',
          }}
        >
          العودة لصفحة الدخول
        </Link>

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
