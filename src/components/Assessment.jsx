import { useState, useEffect } from 'react';
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
import ListenChoose          from './ListenChoose.jsx';
import SyllableOrder         from './SyllableOrder.jsx';
import LetterPosition        from './LetterPosition.jsx';
import WordConstruct         from './WordConstruct.jsx';
import OralAssessment        from './OralAssessment.jsx';
import LetterListenChoose   from './LetterListenChoose.jsx';
import SyllableReading      from './SyllableReading.jsx';
import ImageWordMatching    from './ImageWordMatching.jsx';
import ListenSpeak          from './ListenSpeak.jsx';
import ListeningComprehension from './ListeningComprehension.jsx';
import DialogueOrder        from './DialogueOrder.jsx';

export default function Assessment({ questions, currentLevel, questionIndex, studentInfo, streak = 0, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  // يُظهَر مرة واحدة عند الوصول لكل مضاعف من 3 (Assessment يُعاد تركيبه بالكامل
  // مع كل سؤال جديد عبر key={questionIndex} في App.jsx — فالقيمة الابتدائية هنا
  // تعادل "عند بداية عرض السؤال الذي تحققت السلسلة قبله" بالضبط).
  const [showStreakToast, setShowStreakToast] = useState(() => streak > 0 && streak % 3 === 0);

  const question = questions[questionIndex];

  useEffect(() => {
    if (!showStreakToast) return;
    const t = setTimeout(() => setShowStreakToast(false), 2800);
    return () => clearTimeout(t);
  }, [showStreakToast]);

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
      onAnswer({
        questionId: question.id,
        skill:      question.skill,
        answer:     selected,
        isCorrect,
        answerText:  shuffledOptions[selected]?.text ?? '',
        correctText: shuffledOptions.find(o => o.correct)?.text ?? '',
      });
    }, 600);
  }

  if (!question) return null;

  const SPECIAL_TYPES = ['letter-recognition', 'vowel-cards', 'vowel-long', 'sukun-cards', 'tanween-cards', 'listen-choose', 'syllable-order', 'letter-position', 'word-construct', 'oral-assessment', 'matching', 'speaking', 'photo-writing', 'word-order', 'correction', 'fill', 'letter-listen-choose', 'syllable-reading', 'image-matching', 'listen-speak', 'listening-comprehension', 'dialogue-order'];

  if (SPECIAL_TYPES.includes(question.type)) {
    const Inner =
      question.type === 'letter-recognition'  ? <LetterRecognition  question={question} onAnswer={onAnswer} /> :
      question.type === 'vowel-cards'          ? <VowelCards         question={question} onAnswer={onAnswer} /> :
      question.type === 'vowel-long'           ? <VowelLong          question={question} onAnswer={onAnswer} /> :
      question.type === 'sukun-cards'          ? <SukunCards         question={question} onAnswer={onAnswer} /> :
      question.type === 'tanween-cards'        ? <TanweenCards       question={question} onAnswer={onAnswer} /> :
      question.type === 'listen-choose'        ? <ListenChoose       question={question} onAnswer={onAnswer} /> :
      question.type === 'syllable-order'       ? <SyllableOrder      question={question} onAnswer={onAnswer} /> :
      question.type === 'letter-position'      ? <LetterPosition     question={question} onAnswer={onAnswer} /> :
      question.type === 'word-construct'       ? <WordConstruct      question={question} onAnswer={onAnswer} /> :
      question.type === 'oral-assessment'      ? <OralAssessment     question={question} onAnswer={onAnswer} /> :
      question.type === 'matching'             ? <MatchingQuestion   question={question} onAnswer={onAnswer} /> :
      question.type === 'speaking'             ? <AudioQuestion      question={question} studentInfo={studentInfo} onAnswer={onAnswer} /> :
      question.type === 'photo-writing'        ? <WritingQuestion    question={question} studentInfo={studentInfo} onAnswer={onAnswer} /> :
      question.type === 'word-order'           ? <WordOrderQuestion  question={question} onAnswer={onAnswer} /> :
      question.type === 'correction'           ? <CorrectionQuestion question={question} onAnswer={onAnswer} /> :
      question.type === 'letter-listen-choose' ? <LetterListenChoose question={question} onAnswer={onAnswer} /> :
      question.type === 'syllable-reading'     ? <SyllableReading    question={question} onAnswer={onAnswer} /> :
      question.type === 'image-matching'       ? <ImageWordMatching  question={question} onAnswer={onAnswer} /> :
      question.type === 'listen-speak'         ? <ListenSpeak        question={question} onAnswer={onAnswer} /> :
      question.type === 'listening-comprehension' ? <ListeningComprehension question={question} onAnswer={onAnswer} /> :
      question.type === 'dialogue-order'       ? <DialogueOrder       question={question} onAnswer={onAnswer} /> :
                                                 <FillQuestion       question={question} onAnswer={onAnswer} />;
    return (
      <div className="page-content">
        {showStreakToast && <StreakToast streak={streak} />}
        <div className="assessment-header">
          <div className="level-badge">
            {levelInfo?.icon} المستوى {currentLevel} — {levelInfo?.name}
          </div>
          {streak > 0 && <StreakBadge streak={streak} />}
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
      {showStreakToast && <StreakToast streak={streak} />}
      <div className="assessment-header">
        <div className="level-badge">
          {levelInfo?.icon} المستوى {currentLevel} — {levelInfo?.name}
        </div>
        {streak > 0 && <StreakBadge streak={streak} />}
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

/** عداد السلسلة — يظهر في ترويسة الاختبار طالما استمرت الإجابات الصحيحة المتتالية. */
function StreakBadge({ streak }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: '#fff3e0',
        border: '1.5px solid #ffb74d',
        borderRadius: 20,
        padding: '4px 12px',
        fontWeight: 800,
        fontSize: 14,
        color: '#e65100',
        fontFamily: 'Tajawal, sans-serif',
      }}
      aria-label={`سلسلة ${streak} إجابات صحيحة متتالية`}
    >
      🔥 {streak}
    </div>
  );
}

/** رسالة تشجيعية فورية عند كل مضاعف من 3 إجابات صحيحة متتالية. */
function StreakToast({ streak }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#fff',
        border: '2px solid #ffb74d',
        borderRadius: 16,
        padding: '8px 16px 8px 10px',
        boxShadow: '0 6px 20px rgba(0,0,0,.15)',
        maxWidth: '92vw',
        animation: 'streak-toast-in .35s ease-out',
      }}
      role="status"
    >
      <img
        src={`${import.meta.env.BASE_URL}boy-mascot.png`}
        alt=""
        style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }}
      />
      <span style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 14, color: '#e65100' }}>
        🔥 سلسلة من {streak} إجابات صحيحة متتالية! أنت رائع
      </span>
      <style>{`
        @keyframes streak-toast-in {
          from { opacity: 0; transform: translate(-50%, -12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
