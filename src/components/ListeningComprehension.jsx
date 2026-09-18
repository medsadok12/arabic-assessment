import { useState } from 'react';
import { useTTSPlayer } from '../hooks/useTTSPlayer.js';
import { shuffle } from '../data/questions.js';

const MAX_PLAYS = 3;

/**
 * استماع حقيقي للمستويين 2 و3: تُشغَّل الفقرة (question.audioText) صوتياً
 * عبر Azure TTS ولا تُعرَض كنص إطلاقاً — الطفل يستمع فعلاً بدل أن يقرأ
 * الفقرة ويجيب دون أي استماع حقيقي (كما كانت الحال سابقاً).
 */
export default function ListeningComprehension({ question, onAnswer }) {
  const [options] = useState(() => {
    const arr = question.options.map((opt, i) => ({ ...opt, origIdx: i }));
    return shuffle(arr);
  });
  const [playCount,    setPlayCount]    = useState(0);
  const [selected,     setSelected]     = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const { playing, audioError, playOnce } = useTTSPlayer();

  async function handlePlay() {
    if (playing || playCount >= MAX_PLAYS) return;
    const success = await playOnce(question.audioText);
    if (success) setPlayCount((c) => c + 1);
  }

  function handleSelect(idx) {
    if (showFeedback) return;
    setSelected(idx);
  }

  function handleConfirm() {
    if (selected === null) return;
    const isCorrect = options[selected].correct;
    setShowFeedback(true);

    setTimeout(() => {
      onAnswer({
        questionId:  question.id,
        skill:       question.skill ?? 'listening',
        answer:      selected,
        isCorrect,
        answerText:  options[selected]?.text ?? '',
        correctText: options.find((o) => o.correct)?.text ?? '',
      });
    }, 600);
  }

  return (
    <div className="question-box">
      <div className="question-number">تدريب الاستماع</div>

      <div style={{ textAlign: 'center', margin: '8px 0 24px' }}>
        <button
          onClick={handlePlay}
          disabled={playing || playCount >= MAX_PLAYS}
          style={{
            background: playing ? '#90a4ae' : '#185FA5',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 84,
            height: 84,
            fontSize: 34,
            cursor: playing || playCount >= MAX_PLAYS ? 'not-allowed' : 'pointer',
            boxShadow: playing ? 'none' : '0 4px 14px rgba(24,95,165,.38)',
            transition: 'all 0.2s',
          }}
          aria-label="استمع للنص"
        >
          {playing ? '🔊' : '▶'}
        </button>
        <p style={{ marginTop: 8, color: '#666', fontSize: 13, fontFamily: 'Tajawal, sans-serif' }}>
          {playCount === 0
            ? 'اضغط للاستماع'
            : playCount >= MAX_PLAYS
              ? `استمعتَ ${MAX_PLAYS} مرات`
              : `استمع مرة أخرى (${playCount}/${MAX_PLAYS})`}
        </p>
        {audioError && (
          <p style={{ marginTop: 4, color: '#c62828', fontSize: 12, fontFamily: 'Tajawal, sans-serif' }}>
            ⚠️ تعذّر تشغيل الصوت، جرّب الضغط على الزر مرة أخرى
          </p>
        )}
      </div>

      <p className="question-text">{question.text}</p>

      <div className="options-list">
        {options.map((opt, idx) => {
          let cls = 'option';
          if (showFeedback && idx === selected) {
            cls += opt.correct ? ' option-correct' : ' option-wrong';
          } else if (!showFeedback && idx === selected) {
            cls += ' option-selected';
          }
          return (
            <button key={opt.origIdx} className={cls} onClick={() => handleSelect(idx)} disabled={showFeedback}>
              <span className="option-letter">{['أ', 'ب', 'ج', 'د'][idx]}</span>
              <span className="option-text">{opt.text}</span>
            </button>
          );
        })}
      </div>

      {!showFeedback && (
        <button
          className="btn-primary"
          onClick={handleConfirm}
          disabled={selected === null}
          style={{ marginTop: 14, opacity: selected === null ? 0.5 : 1 }}
        >
          تأكيد ←
        </button>
      )}
    </div>
  );
}
