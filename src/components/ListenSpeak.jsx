import { useState, useEffect, useRef } from 'react';

const RESPONSES = [
  { id: 'correct',  icon: '✅', label: 'أجاب بشكل صحيح' },
  { id: 'partial',  icon: '⚠️', label: 'أجاب جزئياً'    },
  { id: 'wrong',    icon: '❌', label: 'لم يجب'          },
];

export default function ListenSpeak({ question, onAnswer }) {
  const items = question.items;
  const [idx, setIdx]           = useState(0);
  const [answers, setAnswers]   = useState([]);
  const [playing, setPlaying]   = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL]   = useState(null);
  const [micError, setMicError]   = useState(false);

  const mediaRef    = useRef(null);
  const chunksRef   = useRef([]);

  useEffect(() => {
    setAudioURL(null);
    setRecording(false);
    setMicError(false);
  }, [idx]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    stopRecording();
  }, []);

  function playQuestion() {
    const synth = window.speechSynthesis;
    if (!synth || playing) return;
    synth.cancel();
    setPlaying(true);
    const u = new SpeechSynthesisUtterance(items[idx].text);
    u.lang = 'ar-SA';
    u.rate = 0.85;
    u.pitch = 1;
    u.onend  = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    const go = () => synth.speak(u);
    if (synth.getVoices().length > 0) go(); else synth.onvoiceschanged = go;
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
      setAudioURL(null);
      setMicError(false);
    } catch {
      setMicError(true);
    }
  }

  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
    }
    setRecording(false);
  }

  function toggleRecording() {
    if (recording) stopRecording();
    else startRecording();
  }

  function handleResponse(responseId) {
    window.speechSynthesis?.cancel();
    setPlaying(false);
    stopRecording();
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

      {/* زر الاستماع + نص السؤال */}
      <div style={{ textAlign: 'center', margin: '16px 0 10px' }}>
        <button
          onClick={playQuestion}
          disabled={playing}
          style={{
            background: playing ? '#90a4ae' : '#185FA5',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 80,
            height: 80,
            fontSize: 32,
            cursor: playing ? 'not-allowed' : 'pointer',
            boxShadow: playing ? 'none' : '0 4px 14px rgba(24,95,165,.38)',
            transition: 'all 0.2s',
          }}
          aria-label="استمع للسؤال"
        >
          {playing ? '🔊' : '▶'}
        </button>
        <p style={{
          marginTop: 14,
          color: '#185FA5',
          fontWeight: 700,
          fontSize: 22,
          fontFamily: 'Tajawal, sans-serif',
          direction: 'rtl',
        }}>
          {items[idx].text}
        </p>
      </div>

      {/* منطقة التسجيل الصوتي للطالب */}
      <div style={{
        background: '#f0f7ff',
        border: '2px dashed #a5c8f0',
        borderRadius: 16,
        padding: '16px 12px',
        margin: '8px 0 16px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: '#555', fontFamily: 'Tajawal, sans-serif', marginBottom: 12 }}>
          🎙️ سجّل إجابتك
        </p>

        <button
          onClick={toggleRecording}
          style={{
            background: recording ? '#c62828' : '#43a047',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 72,
            height: 72,
            fontSize: 28,
            cursor: 'pointer',
            boxShadow: recording
              ? '0 0 0 6px rgba(198,40,40,.25)'
              : '0 4px 12px rgba(67,160,71,.35)',
            transition: 'all 0.2s',
            animation: recording ? 'pulse-mic 1s infinite' : 'none',
          }}
          aria-label={recording ? 'إيقاف التسجيل' : 'بدء التسجيل'}
        >
          {recording ? '⏹' : '🎤'}
        </button>

        <p style={{ marginTop: 8, fontSize: 12, color: recording ? '#c62828' : '#777', fontFamily: 'Tajawal, sans-serif', fontWeight: recording ? 700 : 400 }}>
          {recording ? '● جارٍ التسجيل... اضغط للإيقاف' : 'اضغط للتسجيل'}
        </p>

        {micError && (
          <p style={{ color: '#c62828', fontSize: 12, marginTop: 6, fontFamily: 'Tajawal, sans-serif' }}>
            ⚠️ تعذّر الوصول للميكروفون — تأكد من منح الإذن
          </p>
        )}

        {audioURL && !recording && (
          <div style={{ marginTop: 10 }}>
            <audio controls src={audioURL} style={{ width: '100%', maxWidth: 280, borderRadius: 8 }} />
          </div>
        )}
      </div>

      {/* أزرار تقييم الولي */}
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

      <style>{`
        @keyframes pulse-mic {
          0%, 100% { box-shadow: 0 0 0 4px rgba(198,40,40,.25); }
          50%       { box-shadow: 0 0 0 10px rgba(198,40,40,.10); }
        }
      `}</style>
    </div>
  );
}
