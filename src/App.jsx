import { useState, useCallback, useEffect, Fragment } from 'react';
import StudentInfo     from './components/StudentInfo.jsx';
import Assessment      from './components/Assessment.jsx';
import LevelTransition from './components/LevelTransition.jsx';
import Results         from './components/Results.jsx';
import { getLevelQuestions, shuffle } from './data/questions.js';
import { calculateLevelScore, applyJumpLogic, saveToLocalStorage } from './utils/scoring.js';
import './App.css';

const PAGES       = { INFO: 'info', WELCOME: 'welcome', ASSESSMENT: 'assessment', TRANSITION: 'transition', RESULTS: 'results' };
const SESSION_KEY = 'areem_session';
const RESUME_KEY  = 'areem_resume';

function saveSession(state) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)); } catch (_) {}
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
}

function saveResume(state) {
  try { localStorage.setItem(RESUME_KEY, JSON.stringify({ ...state, _savedAt: Date.now() })); } catch (_) {}
}

function loadResume() {
  try {
    const data = JSON.parse(localStorage.getItem(RESUME_KEY) || 'null');
    if (!data) return null;
    // تنتهي صلاحية الحفظ بعد 7 أيام
    if (Date.now() - data._savedAt > 7 * 24 * 60 * 60 * 1000) { localStorage.removeItem(RESUME_KEY); return null; }
    return data;
  } catch (_) { return null; }
}

function clearResume() {
  try { localStorage.removeItem(RESUME_KEY); } catch (_) {}
}

const PINNED = new Set(['letter-recognition', 'vowel-cards', 'vowel-long', 'sukun-cards', 'tanween-cards', 'listen-choose', 'syllable-order', 'letter-position', 'word-construct', 'oral-assessment', 'matching', 'speaking', 'photo-writing', 'word-order', 'correction', 'fill', 'letter-listen-choose', 'syllable-reading', 'image-matching', 'listen-speak']);

function buildLevelData(levelId) {
  const all        = getLevelQuestions(levelId);
  const llChoose       = all.filter(q => q.type === 'letter-listen-choose');
  const sylReading     = all.filter(q => q.type === 'syllable-reading');
  const imgMatching    = all.filter(q => q.type === 'image-matching');
  const listenSpeak    = all.filter(q => q.type === 'listen-speak');
  const letterRec      = all.filter(q => q.type === 'letter-recognition');
  const vowelCards     = all.filter(q => q.type === 'vowel-cards');
  const vowelLong      = all.filter(q => q.type === 'vowel-long');
  const sukunCards     = all.filter(q => q.type === 'sukun-cards');
  const tanweenCards   = all.filter(q => q.type === 'tanween-cards');
  const listenChoose   = all.filter(q => q.type === 'listen-choose');
  const syllableOrder  = all.filter(q => q.type === 'syllable-order');
  const letterPos      = all.filter(q => q.type === 'letter-position');
  const wordConstruct  = all.filter(q => q.type === 'word-construct');
  const oralAssessment = all.filter(q => q.type === 'oral-assessment');
  const matching       = all.filter(q => q.type === 'matching');
  const speaking       = all.filter(q => q.type === 'speaking');
  const photoWr        = all.filter(q => q.type === 'photo-writing');
  const newTypes       = all.filter(q => ['word-order', 'correction', 'fill'].includes(q.type));
  const regular        = shuffle(all.filter(q => !PINNED.has(q.type ?? '')));

  /* المستوى الأول: تدريبات ج1 أولاً ثم التدريبات التشخيصية */
  if (levelId === 1) {
    return { questions: [...llChoose, ...sylReading, ...imgMatching, ...listenSpeak, ...letterRec, ...vowelCards, ...vowelLong, ...sukunCards, ...tanweenCards, ...listenChoose, ...syllableOrder, ...letterPos, ...wordConstruct, ...oralAssessment], answers: [] };
  }

  return { questions: [...letterRec, ...vowelCards, ...vowelLong, ...sukunCards, ...tanweenCards, ...listenChoose, ...syllableOrder, ...letterPos, ...wordConstruct, ...oralAssessment, ...matching, ...speaking, ...photoWr, ...newTypes, ...regular], answers: [] };
}

