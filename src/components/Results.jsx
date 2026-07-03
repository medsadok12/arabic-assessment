import { useState, useEffect } from 'react';
import { generateAssessmentPDF } from '../utils/pdfGenerator.js';
import { LEVELS } from '../data/questions.js';
import { getAvatarForScore, AVATAR_LEVELS } from '../utils/scoring.js';

export default function Results({ studentInfo, finalLevel, scores, levelPath, onRestart }) {
  const [emailStatus, setEmailStatus] = useState('idle'); // idle | sending | success | error

  useEffect(() => {
    const key = `sheets_saved_${studentInfo.name}_${Math.round(scores.overall)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    // Save result in background
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

    // Auto-send report to teacher/admin
    sendReport();
  }, []);

  const levelInfo = LEVELS.find(l => l.id === finalLevel);

  async function sendReport() {
    if (emailStatus === 'sending') return;
    setEmailStatus('sending');
    try {
      const pdfBase64 = await generateAssessmentPDF(studentInfo, scores, finalLevel);
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

  const earnedAvatar = getAvatarForScore(scores.overall);

  return (
    <div className="page-content">
      <div className="results-header">
        <div className="results-avatar" style={{ '--av-color': earnedAvatar.color, '--av-bg': earnedAvatar.bg }}>
          <span>{earnedAvatar.emoji}</span>
        </div>
        <div className="results-avatar-label" style={{ color: earnedAvatar.color }}>
          {earnedAvatar.label}
        </div>
        <h2>أحسنت، {studentInfo.name}!</h2>
        <p>لقد أتممتَ التقييم بنجاح</p>
        <div className="results-avatar-progress">
          {AVATAR_LEVELS.map((av, i) => (
            <div
              key={av.label}
              className={`rap-step${scores.overall >= av.minScore ? ' rap-earned' : ''}`}
              title={av.label}
              style={{ '--av-color': av.color }}
            >
              <span>{av.emoji}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="thankyou-card">
        <div className="thankyou-icon">✅</div>
        <p className="thankyou-title">تم إرسال إجاباتك بنجاح إلى معلمك</p>
        <p className="thankyou-sub">
          سيطلع المعلم على نتيجتك ويُعدّ لك خطة دراسية مناسبة
        </p>

        {emailStatus === 'sending' && (
          <div className="email-sending" style={{ marginTop: 16 }}>
            <div className="spinner" />
            <span>جاري إرسال التقرير...</span>
          </div>
        )}

        {emailStatus === 'success' && (
          <div className="email-success" style={{ marginTop: 16 }}>
            📧 تم إرسال التقرير إلى المعلم
          </div>
        )}

        {emailStatus === 'error' && (
          <div className="email-error" style={{ marginTop: 16 }}>
            ⚠️ لم يتم إرسال التقرير — يرجى التواصل مع المعلم
          </div>
        )}
      </div>

      <div className="result-actions">
        <button className="btn-primary" onClick={onRestart}>🔄 تقييم جديد</button>
      </div>
    </div>
  );
}
