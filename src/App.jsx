import { useState, useCallback, useEffect } from 'react';
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

function buildLevelData(levelId) {
  const all      = getLevelQuestions(levelId);
  const matching = all.filter(q => q.type === 'matching');
  const regular  = shuffle(all.filter(q => q.type !== 'matching'));
  return { questions: [...matching, ...regular], answers: [] };
}

const saved = loadSession();

export default function App() {
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

  const answered       = allAnswers.length + (levelData?.answers?.length || 0) + (page === PAGES.ASSESSMENT ? questionIdx : 0);
  const totalPossible  = 60;
  const globalProgress = Math.min(Math.round((answered / totalPossible) * 100), 100);

  return (
    <div className="app">
      <header className="app-header">
        <span className="header-logo">🎓</span>
        <div className="header-text">
          <h1>نظام التقييم الذكي</h1>
          <p>أكاديمية عارم — تقييم شامل لمهارات اللغة العربية</p>
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
  );
}
