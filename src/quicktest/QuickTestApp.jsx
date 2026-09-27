import { useState, useEffect } from 'react';
import '../App.css';
import { QUESTIONS as FALLBACK_QUESTIONS, LEVELS as FALLBACK_LEVELS, DEFAULT_WHATSAPP_TEMPLATE } from './blueprint.js';
import { getQuicktestData } from './fetchQuicktestData.js';
import { pickLevelByScore } from './pickLevel.js';
import QuickQuestion from './QuickQuestion.jsx';
import LeadGate from './LeadGate.jsx';

const PAGES = { LOADING: 'loading', START: 'start', ASSESSMENT: 'assessment', GATE: 'gate', RESULT: 'result' };

/**
 * تدفق مستقل تماماً عن App.jsx — قمع تسويقي عام بلا كود تقييم (راجع
 * quickTestMode.js). الأسئلة/المستويات/قالب واتساب تُجلب ديناميكياً من
 * لوحة bogga (تبويب "إدارة الاختبار الترويجي") عبر fetchQuicktestData —
 * مع سقوط تلقائي وصامت لمحتوى blueprint.js الثابت عند أي فشل، فلا يتعطل
 * القمع أمام أي زائر مهما حدث لقاعدة البيانات (نفس فلسفة بنك التقييم
 * الحقيقي الثابت في src/data/questions.js).
 *
 * المستوى النهائي يُحدَّد من عدد الإجابات الصحيحة مقابل نطاق [أدنى,أعلى]
 * قابل للتعديل لكل مستوى (pickLevelByScore) — لا من موضع الأسئلة، لأن
 * الأسئلة نفسها قابلة للتعديل من نفس اللوحة.
 */
