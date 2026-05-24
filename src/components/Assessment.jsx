import { useState } from 'react';
import { SKILLS, LEVELS } from '../data/questions.js';
import MatchingQuestion from './MatchingQuestion.jsx';

export default function Assessment({ questions, currentLevel, questionIndex, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const question      = questions[questionIndex];
  const total         = questions.length;
  const progress      = ((questionIndex + 1) / total) * 100;
  const levelInfo     = LEVELS.find((l) => l.id === currentLevel);
  const skillInfo     = SKILLS.find((s) => s.id === question?.skill);

  function handleSelect(idx) {
    if (showFeedback) return;
    setSelected(idx);
  }

  function handleNext() {
    if (selected === null) return;
    const isCorrect = question.options[selected].correct;
    setShowFeedback(true);

    setTimeout(() => {
      setSelected(null);
      setShowFeedback(false);
      onAnswer({ questionId: question.id, skill: question.skill, answer: selected, isCorrect });
    }, 600);
  }

  if (!question) return null;

  if (question.type === 'matching') {
    return (
      <div className="page-content">
        <div className="assessment-header">
          <div className="level-badge">
            {levelInfo?.icon} المستوى {currentLevel} — {levelInfo?.name}
          </div>
          <div className="question-counter">{questionIndex + 1} / {total}</div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        {skillInfo && (
          <div className="skill-tag"><span>📌 {skillInfo.name}</span></div>
        )}
        <MatchingQuestion question={question} onAnswer={onAnswer} />
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="assessment-header">
        <div className="level-badge">
          {levelInfo?.icon} المستوى {currentLevel} — {levelInfo?.name}
        </div>
        <div className="question-counter">
          {questionIndex + 1} / {total}
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {skillInfo && (
        <div className="skill-tag">
          <span>📌 {skillInfo.name}</span>
        </div>
      )}

      <div className="question-box">
        <div className="question-number">سؤال {questionIndex + 1}</div>
        <p className="question-text">{question.text}</p>

        <div className="options-list">
          {question.options.map((opt, idx) => {
            let cls = 'option';
            if (showFeedback && idx === selected) {
              cls += opt.correct ? ' option-correct' : ' option-wrong';
            } else if (!showFeedback && idx === selected) {
              cls += ' option-selected';
            }
            return (
              <button key={idx} className={cls} onClick={() => handleSelect(idx)}>
                <span className="option-letter">{['أ', 'ب', 'ج', 'د'][idx]}</span>
                <span className="option-text">{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={handleNext}
        disabled={selected === null}
        style={{ opacity: selected === null ? 0.5 : 1 }}
      >
        {questionIndex + 1 === total ? 'إنهاء المستوى ✓' : 'السؤال التالي ←'}
      </button>
    </div>
  );
}
