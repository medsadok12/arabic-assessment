import { useState, useEffect } from 'react';
import { generateAssessmentPDF } from '../utils/pdfGenerator.js';
import { LEVELS } from '../data/questions.js';

export default function Results({ studentInfo, finalLevel, scores, levelPath, allAnswers, onRestart }) {
  const [emailStatus, setEmailStatus] = useState('idle'); // idle | sending | success | error
  const [showPromoModal, setShowPromoModal] = useState(false);

  // Show the registration promo only after the teacher report is confirmed sent
  useEffect(() => {
    if (emailStatus === 'success') setShowPromoModal(true);
  }, [emailStatus]);

  useEffect(() => {
    const key = `sheets_saved_${studentInfo.name}_${Math.round(scores.overall)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    // Save to Google Sheets + anonymous Supabase record
    fetch('/api/save-result', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        studentName:  studentInfo.name,
        age:          studentInfo.age,
        email:        studentInfo.email,
        learnerType:  studentInfo.type,
        overallScore: scores.overall,
        finalLevel:   finalLevel,
        levelPath:    levelPath.join(' ← '),
        bySkill:      scores.bySkill,
      }),
    }).catch(() => {});

    // Save to LMS dashboard (links result to student account by email)
    fetch(`${import.meta.env.VITE_LMS_URL ?? 'https://www.aarem.net'}/api/save-assessment`, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-webhook-secret':  import.meta.env.VITE_ASSESSMENT_WEBHOOK_SECRET ?? '',
      },
      body:    JSON.stringify({
        email:        studentInfo.email,
        studentName:  studentInfo.name,
        overallScore: scores.overall,
        finalLevel:   finalLevel,
      }),
    }).catch(() => {});

    // Auto-send report to teacher/admin
    sendReport();
  }, []);

  const levelInfo = LEVELS.find(l => l.id === finalLevel);

  async function sendReport() {
    if (emailStatus === 'sending') return;
    setEmailStatus('sending');
    try {
      const pdfBase64 = await generateAssessmentPDF(studentInfo, scores, finalLevel, allAnswers ?? []);
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail:  studentInfo.email,
          studentName:  studentInfo.name,
          studentAge:   studentInfo.age,
          studentType:  studentInfo.type,
          pdfBase64,
          overallScore: scores.overall,
          finalLevel:   levelInfo?.name,
          bySkill:      scores.bySkill,
        }),
      });
      const data = await res.json();
      setEmailStatus(data.success ? 'success' : 'error');
    } catch {
      setEmailStatus('error');
    }
  }

  return (
    <div className="page-content">
      <div className="results-header">
        <div className="results-icon">🎉</div>
        <h2>أحسنت، {studentInfo.name}!</h2>
        <p>لقد أتممتَ التقييم بنجاح</p>
      </div>

      <div className="thankyou-card">
        {(emailStatus === 'idle' || emailStatus === 'sending') && (
          <>
            <div className="email-sending">
              <div className="spinner" />
              <span>جارٍ إرسال تقريرك إلى معلمك...</span>
            </div>
          </>
        )}

        {emailStatus === 'success' && (
          <>
            <div className="thankyou-icon">✅</div>
            <p className="thankyou-title">تم إرسال إجاباتك بنجاح إلى معلمك</p>
            <p className="thankyou-sub">
              سيطلع المعلم على نتيجتك ويُعدّ لك خطة دراسية مناسبة
            </p>
          </>
        )}

        {emailStatus === 'error' && (
          <>
            <div className="thankyou-icon">💪</div>
            <p className="thankyou-title">يبدو أن هناك مشكلة بسيطة في إرسال التقرير</p>
            <p className="thankyou-sub">
              نتيجتك محفوظة بأمان، لكن لم نتمكن من إرسال نسخة التقرير تلقائياً الآن
            </p>
            <div className="email-error" style={{ marginTop: 16 }}>
              ⚠️ جرّب إعادة الإرسال، أو تواصل مباشرة مع معلمك
            </div>
            <button
              className="btn-primary"
              style={{ marginTop: 14 }}
              onClick={sendReport}
            >
              🔄 إعادة إرسال التقرير
            </button>
          </>
        )}
      </div>

      <div className="result-actions">
        <button className="btn-primary" onClick={onRestart}>🔄 تقييم جديد</button>
      </div>

      {showPromoModal && (
        <div className="modal-overlay">
          <div className="modal-box" role="dialog" aria-modal="true" dir="rtl" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.6rem', marginBottom: 10 }}>🌟</div>
            <h2 className="modal-title" style={{ fontSize: '1.35rem' }}>
              خطوة واحدة تفصل طفلك عن التميز!
            </h2>
            <p style={{ fontSize: '.97rem', lineHeight: 1.9, color: '#2a2a2a', margin: '10px 0 24px' }}>
              لقد أتم بطلنا التقييم بنجاح وحصل على نتيجته. لا تدع هذا الحماس يتوقف!
              سجّل الآن في «أكاديمية عارم» ليحصل على خطة دراسية مخصصة، أوراق عمل تفاعلية،
              ومتابعة دقيقة تضمن تفوقه المستمر.
            </p>
            <a
              href="https://www.aarem.net/auth/register"
              className="btn-primary"
              style={{ display: 'block', boxSizing: 'border-box', textAlign: 'center', textDecoration: 'none' }}
            >
              🚀 تسجيل الطالب الآن (تأمين مقعده)
            </a>
            <a
              href="https://www.aarem.net/#register-section"
              style={{ display: 'block', marginTop: 16, fontSize: '.78rem', color: '#9a9a9a', textDecoration: 'underline' }}
            >
              سأقوم بالتسجيل لاحقاً (العودة للرئيسية)
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
