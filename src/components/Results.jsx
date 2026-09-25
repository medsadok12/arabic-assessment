import { useState, useEffect } from 'react';
import { generateAssessmentPDF, buildAnswerReport } from '../utils/pdfGenerator.js';
import { LEVELS } from '../data/questions.js';

export default function Results({ studentInfo, finalLevel, scores, levelPath, allAnswers, onRestart, isAdminPreview = false }) {
  // في وضع معاينة المشرف: 'skipped' حالة إضافية تعني "تم تخطي هذا الإجراء
  // عمداً"، تُعرَض للمشرف بوضوح بدل تحميل لا ينتهي أبداً (كان سيحدث لو بقي
  // emailStatus/syncStatus على 'idle' إلى الأبد دون استدعاء الدوال الفعلية).
  const [emailStatus, setEmailStatus] = useState('idle'); // idle | sending | success | error | skipped
  const [syncStatus,  setSyncStatus]  = useState('idle'); // idle | sending | success | error | skipped — مزامنة لوحة المعلم (LMS)، منفصلة عن حالة البريد
  const [showPromoModal, setShowPromoModal] = useState(false);

  // Show the registration promo only after the teacher report is confirmed sent
  // — لا تُعرَض إطلاقاً في وضع معاينة المشرف (لا معنى لدعوة "مشرف وهمي" للتسجيل)
  useEffect(() => {
    if (emailStatus === 'success' && !isAdminPreview) setShowPromoModal(true);
  }, [emailStatus, isAdminPreview]);

  // روابط التسجيلات الصوتية المرفوعة فعلياً (Vercel Blob) — تُجمَّع من كل
  // أسئلة النطق الثلاثة (speaking/listen-speak/oral-assessment) لتصل
  // للمعلم عبر لوحة التحكم لاحقاً، لا أن تبقى محفوظة على المتصفح فقط.
  function buildRecordings() {
    return (allAnswers ?? [])
      .filter((a) => a.audioUrl || a.recordingUrls?.length)
      .map((a) => ({
        questionId: a.questionId,
        skill:      a.skill,
        urls:       a.recordingUrls?.length ? a.recordingUrls : [a.audioUrl],
      }));
  }

  // مزامنة لوحة المعلم (LMS) — المسار الذي يجعل النتيجة تظهر فعلياً في bogga.
  // كان فشله (خطأ شبكة، أو حتى استجابة 401/500 غير مفحوصة) صامتاً تماماً —
  // لا الطفل ولا الولي ولا المعلم يعرف أن النتيجة لم تصل. أصبح الآن يُحدِّث
  // syncStatus بدقة (يفحص res.ok والحقل ok نفسه، لا الاكتفاء بعدم رمي استثناء)
  // ليظهر تنبيه وزر "إعادة المحاولة" عند الفشل الفعلي.
  async function syncToLMS() {
    setSyncStatus('sending');
    try {
      const recordings = buildRecordings();
      const answers    = buildAnswerReport(allAnswers ?? []);
      const res  = await fetch(`${import.meta.env.VITE_LMS_URL ?? 'https://www.aarem.net'}/api/save-assessment`, {
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
          recordings,
          answers,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSyncStatus('success');
      } else {
        console.error('[Results] فشل مزامنة اللوحة:', res.status, data);
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('[Results] فشل مزامنة اللوحة:', err.message);
      setSyncStatus('error');
    }
  }

  useEffect(() => {
    // نقطة حرجة: وضع معاينة المشرف لا يكتب أي نتيجة حقيقية إطلاقاً — لا في
    // لوحة bogga (syncToLMS)، ولا في السجل الثانوي (save-result)، ولا بريد
    // فعلي (sendReport) — فقط طباعة في console لتجربة تدفق الواجهة بأمان.
    if (isAdminPreview) {
      console.log('[معاينة المشرف] تم تخطي حفظ/إرسال النتيجة فعلياً. النتيجة المحسوبة:', {
        studentInfo, finalLevel, scores, levelPath,
        recordings: buildRecordings(),
        answers:    buildAnswerReport(allAnswers ?? []),
      });
      setSyncStatus('skipped');
      setEmailStatus('skipped');
      return;
    }

    const key = `sheets_saved_${studentInfo.name}_${Math.round(scores.overall)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    // سجلّ ثانوي (Google Sheets + نسخة Supabase مجهولة) — ليس المصدر الذي
    // يظهر منه المعلم النتيجة (ذاك هو syncToLMS)، فيبقى فشله صامتاً بلا
    // إزعاج الطفل/الولي بتنبيه لا يفهمانه، لكن مسجَّلاً في السجل للمراجعة.
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
    }).then((res) => {
      if (!res.ok) console.error('[Results] فشل حفظ السجل الثانوي:', res.status);
    }).catch((err) => console.error('[Results] فشل حفظ السجل الثانوي:', err.message));

    syncToLMS();

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

        {emailStatus === 'skipped' && (
          <>
            <div className="thankyou-icon">🚀</div>
            <p className="thankyou-title">وضع معاينة المشرف — لم يُرسَل أي بريد فعلي</p>
            <p className="thankyou-sub">النتيجة مطبوعة في console المتصفح للمراجعة فقط</p>
          </>
        )}
      </div>

      {syncStatus === 'error' && (
        <div className="thankyou-card" style={{ marginTop: 14 }}>
          <div className="thankyou-icon">💪</div>
          <p className="thankyou-title">لم تصل نتيجتك للوحة معلمك بعد</p>
          <p className="thankyou-sub">
            لا تقلق، نتيجتك محفوظة بأمان! فقط اضغط الزر لإعادة المحاولة
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: 14 }}
            onClick={syncToLMS}
          >
            🔄 إعادة المحاولة
          </button>
        </div>
      )}

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
