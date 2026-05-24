import { useState, useEffect } from 'react';
import { getGradeInfo } from '../utils/scoring.js';
import { generateAssessmentPDF } from '../utils/pdfGenerator.js';
import { LEVELS, SKILLS } from '../data/questions.js';

export default function Results({ studentInfo, finalLevel, scores, levelPath, onRestart }) {
  const [emailStatus, setEmailStatus] = useState('idle'); // idle | sending | success | error
  const [errorMsg,    setErrorMsg]    = useState('');

  useEffect(() => {
    // منع الحفظ المزدوج عند إعادة تحميل الصفحة
    const key = `sheets_saved_${studentInfo.name}_${Math.round(scores.overall)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
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
  }, []);

  const grade     = getGradeInfo(scores.overall);
  const levelInfo = LEVELS.find(l => l.id === finalLevel);
  const stars     = '⭐'.repeat(grade.stars) + '☆'.repeat(5 - grade.stars);

  async function handleSendReport() {
    setEmailStatus('sending');
    setErrorMsg('');
    try {
      const pdfBase64 = await generateAssessmentPDF(studentInfo, scores, finalLevel);

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail: studentInfo.email,
          studentName: studentInfo.name,
          studentAge:  studentInfo.age,
          studentType: studentInfo.type,
          pdfBase64,
          overallScore: scores.overall,
          finalLevel:   levelInfo?.name,
          bySkill:      scores.bySkill,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEmailStatus('success');
      } else {
        throw new Error(data.error || 'فشل الإرسال');
      }
    } catch (err) {
      setEmailStatus('error');
      setErrorMsg(err.message);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="page-content">
      <div className="results-header">
        <div className="results-icon">🎉</div>
        <h2>تهانينا، {studentInfo.name}!</h2>
        <p>لقد أتممتَ التقييم بنجاح</p>
      </div>

      <div className="score-card" style={{ borderColor: grade.color }}>
        <div className="score-circle" style={{ background: grade.color }}>
          <span className="score-big">{Math.round(scores.overall)}%</span>
        </div>
        <div className="score-details">
          <div className="grade-label" style={{ color: grade.color }}>{grade.label}</div>
          <div className="stars">{stars}</div>
          <div className="level-result">
            {levelInfo?.icon} المستوى: <strong>{levelInfo?.name}</strong>
          </div>
        </div>
      </div>

      {levelPath.length > 1 && (
        <div className="jump-path">
          <h3>مسار التقييم الذكي</h3>
          <div className="path-steps">
            {levelPath.map((lvl, i) => {
              const li = LEVELS.find(l => l.id === lvl);
              return (
                <span key={i} className="path-step">
                  {li?.icon} {li?.name}
                  {i < levelPath.length - 1 && <span className="path-arrow"> → </span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="skills-section">
        <h3>تفاصيل المهارات</h3>
        {SKILLS.map(skill => {
          const s = scores.bySkill[skill.id];
          if (!s) return null;
          const pct   = Math.round(s.score);
          const color = pct >= 80 ? '#2e7d32' : pct >= 60 ? '#e65100' : '#c62828';
          return (
            <div key={skill.id} className="skill-row">
              <div className="skill-header">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-pct" style={{ color }}>{pct}%</span>
              </div>
              <div className="skill-bar-bg">
                <div className="skill-bar-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
              <div className="skill-meta">{s.correct} / {s.total} إجابة صحيحة</div>
            </div>
          );
        })}
      </div>

      <div className="recommendations">
        <h3>التوصيات</h3>
        <RecommendationsList scores={scores} />
      </div>

      {/* Email section */}
      <div className="email-section">
        <h3>إرسال التقرير</h3>
        <p className="email-note">
          📧 سيُرسَل التقرير PDF إلى: <strong>{studentInfo.email}</strong>
          <br />وإلى إدارة الأكاديمية تلقائياً
        </p>

        {emailStatus === 'idle' && (
          <button className="btn-send" onClick={handleSendReport}>
            📤 إرسال التقرير بالبريد الإلكتروني
          </button>
        )}

        {emailStatus === 'sending' && (
          <div className="email-sending">
            <div className="spinner" />
            <span>جاري إنشاء وإرسال التقرير...</span>
          </div>
        )}

        {emailStatus === 'success' && (
          <div className="email-success">
            ✅ تم إرسال التقرير بنجاح إلى {studentInfo.email}
          </div>
        )}

        {emailStatus === 'error' && (
          <div className="email-error">
            ❌ فشل الإرسال: {errorMsg}
            <button className="btn-retry" onClick={handleSendReport}>إعادة المحاولة</button>
          </div>
        )}
      </div>

      <div className="result-actions">
        <button className="btn-primary" onClick={onRestart}>🔄 تقييم جديد</button>
        <button className="btn-secondary" onClick={handlePrint}>🖨️ طباعة التقرير</button>
      </div>
    </div>
  );
}

function RecommendationsList({ scores }) {
  const weak = SKILLS.filter(s => scores.bySkill[s.id]?.score < 70);
  if (weak.length === 0) {
    return <p className="rec-good">أداء ممتاز في جميع المهارات! استمر في التطوير.</p>;
  }
  return (
    <ul className="rec-list">
      {weak.map(s => (
        <li key={s.id}>
          <strong>{s.name}</strong>: تحتاج إلى مزيد من التدريب والممارسة.
        </li>
      ))}
    </ul>
  );
}
