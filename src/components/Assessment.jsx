import { useState } from 'react';
import { SKILLS, LEVELS } from '../data/questions.js';
import MatchingQuestion      from './MatchingQuestion.jsx';
import AudioQuestion         from './AudioQuestion.jsx';
import WritingQuestion       from './WritingQuestion.jsx';
import WordOrderQuestion     from './WordOrderQuestion.jsx';
import CorrectionQuestion    from './CorrectionQuestion.jsx';
import FillQuestion          from './FillQuestion.jsx';
import LetterRecognition     from './LetterRecognition.jsx';
import VowelCards            from './VowelCards.jsx';
import VowelLong             from './VowelLong.jsx';
import SukunCards            from './SukunCards.jsx';
import TanweenCards          from './TanweenCards.jsx';

export default function Assessment({ questions, currentLevel, questionIndex, studentInfo, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const question = questions[questionIndex];

  const [shuffledOptions] = useState(() => {
    if (!question?.options) return [];
    const arr = question.options.map((opt, i) => ({ ...opt, origIdx: i }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
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
    const isCorrect = shuffledOptions[selected].correct;
    setShowFeedback(true);

    setTimeout(() => {
      setSelected(null);
      setShowFeedback(false);
      onAnswer({ questionId: question.id, skill: question.skill, answer: selected, isCorrect });
    }, 600);
  }

  if (!question) return null;

  const SPECIAL_TYPES = ['letter-recognition', 'vowel-cards', 'vowel-long', 'sukun-cards', 'tanween-cards', 'matching', 'speaking', 'photo-writing', 'word-order', 'correction', 'fill'];

  if (SPECIAL_TYPES.includes(question.type)) {
    const Inner =
      question.type === 'letter-recognition' ? <LetterRecognition question={question} onAnswer={onAnswer} /> :
      question.type === 'vowel-cards'   ? <VowelCards         question={question} onAnswer={onAnswer} /> :
      question.type === 'vowel-long'    ? <VowelLong          question={question} onAnswer={onAnswer} /> :
      question.type === 'sukun-cards'  ? <SukunCards         question={question} onAnswer={onAnswer} /> :
      question.type === 'tanween-cards'? <TanweenCards        question={question} onAnswer={onAnswer} /> :
      question.type === 'matching'      ? <MatchingQuestion   question={question} onAnswer={onAnswer} /> :
      question.type === 'speaking'    ? <AudioQuestion      question={question} studentInfo={studentInfo} onAnswer={onAnswer} /> :
      question.type === 'photo-writing' ? <WritingQuestion  question={question} studentInfo={studentInfo} onAnswer={onAnswer} /> :
      question.type === 'word-order'  ? <WordOrderQuestion  question={question} onAnswer={onAnswer} /> :
      question.type === 'correction'  ? <CorrectionQuestion question={question} onAnswer={onAnswer} /> :
                                        <FillQuestion       question={question} onAnswer={onAnswer} />;
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
        {Inner}
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
          {shuffledOptions.map((opt, idx) => {
            let cls = 'option';
            if (showFeedback && idx === selected) {
              cls += opt.correct ? ' option-correct' : ' option-wrong';
            } else if (!showFeedback && idx === selected) {
              cls += ' option-selected';
            }
            return (
              <button key={opt.origIdx} className={cls} onClick={() => handleSelect(idx)}>
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