export default function QuickTestApp() {
  const [page, setPage]               = useState(PAGES.LOADING);
  const [questions, setQuestions]     = useState(FALLBACK_QUESTIONS);
  const [levels, setLevels]           = useState(FALLBACK_LEVELS);
  const [waTemplate, setWaTemplate]   = useState(DEFAULT_WHATSAPP_TEMPLATE);
  const [childName, setChildName]     = useState('');
  const [childAge, setChildAge]       = useState('');
  const [startError, setStartError]   = useState('');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers]         = useState([]);
  const [level, setLevel]             = useState(null);

  useEffect(() => {
    let cancelled = false;
    getQuicktestData().then(data => {
      if (cancelled) return;
      if (data.source === 'database') {
        setQuestions(data.questions);
        setLevels(data.levels);
        if (data.whatsappTemplate) setWaTemplate(data.whatsappTemplate);
      }
      setPage(PAGES.START);
    });
    return () => { cancelled = true; };
  }, []);

  function handleStart() {
    if (!childName.trim() || !childAge) {
      setStartError('يرجى إدخال اسم الطفل وعمره');
      return;
    }
    if (+childAge < 3 || +childAge > 15) {
      setStartError('هذا الاختبار مخصص لأعمار 3 إلى 15 سنة');
      return;
    }
    setStartError('');
    setAnswers([]);
    setQuestionIdx(0);
    setPage(PAGES.ASSESSMENT);
  }

  function handleAnswer(isCorrect) {
    const updated = [...answers, { isCorrect }];
    if (questionIdx + 1 < questions.length) {
      setAnswers(updated);
      setQuestionIdx(i => i + 1);
      return;
    }
    const correctCount = updated.filter(a => a.isCorrect).length;
    setLevel(pickLevelByScore(correctCount, levels));
    setPage(PAGES.GATE);
  }

  const progressPct = page === PAGES.ASSESSMENT
    ? Math.round((questionIdx / questions.length) * 100)
    : (page === PAGES.START || page === PAGES.LOADING ? 0 : 100);

  return (
    <div className="app">
      <header className="app-header">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="عارم أكاديمي" className="header-logo-img" />
        <div className="header-text">
          <div className="header-h1-row">
            <h1 lang="ar">عارم أكاديمي</h1>
          </div>
          <span className="header-en">AREM ACADEMY</span>
          <p>🎯 اختبار تحديد المستوى المجاني — بضع دقائق فقط</p>
        </div>
      </header>

      {page !== PAGES.START && page !== PAGES.LOADING && (
        <div className="global-progress">
          <div className="gp-info">
            <span>التقدم</span>
            <span>{progressPct}%</span>
          </div>
          <div className="gp-bar">
            <div className="gp-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <main className="app-main">
        {page === PAGES.LOADING && (
          <div className="page-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
          </div>
        )}

        {page === PAGES.START && (
          <div className="page-content">
            <h2 className="page-title">اختبار تحديد المستوى المجاني</h2>
            <p className="page-subtitle">
              أسئلة بسيطة وممتعة ومتدرجة (بضع دقائق) لمعرفة مستوى طفلك الحالي في اللغة العربية فوراً — بلا أي التزام.
            </p>
            <div className="form-group">
              <label>اسم الطفل *</label>
              <input type="text" placeholder="مثال: يوسف" value={childName} onChange={e => setChildName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>عمر الطفل *</label>
              <input type="number" min="3" max="15" placeholder="مثال: 6" value={childAge} onChange={e => setChildAge(e.target.value)} />
            </div>
            {startError && <div className="error-msg">⚠️ {startError}</div>}
            <button className="btn-primary" onClick={handleStart}>ابدأ الاختبار ←</button>
          </div>
        )}

        {page === PAGES.ASSESSMENT && (
          <QuickQuestion
            key={questionIdx}
            question={questions[questionIdx]}
            questionNumber={questionIdx + 1}
            total={questions.length}
            onAnswer={handleAnswer}
          />
        )}

        {page === PAGES.GATE && level && (
          <LeadGate
            childName={childName}
            childAge={+childAge}
            score={Math.round((answers.filter(a => a.isCorrect).length / questions.length) * 100)}
            levelLabel={level.label}
            onDone={() => setPage(PAGES.RESULT)}
          />
        )}

        {page === PAGES.RESULT && level && (
          <QuickTestResult childName={childName} level={level} waTemplate={waTemplate} />
        )}
      </main>
    </div>
  );
}

/**
 * تقرير تقييمي وصفي — لا نسبة مئوية أو أبعاد مفصَّلة، بطلب صريح من
 * الأستاذ محمد: بطاقة بسيطة وواضحة (نقاط القوة + التوصية + برنامج محدد)
 * تدفع ولي الأمر للتواصل فوراً، لا جدول أرقام تقني.
 */
function QuickTestResult({ childName, level, waTemplate }) {
  const waText = waTemplate
    .replaceAll('{childName}', childName)
    .replaceAll('{program}', level.program)
    .replaceAll('{المستوى}', level.label)
    .replaceAll('{level}', level.label);

  return (
    <div className="page-content">
      <div className="results-header">
        <div className="results-icon">{level.icon}</div>
        <h2>🌟 تقرير تقييم مستوى طفلك ({childName})</h2>
        <p>{level.label}</p>
      </div>

      <div className="thankyou-card">
        <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)', textAlign: 'center', lineHeight: 1.9 }}>
          {level.strengths}
        </p>
      </div>

      <div className="thankyou-card" style={{ marginTop: 14, textAlign: 'center' }}>
        <div className="thankyou-icon">🎯</div>
        <p className="thankyou-title">التوصية التربوية من أكاديمية عارم</p>
        <p style={{ color: 'var(--text-light)', fontSize: '.92rem', lineHeight: 1.9, margin: '8px 0 14px' }}>
          {level.recommendation}
        </p>
        <p className="thankyou-sub" style={{ fontWeight: 700, color: 'var(--primary)' }}>
          {level.program}
        </p>
        <p className="thankyou-sub">{level.programPitch}</p>
        <a
          href={`https://api.whatsapp.com/send/?phone=447400755914&text=${encodeURIComponent(waText)}&type=phone_number&app_absent=0`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', marginTop: 14 }}
        >
          📱 تواصل مع الأستاذ عبر واتساب لمناقشة الخطة
        </a>
      </div>
    </div>
  );
}
