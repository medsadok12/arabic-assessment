import { useState } from 'react';

const LMS_URL = 'https://aarem-lms.vercel.app';

export default function StudentInfo({ onStart }) {
  const [form,           setForm]           = useState({ name: '', age: '', email: '', type: '', code: '' });
  const [error,          setError]          = useState('');
  const [validating,     setValidating]     = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil,    setLockedUntil]    = useState(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setCode = (e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') }));

  async function handleStart() {
    if (lockedUntil && Date.now() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`لقد تجاوزت عدد المحاولات المسموحة. يرجى الانتظار ${remaining} ثانية أو التواصل مع إدارة الأكاديمية.`);
      return;
    }

    const { name, age, email, type, code } = form;

    if (!name.trim() || !age || !email.trim() || !type || !code.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (+age < 5 || +age > 60) {
      setError('العمر يجب أن يكون بين 5 و 60 سنة');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    setValidating(true);
    setError('');
    try {
      const res  = await fetch(`${LMS_URL}/api/public/validate-student-code`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!data.valid) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 5) {
          const lockTime = Date.now() + 120_000;
          setLockedUntil(lockTime);
          setError('لقد تجاوزت عدد المحاولات المسموحة (5 محاولات). يرجى الانتظار دقيقتين أو التواصل مع إدارة الأكاديمية.');
        } else {
          setError(`عذراً، كود التقييم غير صحيح. (المحاولة ${newAttempts}/5) يرجى مراجعة إدارة الأكاديمية.`);
        }
        setValidating(false);
        return;
      }
    } catch {
      setError('تعذّر التحقق من الكود. تأكد من اتصالك بالإنترنت وأعد المحاولة.');
      setValidating(false);
      return;
    }

    setValidating(false);
    onStart({ name: name.trim(), age: +age, email: email.trim(), type });
  }

  return (
    <div className="page-content">
      <h2 className="page-title">معلومات الطالب</h2>
      <p className="page-subtitle">أدخل بياناتك للبدء في التقييم</p>

      <div className="form-group">
        <label>اسم الطالب كاملاً *</label>
        <input
          type="text"
          placeholder="أدخل الاسم الكامل"
          value={form.name}
          onChange={set('name')}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>العمر *</label>
          <input
            type="number"
            placeholder="مثال: 12"
            min="5"
            max="60"
            value={form.age}
            onChange={set('age')}
          />
        </div>
        <div className="form-group">
          <label>البريد الإلكتروني *</label>
          <input
            type="email"
            placeholder="example@gmail.com"
            value={form.email}
            onChange={set('email')}
          />
        </div>
      </div>

      <div className="form-group">
        <label>نوع المتعلم *</label>
        <select value={form.type} onChange={set('type')}>
          <option value="">اختر نوع المتعلم</option>
          <option value="native">ناطق باللغة العربية</option>
          <option value="non-native">غير ناطق باللغة العربية</option>
        </select>
      </div>

      <div className="form-group">
        <label>كود التقييم *</label>
        <input
          type="text"
          placeholder="أدخل كود التقييم الممنوح لك من الإدارة"
          value={form.code}
          onChange={setCode}
          style={{ letterSpacing: '0.08em', fontFamily: 'monospace', fontSize: '1rem' }}
        />
      </div>

      {error && <div className="error-msg">⚠️ {error}</div>}

      <button className="btn-primary" onClick={handleStart}
        disabled={validating || (lockedUntil && Date.now() < lockedUntil)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {validating && <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />}
        {validating ? 'جارٍ التحقق من الكود...' : (lockedUntil && Date.now() < lockedUntil) ? '🔒 محظور مؤقتاً' : 'ابدأ رحلة التميز ←'}
      </button>

    </div>
  );
}
