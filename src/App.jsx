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
  // الجانب الأيسر فقط
  { char: 'ع', style: { left: '4%',  top: '8%',  fontSize: '10rem', opacity: 0.14, animationDuration: '20s', animationDelay: '0s' } },
  { char: 'ر', style: { left: '9%',  top: '32%', fontSize: '9rem',  opacity: 0.11, animationDuration: '25s', animationDelay: '4s' } },
  { char: 'م', style: { left: '5%',  top: '58%', fontSize: '11rem', opacity: 0.13, animationDuration: '22s', animationDelay: '8s' } },
  { char: 'ب', style: { left: '10%', top: '80%', fontSize: '8rem',  opacity: 0.10, animationDuration: '18s', animationDelay: '2s' } },
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
      <img
        src={`${import.meta.env.BASE_URL}boy-mascot.svg`}
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
            <div className="header-social">
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
          </div>
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
