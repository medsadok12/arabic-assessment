import { useState, useEffect } from 'react';

const RESPONSES = [
  { id: 'correct',  icon: '✅', label: 'أجاب بشكل صحيح' },
  { id: 'partial',  icon: '⚠️', label: 'أجاب جزئياً'    },
  { id: 'wrong',    icon: '❌', label: 'لم يجب'          },
];

export default function ListenSpeak({ question, onAnswer }) {
  const items = question.items;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  function playQuestion() {
    const synth = window.speechSynthesis;
    if (!synth || playing) return;
    synth.cancel();
    setPlaying(true);
    const u = new SpeechSynthesisUtterance(items[idx].text);
    u.lang = 'ar-SA';
    u.rate = 0.85;
    u.pitch = 1;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    const go = () => synth.speak(u);
    if (synth.getVoices().length > 0) go(); else synth.onvoiceschanged = go;
  }

  function handleResponse(responseId) {
    window.speechSynthesis?.cancel();
    setPlaying(false);
    const updated = [...answers, { text: items[idx].text, response: responseId }];
    setAnswers(updated);
    if (idx + 1 < items.length) {
      setIdx(i => i + 1);
    } else {
      const correctCount = updated.filter(a => a.response === 'correct').length;
      onAnswer({
        questionId: question.id,
        skill:      question.skill ?? 'speaking',
        answer:     updated,
        isCorrect:  correctCount / items.length >= 0.5,
      });
    }
  }

  return (
    <div className="question-box oa-box">
      <div className="oa-parent-header">
        <p className="oa-parent-title">اسْتَمِعْ وَأَجِبْ</p>
        <div className="oa-progress">{idx + 1} / {items.length}</div>
      </div>

      <div style={{ textAlign: 'center', margin: '18px 0' }}>
        <button
          onClick={playQuestion}
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
          aria-label="استمع للسؤال"
        >
          {playing ? '🔊' : '▶'}
        </button>
        <p style={{
          marginTop: 16,
          color: '#185FA5',
          fontWeight: 700,
          fontSize: 22,
          fontFamily: 'Tajawal, sans-serif',
          direction: 'rtl',
        }}>
          {items[idx].text}
        </p>
      </div>

      <div className="oa-parent-controls">
        <p className="oa-controls-label">— للولي فقط: اضغط الزر المناسب بعد إجابة الطفل —</p>
        <div className="oa-buttons">
          {RESPONSES.map(r => (
            <button
              key={r.id}
              className={`oa-btn oa-btn-${r.id}`}
              onClick={() => handleResponse(r.id)}
            >
              <span className="oa-btn-icon">{r.icon}</span>
              <span className="oa-btn-label">{r.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
