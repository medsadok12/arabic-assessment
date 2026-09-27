import { useState } from 'react';

const LMS_URL = 'https://www.aarem.net';

/**
 * بوابة التقاط بيانات ولي الأمر — تظهر بعد انتهاء الطفل من الاختبار
 * القصير ("القيمة أولاً ثم الطلب": الطفل يُكمِل الاختبار كاملاً قبل أن
 * تُطلَب أي بيانات، تكتيك تسويقي قياسي لرفع نسبة الإكمال). النتيجة لا
 * تُعرَض إلا بعد نجاح هذا الإرسال — راجع QuickTestApp.jsx.
 */
export default function LeadGate({ childName, childAge, score, levelLabel, onDone }) {
  const [form,       setForm]       = useState({ parentName: '', phone: '', email: '' });
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit() {
    if (!form.parentName.trim() || !form.phone.trim()) {
      setError('يرجى إدخال الاسم ورقم الهاتف/واتساب لعرض النتيجة');
      return;
    }
    if (!/^[\d+\s-]{7,}$/.test(form.phone.trim())) {
      setError('يرجى إدخال رقم هاتف صحيح');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${LMS_URL}/api/leads`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-webhook-secret': import.meta.env.VITE_ASSESSMENT_WEBHOOK_SECRET ?? '' },
        body: JSON.stringify({
          parentName: form.parentName.trim(),
          phone:      form.phone.trim(),
          email:      form.email.trim() || null,
          childName,
          childAge,
          score,
          level: levelLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل الإرسال');
      onDone();
    } catch {
      setError('تعذّر إرسال البيانات. تحقق من اتصالك بالإنترنت وحاول مجدداً.');
      setSubmitting(false);
    }
  }

  return (
    <div className="page-content">
      <div className="results-header">
        <div className="results-icon">🎉</div>
        <h2>أحسنت، {childName}!</h2>
        <p>لقد أنهى {childName} الاختبار بنجاح</p>
      </div>

      <div className="thankyou-card" style={{ textAlign: 'center', marginBottom: 24 }}>
        <div className="thankyou-icon">🔒</div>
        <p className="thankyou-title">نتيجة {childName} جاهزة!</p>
        <p className="thankyou-sub">أدخل بياناتك لعرض النتيجة التفصيلية فوراً</p>
      </div>

      <div className="form-group">
        <label>اسمك (ولي الأمر) *</label>
        <input type="text" placeholder="أدخل اسمك الكامل" value={form.parentName} onChange={set('parentName')} />
      </div>
      <div className="form-group">
        <label>رقم الهاتف / واتساب *</label>
        <input type="tel" placeholder="مثال: 966501234567+" value={form.phone} onChange={set('phone')} />
      </div>
      <div className="form-group">
        <label>البريد الإلكتروني (اختياري)</label>
        <input type="email" placeholder="example@gmail.com" value={form.email} onChange={set('email')} />
      </div>

      {error && <div className="error-msg">⚠️ {error}</div>}

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={submitting}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
      >
        {submitting && <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />}
        {submitting ? 'جارٍ الإرسال...' : 'عرض النتيجة الآن ←'}
      </button>
    </div>
  );
}
