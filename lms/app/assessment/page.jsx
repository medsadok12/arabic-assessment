export default function AssessmentPage() {

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 10 }}>
      <div style={{
        height: 48,
        background: '#185FA5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        direction: 'rtl',
      }}>
        <span style={{ color: '#fff', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: '1rem' }}>
          📚 أكاديمية عارم — التقييم التشخيصي
        </span>
        <a
          href="/dashboard"
          style={{
            color: 'rgba(255,255,255,.85)',
            fontFamily: 'Tajawal, sans-serif',
            fontSize: '.88rem',
            textDecoration: 'none',
            background: 'rgba(255,255,255,.15)',
            padding: '5px 14px',
            borderRadius: 7,
          }}
        >
          ← لوحة التحكم
        </a>
      </div>
      <iframe
        src="https://arabic-assessment.vercel.app"
        style={{ width: '100%', height: 'calc(100% - 48px)', border: 'none', display: 'block' }}
        title="التقييم التشخيصي"
        allow="microphone; camera"
      />
    </div>
  );
}
