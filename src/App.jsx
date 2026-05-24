import { useState, useCallback, useEffect, Fragment } from 'react';
import StudentInfo     from './components/StudentInfo.jsx';
import Assessment      from './components/Assessment.jsx';
import LevelTransition from './components/LevelTransition.jsx';
import Results         from './components/Results.jsx';
import { getLevelQuestions, shuffle } from './data/questions.js';
import { calculateLevelScore, applyJumpLogic, saveToLocalStorage } from './utils/scoring.js';
import './App.css';

const PAGES       = { INFO: 'info', ASSESSMENT: 'assessment', TRANSITION: 'transition', RESULTS: 'results' };
const SESSION_KEY = 'areem_session';

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

const PINNED = new Set(['matching', 'speaking', 'photo-writing', 'word-order', 'correction', 'fill']);

function buildLevelData(levelId) {
  const all      = getLevelQuestions(levelId);
  const matching = all.filter(q => q.type === 'matching');
  const speaking = all.filter(q => q.type === 'speaking');
  const photoWr  = all.filter(q => q.type === 'photo-writing');
  const newTypes = all.filter(q => ['word-order', 'correction', 'fill'].includes(q.type));
  const regular  = shuffle(all.filter(q => !PINNED.has(q.type ?? '')));
  return { questions: [...matching, ...speaking, ...photoWr, ...newTypes, ...regular], answers: [] };
}

const BG_LETTERS = [
  { char: 'ع', style: { left: '6%',  top: '10%', fontSize: '9rem',  opacity: 0.08, animationDuration: '18s', animationDelay: '0s'  } },
  { char: 'ر', style: { left: '10%', top: '45%', fontSize: '12rem', opacity: 0.06, animationDuration: '24s', animationDelay: '5s'  } },
  { char: 'م', style: { left: '6%',  top: '72%', fontSize: '8rem',  opacity: 0.07, animationDuration: '20s', animationDelay: '9s'  } },
  { char: 'ب', style: { left: '13%', top: '28%', fontSize: '10rem', opacity: 0.05, animationDuration: '27s', animationDelay: '2s'  } },
  { char: 'ا', style: { left: '82%', top: '15%', fontSize: '11rem', opacity: 0.06, animationDuration: '22s', animationDelay: '1s'  } },
  { char: 'ي', style: { left: '86%', top: '50%', fontSize: '9rem',  opacity: 0.08, animationDuration: '25s', animationDelay: '7s'  } },
  { char: 'ة', style: { left: '80%', top: '76%', fontSize: '8rem',  opacity: 0.05, animationDuration: '19s', animationDelay: '4s'  } },
  { char: 'ل', style: { left: '84%', top: '33%', fontSize: '10rem', opacity: 0.07, animationDuration: '23s', animationDelay: '11s' } },
];

const saved = loadSession();

export default function App() {
  const [offline, setOffline] = useState(!navigator.onLine);

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

  // حفظ الجلسة عند كل تغيير في الحالة
  useEffect(() => {
    if (page === PAGES.INFO) { clearSession(); return; }
    saveSession({
      page, studentInfo, currentLevel, levelData,
      questionIdx, allAnswers, levelPath,
      transitionFrom, transitionTo, transitionScore,
      finalScores, finalLevel,
    });
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

  const answered       = allAnswers.length + (page === PAGES.ASSESSMENT ? questionIdx : 0);
  const totalPossible  = allAnswers.length + (levelData?.questions?.length || 60);
  const globalProgress = Math.min(Math.round((answered / totalPossible) * 100), 100);

  return (
    <Fragment>
    <div className="bg-letters" aria-hidden="true">
      {BG_LETTERS.map((l, i) => (
        <span key={i} className="bg-letter" style={l.style}>{l.char}</span>
      ))}
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
          <h1>عارم أكاديمي</h1>
          <span className="header-en">AREM ACADEMY</span>
          <p>نظام التقييم الذكي — تقييم شامل لمهارات اللغة العربية</p>
        </div>
      </header>

      {page !== PAGES.INFO && (
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
        <p>© 2026 أكاديمية عارم — gandouzimohamed9@gmail.com</p>
      </footer>
    </div>
    </Fragment>
  );
}
