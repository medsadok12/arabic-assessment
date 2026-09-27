import { useState } from 'react';
import '../App.css';
import Assessment from '../components/Assessment.jsx';
import { resolveQuestionsByIds } from '../data/quickTestQuestions.js';
import { pickTrack, scoreTrack, qualitativeLabel } from './tracks.js';
import LeadGate from './LeadGate.jsx';

const PAGES = { START: 'start', ASSESSMENT: 'assessment', GATE: 'gate', RESULT: 'result' };

/**
 * تدفق مستقل تماماً عن App.jsx — قمع تسويقي عام بلا كود تقييم (راجع
 * quickTestMode.js)، ثلاثة مسارات ثابتة حسب عمر الطفل (tracks.js) بلا أي
 * عشوائية، ثم بوابة تواصل ولي الأمر قبل عرض تقرير تقييمي (لا نسبة جافة
 * فقط) يوصي ببرنامج محدد. يُعاد استخدام Assessment.jsx كما هو — لا تكرار
 * لمنطق عرض الأسئلة/الأنواع الثلاثة والعشرين.
 */
export default function QuickTestApp() {
  const [page, setPage]               = useState(PAGES.START);
  const [childName, setChildName]     = useState('');
  const [childAge, setChildAge]       = useState('');
  const [startError, setStartError]   = useState('');
  const [track, setTrack]             = useState(null);
  const [questions, setQuestions]     = useState([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [report, setReport]           = useState(null);

  function handleStart() {
    if (!childName.trim() || !childAge) {
      setStartError('يرجى إدخال اسم الطفل وعمره');
      return;
    }
    if (+childAge < 4 || +childAge > 15) {
      setStartError('هذا الاختبار مخصص لأعمار 4 إلى 15 سنة');
      return;
    }
    setStartError('');
    const t = pickTrack(+childAge);
    setTrack(t);
    setQuestions(resolveQuestionsByIds(t.questions.map(q => q.id)));
    setQuestionIdx(0);
    setPage(PAGES.ASSESSMENT);
  }

  const progressPct = page === PAGES.ASSESSMENT
    ? Math.round((questionIdx / questions.length) * 100)
    : (page === PAGES.START ? 0 : 100);

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
              أسئلة بسيطة وممتعة (3 إلى 5 دقائق حسب عمر طفلك) لمعرفة مستواه الحالي في اللغة العربية فوراً — بلا أي التزام.
            </p>
            <div className="form-group">
              <label>اسم الطفل *</label>
              <input type="text" placeholder="مثال: يوسف" value={childName} onChange={e => setChildName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>عمر الطفل *</label>
              <input type="number" min="4" max="15" placeholder="مثال: 6" value={childAge} onChange={e => setChildAge(e.target.value)} />
            </div>
            {startError && <div className="error-msg">⚠️ {startError}</div>}
            <button className="btn-primary" onClick={handleStart}>ابدأ الاختبار ←</button>
          </div>
        )}

        {page === PAGES.ASSESSMENT && (
          <QuestionRunner
            questions={questions}
            childName={childName}
            childAge={+childAge}
            questionIdx={questionIdx}
            onFinish={(finalAnswers) => {
              setReport(scoreTrack(track, finalAnswers));
              setPage(PAGES.GATE);
            }}
            onAdvance={() => setQuestionIdx(i => i + 1)}
          />
        )}

        {page === PAGES.GATE && report && (
          <LeadGate
            childName={childName}
            childAge={+childAge}
            score={report.overall}
            levelLabel={track.label}
            onDone={() => setPage(PAGES.RESULT)}
          />
        )}

        {page === PAGES.RESULT && report && (
          <QuickTestResult childName={childName} track={track} report={report} />
        )}
      </main>
    </div>
  );
}

/** يحمل مصفوفة الإجابات المتراكمة داخلياً (بمعزل عن حالة الصفحة الأعلى)
 *  ويستدعي onAdvance/onFinish عند كل إجابة — يبسّط QuickTestApp أعلاه من
 *  الحاجة لتمرير/تجميع answers يدوياً عبر كل إعادة رسم. */
function QuestionRunner({ questions, childName, childAge, questionIdx, onAdvance, onFinish }) {
  const [answers] = useState(() => ({ list: [] }));

  function handleAnswer(answerObj) {
    answers.list.push(answerObj);
    if (questionIdx + 1 < questions.length) onAdvance();
    else onFinish(answers.list);
  }

  return (
    <Assessment
      key={questionIdx}
      questions={questions}
      currentLevel={1}
      questionIndex={questionIdx}
      studentInfo={{ name: childName, age: childAge, type: 'native' }}
      headerLabel="🎯 اختبار تحديد المستوى السريع"
      onAnswer={handleAnswer}
    />
  );
}

/**
 * تقرير تقييمي، لا نسبة جافة فقط: بُعدان أو ثلاثة أبعاد مسمّاة حسب المسار
 * (tracks.js) بتصنيف نوعي (ممتاز جداً 🟢/جيد جداً 🟡/بحاجة لتدريب 🔴)،
 * ثم "المهارة المرشحة للتطوير" (أضعف بُعد) والتوصية ببرنامج محدد، وأخيراً
 * زر واتساب بنص جاهز يذكر اسم الطفل والبرنامج الموصى به تحديداً.
 */
function QuickTestResult({ childName, track, report }) {
  const { overall, dims, insight } = report;
  const overallQ = qualitativeLabel(overall);
  const waText = `مرحباً أستاذ، أكمل طفلي ${childName} التقييم وأود الاستفسار عن ${track.program}`;

  return (
    <div className="page-content">
      <div className="results-header">
        <div className="results-icon">🌟</div>
        <h2>تقرير تقييم مستوى {childName}</h2>
        <p>{track.label} ({track.ageRange})</p>
      </div>

      <div className="thankyou-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {dims.map(d => {
            const q = qualitativeLabel(d.pct);
            return (
              <div key={d.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '.92rem' }}>{d.label}</span>
                <span style={{ fontWeight: 800, fontSize: '.9rem', whiteSpace: 'nowrap' }}>
                  {q.text} ({d.pct}%) {q.emoji}
                </span>
              </div>
            );
          })}
        </div>

        {insight && (
          <div style={{ background: '#fff8e8', border: '1px solid #f3d78a', borderRadius: 10, padding: '12px 16px', marginTop: 18, fontSize: '.9rem', color: '#7a5a10', textAlign: 'right' }}>
            <strong>💡 المهارة المرشحة للتطوير:</strong> {insight}
          </div>
        )}
      </div>

      <div className="thankyou-card" style={{ marginTop: 14, textAlign: 'center' }}>
        <div className="thankyou-icon">🎯</div>
        <p className="thankyou-title">التوصية التربوية من أكاديمية عارم</p>
        <p className="thankyou-sub" style={{ fontWeight: 700, color: 'var(--primary)', margin: '6px 0' }}>
          {track.program}
        </p>
        <p className="thankyou-sub">{track.programPitch}</p>
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
