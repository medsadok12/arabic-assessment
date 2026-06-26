'use client';
import { Suspense, useState } from 'react';
import { useSearchParams }    from 'next/navigation';

function RescheduleForm() {
  const params = useSearchParams();
  const token  = params.get('token') ?? '';

  const [reason, setReason] = useState('');
  const [phase,  setPhase]  = useState('idle'); // idle | sending | done | error
  const [errMsg, setErrMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim() || phase === 'sending') return;
    setPhase('sending');
    try {
      const res  = await fetch('/api/interview/reschedule', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, reason }),
      });
      const data = await res.json();
      if (!res.ok) { setErrMsg(data.error || 'حدث خطأ غير متوقع'); setPhase('error'); return; }
      setPhase('done');
    } catch {
      setErrMsg('تعذّر الاتصال بالخادم — تحقق من اتصالك بالإنترنت');
      setPhase('error');
    }
  }

  const card = {
    background: '#fff', borderRadius: 18, padding: '38px 34px',
    maxWidth: 520, width: '100%',
    boxShadow: '0 6px 32px rgba(24,95,165,.13)',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f4f7fc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, direction: 'rtl',
      fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    }}>
      <div style={card}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ fontSize: '2.6rem', marginBottom: 10 }}>📅</div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#185FA5', margin: '0 0 6px' }}>
            طلب إعادة جدولة الموعد
          </h1>
          <p style={{ color: '#6b7280', fontSize: '.9rem', margin: 0 }}>
            أكاديمية عارم للتعليم
          </p>
        </div>

        {phase === 'done' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 14 }}>✅</div>
            <p style={{ fontWeight: 800, color: '#1a7c40', fontSize: '1.08rem', marginBottom: 10 }}>
              تمّ استلام طلبك بنجاح
            </p>
            <p style={{ color: '#475569', fontSize: '.93rem', lineHeight: 1.8, margin: 0 }}>
              سيراجع فريق الأكاديمية طلبك ويتواصل معك في أقرب وقت لتحديد موعد بديل مناسب.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: '#2d3748', fontSize: '.95rem', lineHeight: 1.8, marginBottom: 20, margin: '0 0 20px' }}>
              يُرجى توضيح سبب طلبك لتعديل الموعد وذكر الأوقات البديلة المناسبة لك إن أمكن.
            </p>

            {phase === 'error' && (
              <div style={{
                background: '#fdecea', color: '#b91c1c', padding: '11px 16px',
                borderRadius: 9, marginBottom: 16, fontSize: '.9rem', lineHeight: 1.6,
              }}>
                ⚠️ {errMsg}
              </div>
            )}

            <textarea
              value={reason}
              onChange={e => { setReason(e.target.value); if (phase === 'error') setPhase('idle'); }}
              rows={5}
              placeholder="مثال: لديّ ارتباط سابق في هذا الموعد، وأتمنى تأجيل المقابلة إلى يوم الخميس القادم في الفترة الصباحية بين 9 صباحاً و12 ظهراً..."
              style={{
                width: '100%', borderRadius: 11, border: '1.5px solid #d1d5db',
                padding: '13px 15px', fontFamily: 'inherit', fontSize: '.95rem',
                resize: 'vertical', direction: 'rtl', lineHeight: 1.75,
                outline: 'none', transition: 'border-color .2s',
                boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#185FA5')}
              onBlur={e => (e.target.style.borderColor = '#d1d5db')}
              required
            />

            <button
              type="submit"
              disabled={!reason.trim() || phase === 'sending'}
              style={{
                marginTop: 16, width: '100%', padding: '14px 24px',
                background: !reason.trim() || phase === 'sending' ? '#d1d5db' : '#9a5200',
                color: '#fff', border: 'none', borderRadius: 11,
                fontFamily: 'inherit', fontSize: '1rem', fontWeight: 800,
                cursor: !reason.trim() || phase === 'sending' ? 'not-allowed' : 'pointer',
                transition: 'background .2s',
              }}
            >
              {phase === 'sending' ? '...جارٍ الإرسال' : '📤 إرسال طلب تعديل الموعد'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 26, textAlign: 'center', fontSize: '.78rem', color: '#9ca3af' }}>
          أكاديمية عارم للتعليم — جميع الحقوق محفوظة
        </div>
      </div>
    </div>
  );
}

export default function ReschedulePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f4f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7280', fontSize: '1rem', fontFamily: 'Tahoma, Arial, sans-serif' }}>جارٍ التحميل...</div>
      </div>
    }>
      <RescheduleForm />
    </Suspense>
  );
}
