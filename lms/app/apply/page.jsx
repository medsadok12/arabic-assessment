'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

const SPECIALTIES = [
  'اللغة العربية للناطقين بها',
  'اللغة العربية لغير الناطقين بها',
  'القرآن الكريم والتجويد',
  'الأدب العربي والبلاغة',
  'النحو والصرف',
  'أخرى',
];

export default function ApplyPage() {
  const [form, setForm]     = useState({ name: '', email: '', phone: '', experience: '', specialty: '', notes: '' });
  const [file, setFile]     = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [errMsg, setErrMsg] = useState('');
  const fileRef             = useRef();

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { setErrMsg('يُقبل ملف PDF فقط'); return; }
    if (f.size > 3 * 1024 * 1024)    { setErrMsg('حجم الملف يجب أن يكون أقل من 3 ميغابايت'); return; }
    setErrMsg('');
    setFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { name, email, phone, experience, specialty } = form;
    if (!name || !email || !phone || !experience || !specialty) {
      setErrMsg('يرجى ملء جميع الحقول المطلوبة'); return;
    }
    if (!file) { setErrMsg('يرجى رفع السيرة الذاتية بصيغة PDF'); return; }

    setStatus('uploading'); setErrMsg('');

    try {
      // Convert PDF to base64 directly in the browser
      const cvBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsDataURL(file);
      });

      // Single API call — no storage bucket needed
      const res  = await fetch('/api/recruitment/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, cvBase64, cvFilename: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال الطلب');

      setStatus('success');
    } catch (err) {
      setErrMsg(err.message || 'حدث خطأ، يرجى المحاولة مرة أخرى');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <>
        <Navbar />
        <div style={{
          minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #e8f8ef, #f0f6ff)', padding: 24, direction: 'rtl',
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '48px 40px',
            maxWidth: 480, width: '100%', textAlign: 'center',
            boxShadow: '0 8px 32px rgba(24,95,165,.12)',
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1a7c40', marginBottom: 12 }}>
              وصل طلبك بنجاح!
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.8, marginBottom: 28 }}>
              شكراً لاهتمامك بالانضمام إلى فريق أكاديمية عارم. سيتم مراجعة ملفك والتواصل معك في أقرب وقت ممكن.
            </p>
            <Link href="/" className="btn btn-primary btn-lg">
              العودة للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={{
        minHeight: '80vh', background: 'linear-gradient(135deg, #e8f0fb, #f8faff)',
        padding: '40px 20px', direction: 'rtl',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <Link href="/" style={{ color: 'var(--primary)', fontSize: '.88rem', textDecoration: 'none' }}>
              ← العودة للصفحة الرئيسية
            </Link>
            <div style={{ fontSize: '2.8rem', marginTop: 20, marginBottom: 10 }}>👨‍🏫</div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>
              انضم إلى فريق أكاديمية عارم
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: 1.7 }}>
              نبحث عن معلمين متميزين يؤمنون بأهمية اللغة العربية.<br />
              أكمل النموذج أدناه وسنتواصل معك قريباً.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{
            background: '#fff', borderRadius: 20,
            boxShadow: '0 4px 24px rgba(24,95,165,.10)',
            padding: '36px 32px',
          }}>

            {/* Name */}
            <div className="form-group">
              <label className="form-label">الاسم الكامل *</label>
              <input className="form-input" type="text" placeholder="أدخل اسمك الكامل"
                value={form.name} onChange={set('name')} required />
            </div>

            {/* Email + Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني *</label>
                <input className="form-input" type="email" placeholder="example@gmail.com"
                  value={form.email} onChange={set('email')} required />
              </div>
              <div className="form-group">
                <label className="form-label">رقم الهاتف (واتساب) *</label>
                <input className="form-input" type="tel" placeholder="+44 7xxx xxxxxx"
                  value={form.phone} onChange={set('phone')} required dir="ltr" />
              </div>
            </div>

            {/* Experience + Specialty */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">سنوات الخبرة *</label>
                <select className="form-input" value={form.experience} onChange={set('experience')} required>
                  <option value="">اختر...</option>
                  <option value="أقل من سنة">أقل من سنة</option>
                  <option value="1-3 سنوات">1–3 سنوات</option>
                  <option value="3-5 سنوات">3–5 سنوات</option>
                  <option value="5-10 سنوات">5–10 سنوات</option>
                  <option value="أكثر من 10 سنوات">أكثر من 10 سنوات</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">التخصص التعليمي *</label>
                <select className="form-input" value={form.specialty} onChange={set('specialty')} required>
                  <option value="">اختر...</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">ملاحظات إضافية (اختياري)</label>
              <textarea className="form-input" rows={3} placeholder="أي معلومات إضافية تود مشاركتها..."
                value={form.notes} onChange={set('notes')}
                style={{ resize: 'vertical', lineHeight: 1.7 }} />
            </div>

            {/* CV Upload */}
            <div className="form-group">
              <label className="form-label">السيرة الذاتية (PDF فقط) *</label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${file ? '#1a7c40' : 'var(--border)'}`,
                  borderRadius: 12, padding: '20px 16px', textAlign: 'center',
                  cursor: 'pointer', background: file ? '#e8f8ef' : 'var(--bg)',
                  transition: 'all .2s',
                }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>
                  {file ? '✅' : '📄'}
                </div>
                <div style={{ fontSize: '.88rem', fontWeight: 700, color: file ? '#1a7c40' : 'var(--muted)' }}>
                  {file ? file.name : 'اضغط لرفع ملف PDF'}
                </div>
                {!file && (
                  <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginTop: 4 }}>
                    الحد الأقصى: 3 ميغابايت
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf"
                onChange={handleFile} style={{ display: 'none' }} />
            </div>

            {/* Error */}
            {errMsg && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                ⚠️ {errMsg}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="btn btn-primary btn-lg"
              disabled={status === 'uploading'}
              style={{ width: '100%', justifyContent: 'center', gap: 10 }}>
              {status === 'uploading' ? (
                <><span className="spinner" />جارٍ إرسال الطلب...</>
              ) : (
                '📤 إرسال طلب الترشح'
              )}
            </button>

          </form>

          {/* Info footer */}
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.82rem', marginTop: 20 }}>
            للاستفسار المباشر:{' '}
            <a href="https://api.whatsapp.com/send/?phone=447400755914"
              target="_blank" rel="noopener noreferrer"
              style={{ color: '#1a7c40', fontWeight: 700 }}>
              واتساب الأكاديمية
            </a>
          </p>

        </div>
      </div>
    </>
  );
}
