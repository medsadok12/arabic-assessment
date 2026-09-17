import { useState, useEffect } from 'react';
import { createTTSPlayer } from '../utils/ttsPlayer.js';

export default function LetterListenChoose({ question, onAnswer }) {
  const items = question.items;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [player] = useState(() => createTTSPlayer());

  useEffect(() => {
    setSelected(null);
    setShowFeedback(false);
    setAudioError(false);
  }, [idx]);

  useEffect(() => () => { player.stop(); }, [player]);

  const item = items[idx];

  async function playLetter() {
    if (playing) return;
    setPlaying(true);
    setAudioError(false);
    try {
      await player.playOnce(item.letter);
    } catch {
      setAudioError(true);
    } finally {
      setPlaying(false);
    }
  }

  function handleSelect(choiceIdx) {
    if (showFeedback || selected !== null) return;
    setSelected(choiceIdx);
    setShowFeedback(true);
    const isCorrect = item.choices[choiceIdx] === item.letter;

    setTimeout(() => {
      const updated = [...answers, { letter: item.letter, chosen: item.choices[choiceIdx], isCorrect }];
      setAnswers(updated);
      if (idx + 1 < items.length) {
        setIdx(i => i + 1);
      } else {
        const correctCount = updated.filter(a => a.isCorrect).length;
        onAnswer({
          questionId: question.id,
          skill:      question.skill ?? 'listening',
          answer:     updated,
          isCorrect:  correctCount / items.length >= 0.5,
          answerText:  updated.map(a => `${a.chosen}${a.isCorrect ? ' ✓' : ' ✗'}`).join('، '),
          correctText: items.map(i => i.letter).join('، '),
        });
      }
    }, 900);
  }

  return (
    <div className="question-box">
      <div className="question-number">تدريب ١</div>
      <p className="question-text" style={{ fontSize: 18 }}>
        اسْتَمِعْ وَاخْتَرِ الحَرْفَ الصَّحِيح
      </p>
      <p style={{ textAlign: 'center', color: '#888', fontSize: 13, margin: '2px 0 18px' }}>
        {idx + 1} / {items.length}
      </p>

      <div style={{ textAlign: 'center', margin: '8px 0 28px' }}>
        <button
          onClick={playLetter}
          disabled={playing}
          style={{
            background: playing ? '#90a4ae' : '#185FA5',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 84,
            height: 84,
            fontSize: 34,
            cursor: playing ? 'not-allowed' : 'pointer',
            boxShadow: playing ? 'none' : '0 4px 14px rgba(24,95,165,.38)',
            transition: 'all 0.2s',
          }}
          aria-label="استمع للحرف"
        >
          {playing ? '🔊' : '▶'}
        </button>
        <p style={{ marginTop: 8, color: '#666', fontSize: 13, fontFamily: 'Tajawal, sans-serif' }}>
          اضغط للاستماع
        </p>
        {audioError && (
          <p style={{ marginTop: 4, color: '#c62828', fontSize: 12, fontFamily: 'Tajawal, sans-serif' }}>
            ⚠️ تعذّر تشغيل الصوت، جرّب الضغط على الزر مرة أخرى
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', direction: 'rtl' }}>
        {item.choices.map((choice, i) => {
          let bg = '#f5f7fa', border = '#d0d7de', color = '#1a237e';
          if (showFeedback && i === selected) {
            const ok = choice === item.letter;
            bg = ok ? '#e8f5e9' : '#ffebee';
            border = ok ? '#4caf50' : '#f44336';
            color = ok ? '#2e7d32' : '#c62828';
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={showFeedback}
              style={{
                width: 80,
                height: 80,
                background: bg,
                border: `3px solid ${border}`,
                borderRadius: 16,
                fontSize: 38,
                fontWeight: 900,
                color,
                cursor: showFeedback ? 'default' : 'pointer',
                fontFamily: 'Tajawal, sans-serif',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <p style={{
          textAlign: 'center',
          marginTop: 18,
          fontWeight: 700,
          fontSize: 18,
          fontFamily: 'Tajawal, sans-serif',
          color: item.choices[selected] === item.letter ? '#2e7d32' : '#c62828',
        }}>
          {item.choices[selected] === item.letter
            ? '✅ ممتاز!'
            : `❌ الحرف الصحيح هو: ${item.letter}`}
        </p>
      )}
    </div>
  );
}
