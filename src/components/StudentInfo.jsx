import { useState } from 'react';

const LMS_URL = 'https://www.aarem.net';

export const AVATARS = [
  { id: 'lion',      emoji: '🦁', label: 'الأسد',    color: '#f59e0b' },
  { id: 'tiger',     emoji: '🐯', label: 'النمر',    color: '#f97316' },
  { id: 'fox',       emoji: '🦊', label: 'الثعلب',   color: '#ef4444' },
  { id: 'bear',      emoji: '🐻', label: 'الدب',     color: '#92400e' },
  { id: 'frog',      emoji: '🐸', label: 'الضفدع',   color: '#22c55e' },
  { id: 'panda',     emoji: '🐼', label: 'الباندا',  color: '#6b7280' },
  { id: 'eagle',     emoji: '🦅', label: 'النسر',    color: '#3b82f6' },
  { id: 'butterfly', emoji: '🦋', label: 'الفراشة',  color: '#a855f7' },
  { id: 'star',      emoji: '⭐', label: 'النجمة',   color: '#eab308' },
  { id: 'rocket',    emoji: '🚀', label: 'الصاروخ',  color: '#6366f1' },
  { id: 'book',      emoji: '📚', label: 'الكتاب',   color: '#0ea5e9' },
  { id: 'crown',     emoji: '👑', label: 'التاج',    color: '#f59e0b' },
];

export default function StudentInfo({ onStart }) {
  const [form,           setForm]           = useState({ name: '', age: '', email: '', type: '', code: '', avatar: '' });
  const [error,          setError]          = useState('');
  const [validating,     setValidating]     = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil,    setLockedUntil]    = useState(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setCode = (e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') }));
  const setAvatar = (id) => setForm((f) => ({ ...f, avatar: id }));

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
    if (!form.avatar) {
      setError('يرجى اختيار أفاتار يمثّلك');
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
        body:    JSON.stringify({ code: code.trim(), name: name.trim() }),
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
    onStart({ name: name.trim(), age: +age, email: email.trim(), type, avatar: form.avatar });
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
        <label>اختر أفاتارك *</label>
        <div className="avatar-grid">
          {AVATARS.map((av) => (
            <button
              key={av.id}
              type="button"
              className={`avatar-option${form.avatar === av.id ? ' avatar-selected' : ''}`}
              style={{ '--av-color': av.color }}
              onClick={() => setAvatar(av.id)}
              title={av.label}
              aria-label={av.label}
              aria-pressed={form.avatar === av.id}
            >
              <span className="avatar-emoji">{av.emoji}</span>
              {form.avatar === av.id && <span className="avatar-check">✓</span>}
            </button>
          ))}
        </div>
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
        <p style={{ fontSize: '.82rem', color: '#64748b', marginTop: 7, lineHeight: 1.6 }}>
          للحصول على رمز التقييم، تواصل مع الإدارة عبر{' '}
          <a
            href="https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1a7c40', fontWeight: 700, textDecoration: 'underline' }}
          >
            واتساب
          </a>
        </p>
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