const BG_LETTERS = [
  // الجانب الأيسر فقط
  { char: 'ع', style: { left: '4%',  top: '8%',  fontSize: '10rem', opacity: 0.14, animationDuration: '20s', animationDelay: '0s' } },
  { char: 'ر', style: { left: '9%',  top: '32%', fontSize: '9rem',  opacity: 0.11, animationDuration: '25s', animationDelay: '4s' } },
  { char: 'م', style: { left: '5%',  top: '58%', fontSize: '11rem', opacity: 0.13, animationDuration: '22s', animationDelay: '8s' } },
  { char: 'ب', style: { left: '10%', top: '80%', fontSize: '8rem',  opacity: 0.10, animationDuration: '18s', animationDelay: '2s' } },
];

const saved      = loadSession();
const resumeData = !saved ? loadResume() : null;
const hasResume  = !!resumeData && resumeData.page !== PAGES.INFO && resumeData.page !== PAGES.RESULTS;

export default function App() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [showResumePrompt, setShowResumePrompt] = useState(hasResume);

  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const [page, setPage]               = useState(saved?.page ?? PAGES.INFO);
  const [studentInfo, setStudentInfo] = useState(saved?.studentInfo ?? null);
  const [currentLevel, setCurrentLevel] = useState(saved?.currentLevel ?? 1);
  const [levelData, setLevelData]     = useState(saved?.levelData ?? null);
  const [questionIdx, setQuestionIdx] = useState(saved?.questionIdx ?? 0);
  const [allAnswers, setAllAnswers]   = useState(saved?.allAnswers ?? []);
  const [levelPath, setLevelPath]     = useState(saved?.levelPath ?? []);

  const [transitionFrom, setTransitionFrom]   = useState(saved?.transitionFrom ?? null);
  const [transitionTo, setTransitionTo]       = useState(saved?.transitionTo ?? null);
  const [transitionScore, setTransitionScore] = useState(saved?.transitionScore ?? 0);

  const [finalScores, setFinalScores] = useState(saved?.finalScores ?? null);
  const [finalLevel, setFinalLevel]   = useState(saved?.finalLevel ?? 1);
  const [showAbout, setShowAbout]     = useState(false);

  // حفظ الجلسة عند كل تغيير في الحالة
  useEffect(() => {
    if (page === PAGES.INFO) { clearSession(); clearResume(); return; }
    const state = {
      page, studentInfo, currentLevel, levelData,
      questionIdx, allAnswers, levelPath,
      transitionFrom, transitionTo, transitionScore,
      finalScores, finalLevel,
    };
    saveSession(state);
    if (page !== PAGES.RESULTS) saveResume(state);
    else clearResume();
  }, [page, studentInfo, currentLevel, levelData, questionIdx, allAnswers, levelPath,
      transitionFrom, transitionTo, transitionScore, finalScores, finalLevel]);

  function handleStart(info) {
    const data = buildLevelData(1);
    setStudentInfo(info);
    setCurrentLevel(1);
    setLevelData(data);
    setQuestionIdx(0);
    setAllAnswers([]);
    setLevelPath([1]);
    setPage(PAGES.WELCOME);
  }

  function handleWelcomeContinue() {
    setPage(PAGES.ASSESSMENT);
  }

  const handleAnswer = useCallback((answerObj) => {
    const newAnswers = [...levelData.answers, answerObj];
    const nextIdx    = questionIdx + 1;

    if (nextIdx < levelData.questions.length) {
      setLevelData((prev) => ({ ...prev, answers: newAnswers }));
      setQuestionIdx(nextIdx);
      return;
    }

    // انتهى المستوى
    const accumulated = [...allAnswers, ...newAnswers];
    const scores      = calculateLevelScore(accumulated);
    const nextLevel   = applyJumpLogic(scores.overall, currentLevel);

    setAllAnswers(accumulated);

    if (nextLevel > currentLevel) {
      setTransitionFrom(currentLevel);
      setTransitionTo(nextLevel);
      setTransitionScore(scores.overall);
      setPage(PAGES.TRANSITION);
    } else {
      finalize(accumulated, currentLevel, [...levelPath]);
    }
  }, [levelData, questionIdx, allAnswers, currentLevel, levelPath]);

  function handleTransitionContinue() {
    const newPath = [...levelPath, transitionTo];
    const data    = buildLevelData(transitionTo);
    setCurrentLevel(transitionTo);
    setLevelData(data);
    setQuestionIdx(0);
    setLevelPath(newPath);
    setPage(PAGES.ASSESSMENT);
  }

  function finalize(answers, level, path) {
    const scores     = calculateLevelScore(answers);
    const determined = applyJumpLogic(scores.overall, level);
    setFinalScores(scores);
    setFinalLevel(determined);
    saveToLocalStorage({ studentInfo, scores, finalLevel: determined, levelPath: path });
    setPage(PAGES.RESULTS);
  }

  function handleRestart() {
    if (!window.confirm('هل تريد بدء تقييم جديد؟ سيتم مسح نتائج هذا التقييم.')) return;
    clearSession();
    setPage(PAGES.INFO);
    setStudentInfo(null);
    setCurrentLevel(1);
    setLevelData(null);
    setQuestionIdx(0);
    setAllAnswers([]);
    setLevelPath([]);
    setFinalScores(null);
    setFinalLevel(1);
    setTransitionFrom(null);
    setTransitionTo(null);
    setTransitionScore(0);
  }

  function handleResume() {
    if (!resumeData) return;
    setPage(resumeData.page);
    setStudentInfo(resumeData.studentInfo);
    setCurrentLevel(resumeData.currentLevel ?? 1);
    setLevelData(resumeData.levelData ?? null);
    setQuestionIdx(resumeData.questionIdx ?? 0);
    setAllAnswers(resumeData.allAnswers ?? []);
    setLevelPath(resumeData.levelPath ?? []);
    setTransitionFrom(resumeData.transitionFrom ?? null);
    setTransitionTo(resumeData.transitionTo ?? null);
    setTransitionScore(resumeData.transitionScore ?? 0);
    setShowResumePrompt(false);
  }

  function handleDismissResume() {
    clearResume();
    setShowResumePrompt(false);
  }

  const answered       = allAnswers.length + (page === PAGES.ASSESSMENT ? questionIdx : 0);
  const totalPossible  = allAnswers.length + (levelData?.questions?.length || 60);
  const globalProgress = Math.min(Math.round((answered / totalPossible) * 100), 100);

  return (
    <Fragment>
    <div className="bg-letters" aria-hidden="true">
      {BG_LETTERS.map((l, i) => (
        <span key={i} className="bg-letter" style={l.style}>{l.char}</span>
      ))}
      <img
        src={`${import.meta.env.BASE_URL}boy-mascot.png`}
        className="bg-boy"
        alt=""
        draggable="false"
      />
    </div>
    <div className="app">
      {offline && (
        <div style={{ background: '#c62828', color: 'white', textAlign: 'center', padding: '8px', fontSize: 14, fontWeight: 'bold' }}>
          ⚠️ انقطع الاتصال بالإنترنت — لا تغلق الصفحة، سيتم استئناف التقييم عند العودة
        </div>
      )}
      <header className="app-header">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="عارم أكاديمي" className="header-logo-img" />
        <div className="header-text">
          <div className="header-h1-row">
            <h1 lang="ar">عارم أكاديمي</h1>
          </div>
          <span className="header-en">AREM ACADEMY</span>
          <p>نظام التقييم الذكي — تقييم شامل لمهارات اللغة العربية</p>
        </div>
      </header>

      {page !== PAGES.INFO && page !== PAGES.WELCOME && (
        <div className="global-progress">
          <div className="gp-info">
            <span>التقدم الكلي</span>
            <span>{globalProgress}%</span>
          </div>
          <div className="gp-bar">
            <div className="gp-fill" style={{ width: `${globalProgress}%` }} />
          </div>
        </div>
      )}

      <main className="app-main">
        {page === PAGES.INFO && (
          <StudentInfo onStart={handleStart} />
        )}
        {page === PAGES.WELCOME && studentInfo && (
          <div className="page-content welcome-page">
            <div className="welcome-emoji">🌟</div>
            <h2 className="welcome-greeting">
              أهلاً <span className="welcome-name">{studentInfo.name}</span>!
            </h2>
            <p className="welcome-question">
              هل أنت مستعد لاكتشاف مهاراتك في اللغة العربية؟
            </p>
            <p className="welcome-meta">
              {studentInfo.type === 'native' ? 'ناطق باللغة العربية' : 'غير ناطق باللغة العربية'}
              {' · '}
              {studentInfo.age} سنة
            </p>
            <div className="welcome-features">
              <div className="wf-item">📝 أسئلة متنوعة</div>
              <div className="wf-item">🎯 تقييم دقيق</div>
              <div className="wf-item">📊 تقرير شامل</div>
            </div>
            <button className="btn-primary welcome-btn" onClick={handleWelcomeContinue}>
              أنا مستعد! ابدأ التقييم ←
            </button>
          </div>
        )}
        {page === PAGES.ASSESSMENT && levelData && (
          <Assessment
            key={questionIdx}
            questions={levelData.questions}
            currentLevel={currentLevel}
            questionIndex={questionIdx}
            studentInfo={studentInfo}
            onAnswer={handleAnswer}
          />
        )}
        {page === PAGES.TRANSITION && (
          <LevelTransition
            fromLevel={transitionFrom}
            toLevel={transitionTo}
            score={transitionScore}
            onContinue={handleTransitionContinue}
          />
        )}
        {page === PAGES.RESULTS && finalScores && (
          <Results
            studentInfo={studentInfo}
            finalLevel={finalLevel}
            scores={finalScores}
            levelPath={levelPath}
            onRestart={handleRestart}
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-social">
            <a href="https://www.facebook.com/Aremacademy" target="_blank" rel="noopener noreferrer" className="hsoc-btn hsoc-fb" title="Facebook">
              <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://www.instagram.com/aremacademy/" target="_blank" rel="noopener noreferrer" className="hsoc-btn hsoc-ig" title="Instagram">
              <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://wa.me/447400755914" target="_blank" rel="noopener noreferrer" className="hsoc-btn hsoc-wa" title="WhatsApp">
              <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          </div>
          <span className="footer-divider">|</span>
          <button className="footer-about-btn" onClick={() => setShowAbout(true)}>
            تعرّف على أكاديمية عارم
          </button>
        </div>
        <p className="footer-copy">© 2026 أكاديمية عارم — gandouzimohamed9@gmail.com</p>
      </footer>

      {showResumePrompt && resumeData && (
        <div className="modal-overlay" onClick={handleDismissResume}>
          <div className="modal-box" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" dir="rtl">
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '2.8rem' }}>💾</span>
            </div>
            <h2 className="modal-title" style={{ fontSize: '1.2rem' }}>لديك تقييم غير مكتمل</h2>
            <div style={{ background: '#eef5ff', borderRadius: 12, padding: '14px 18px', margin: '16px 0', fontSize: '.93rem', color: '#1a2d4a' }}>
              <div style={{ marginBottom: 6 }}>
                <strong>الطالب:</strong> {resumeData.studentInfo?.name ?? '—'}
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>المستوى:</strong> المستوى {resumeData.currentLevel ?? 1}
              </div>
              <div>
                <strong>آخر حفظ:</strong> {new Date(resumeData._savedAt).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <p style={{ color: '#64748b', fontSize: '.88rem', textAlign: 'center', marginBottom: 20 }}>
              هل تريد المتابعة من حيث توقفت؟
            </p>
            <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '12px' }} onClick={handleResume}>
                ▶ متابعة التقييم
              </button>
              <button
                style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.9rem', color: '#64748b', fontWeight: 600 }}
                onClick={handleDismissResume}
              >
                بدء تقييم جديد
              </button>
            </div>
          </div>
        </div>
      )}

      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setShowAbout(false)} aria-label="إغلاق">✕</button>
            <div className="modal-logo-row">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="modal-logo" />
            </div>
            <h2 className="modal-title">أكاديمية عارم</h2>
            <p className="modal-tagline">نبني بذور المستقبل بلغةٍ عربيةٍ أصيلة</p>
            <div className="modal-divider-line" />
            <p className="modal-body">
              نحن نؤمن بأن كل طفل يحمل في داخله شغفاً للتعلم. في «أكاديمية عارم»، لا نكتفي بالتعليم التقليدي، بل نمنح طفلك بيئة تفاعلية وذكية، تُحببه في لغته الأم، وتنمي مهاراته <strong>(الاستماع، التحدث، والكتابة)</strong> بدقةٍ واحترافية.
            </p>
            <p className="modal-body">
              هدفنا أن نكون الشريك الموثوق لك في رحلة طفلك نحو التميز، لنصنع معاً جيلاً يعتز بهويته، ويفكر بوضوح، ويبدع بلغته العربية.
            </p>
          </div>
        </div>
      )}
    </div>

    </Fragment>
  );
}
