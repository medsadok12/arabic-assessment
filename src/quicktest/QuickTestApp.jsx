import { useState } from 'react';
import '../App.css';
import Assessment from '../components/Assessment.jsx';
import { getQuickTestQuestions } from '../data/quickTestQuestions.js';
import { calculateLevelScore } from '../utils/scoring.js';
import { levelFromScore } from './levelLabel.js';
import LeadGate from './LeadGate.jsx';

const QUESTIONS = getQuickTestQuestions();
const PAGES = { START: 'start', ASSESSMENT: 'assessment', GATE: 'gate', RESULT: 'result' };

/**
 * تدفق مستقل تماماً عن App.jsx — قمع تسويقي عام بلا كود تقييم (راجع
 * quickTestMode.js)، اختبار مسطّح قصير (12 سؤالاً، بلا مستويات تصاعدية
 * ولا منطق ترقية/إنزال)، ثم بوابة تواصل ولي الأمر قبل عرض النتيجة.
 * يُعاد استخدام Assessment.jsx كما هو (يقبل أي مصفوفة أسئلة مسطّحة) —
 * لا تكرار لمنطق عرض الأسئلة/الأنواع الثلاثة والعشرين.
 */
export default function QuickTestApp() {
  const [page, setPage]               = useState(PAGES.START);
  const [childName, setChildName]     = useState('');
  const [childAge, setChildAge]       = useState('');
  const [startError, setStartError]   = useState('');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [scores, setScores]           = useState(null);

  function handleStart() {
    if (!childName.trim() || !childAge) {
      setStartError('يرجى إدخال اسم الطفل وعمره');
      return;
    }
    if (+childAge < 5 || +childAge > 15) {
      setStartError('هذا الاختبار مخصص لأعمار 5 إلى 15 سنة');
      return;
    }
    setStartError('');
    setPage(PAGES.ASSESSMENT);
  }

  const progressPct = page === PAGES.ASSESSMENT
    ? Math.round((questionIdx / QUESTIONS.length) * 100)
    : (page === PAGES.START ? 0 : 100);

  const lvl = scores ? levelFromScore(scores.overall) : null;

  return (
    <div className="app">
      <header className="app-header">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="عارم أكاديمي" className="header-logo-img" />
        <div className="header-text">
          <div className="header-h1-row">
            <h1 lang="ar">عارم أكاديمي</h1>
          </div>
          <span className="header-en">AREM ACADEMY</span>
          <p>🎯 اختبار تحديد المستوى المجاني — 5 دقائق فقط</p>
        </div>
      </header>

      {page !== PAGES.START && (
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
        {page === PAGES.START && (
          <div className="page-content">
            <h2 className="page-title">اختبار تحديد المستوى المجاني</h2>
            <p className="page-subtitle">
              12 سؤالاً بسيطاً (حوالي 5 دقائق) لمعرفة مستوى طفلك الحالي في اللغة العربية فوراً — بلا أي التزام.
            </p>
            <div className="form-group">
              <label>اسم الطفل *</label>
              <input type="text" placeholder="مثال: يوسف" value={childName} onChange={e => setChildName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>عمر الطفل *</label>
              <input type="number" min="5" max="15" placeholder="مثال: 8" value={childAge} onChange={e => setChildAge(e.target.value)} />
            </div>
            {startError && <div className="error-msg">⚠️ {startError}</div>}
            <button className="btn-primary" onClick={handleStart}>ابدأ الاختبار ←</button>
          </div>
        )}

        {page === PAGES.ASSESSMENT && (
          <QuestionRunner
            childName={childName}
            childAge={+childAge}
            questionIdx={questionIdx}
            onFinish={(finalAnswers) => {
              setScores(calculateLevelScore(finalAnswers));
              setPage(PAGES.GATE);
            }}
            onAdvance={() => setQuestionIdx(i => i + 1)}
          />
        )}

        {page === PAGES.GATE && scores && (
          <LeadGate
            childName={childName}
            childAge={+childAge}
            score={Math.round(scores.overall * 10) / 10}
            levelLabel={lvl.label}
            onDone={() => setPage(PAGES.RESULT)}
          />
        )}

        {page === PAGES.RESULT && scores && (
          <QuickTestResult childName={childName} scores={scores} lvl={lvl} />
        )}
      </main>
    </div>
  );
}

/** يحمل مصفوفة الإجابات المتراكمة داخلياً (بمعزل عن حالة الصفحة الأعلى)
 *  ويستدعي onAdvance/onFinish عند كل إجابة — يبسّط QuickTestApp أعلاه من
 *  الحاجة لتمرير/تجميع answers يدوياً عبر كل إعادة رسم. */
function QuestionRunner({ childName, childAge, questionIdx, onAdvance, onFinish }) {
  const [answers] = useState(() => ({ list: [] }));

  function handleAnswer(answerObj) {
    answers.list.push(answerObj);
    if (questionIdx + 1 < QUESTIONS.length) onAdvance();
    else onFinish(answers.list);
  }

  return (
    <Assessment
      key={questionIdx}
      questions={QUESTIONS}
      currentLevel={1}
      questionIndex={questionIdx}
      studentInfo={{ name: childName, age: childAge, type: 'native' }}
      headerLabel="🎯 اختبار تحديد المستوى السريع"
      onAnswer={handleAnswer}
    />
  );
}

function QuickTestResult({ childName, scores, lvl }) {
  const overall = Math.round(scores.overall);
  const skillRows = Object.values(scores.bySkill).filter(s => s.total > 0);
  const waText = `مرحباً، أخذ ابني/ابنتي ${childName} اختبار تحديد المستوى المجاني وحصل على ${overall}% (${lvl.label})، أرغب بمعرفة المزيد عن حصص أكاديمية عارم.`;

  return (
    <div className="page-content">
      <div className="results-header">
        <div className="results-icon">{lvl.icon}</div>
        <h2>نتيجة {childName}</h2>
        <p>مستوى {childName} الحالي في اللغة العربية</p>
      </div>

      <div className="thankyou-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.6rem', fontWeight: 900, color: 'var(--primary)' }}>{overall}%</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--secondary)', margin: '4px 0 20px' }}>
          المستوى: {lvl.label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'right' }}>
          {skillRows.map(s => (
            <div key={s.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
                <span>{s.name}</span><span>{Math.round(s.score)}%</span>
              </div>
              <div style={{ height: 8, background: '#eee', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round(s.score)}%`, height: '100%', background: 'linear-gradient(90deg, #d4952a, #e8b84a)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="thankyou-card" style={{ marginTop: 14, textAlign: 'center' }}>
        <div className="thankyou-icon">💬</div>
        <p className="thankyou-title">هل تريد تقريراً تفصيلياً وخطة دراسية لـ{childName}؟</p>
        <p className="thankyou-sub">تواصل معنا الآن عبر واتساب وسنرد عليك خلال دقائق</p>
        <a
          href={`https://api.whatsapp.com/send/?phone=447400755914&text=${encodeURIComponent(waText)}&type=phone_number&app_absent=0`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', marginTop: 14 }}
        >
          📱 تواصل معنا عبر واتساب
        </a>
      </div>
    </div>
  );
}
