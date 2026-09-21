import { useState, useEffect, useRef } from 'react';
import { useTTSPlayer } from '../hooks/useTTSPlayer.js';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { uploadRecording } from '../utils/uploadRecording.js';

const RESPONSES = [
  { id: 'correct',  icon: '✅', label: 'أجاب بشكل صحيح' },
  { id: 'partial',  icon: '⚠️', label: 'أجاب جزئياً'    },
  { id: 'wrong',    icon: '❌', label: 'لم يجب'          },
];

export default function ListenSpeak({ question, studentInfo, onAnswer }) {
  const items = question.items;
  const [idx, setIdx]           = useState(0);
  const [answers, setAnswers]   = useState([]);
  const [uploading, setUploading] = useState(false);

  const { playing, audioError, playOnce, stop, resetError } = useTTSPlayer();

  const uploadPromiseRef = useRef(null);
  const idxRef = useRef(idx);
  useEffect(() => { idxRef.current = idx; });

  // يبدأ رفع التسجيل في الخلفية فور توقّفه (من داخل معالج حدث MediaRecorder
  // نفسه، لا من useEffect) — لا ينتظر ضغط الولي لزر التقييم، فيكون الرابط
  // جاهزاً (أو شبه جاهز) لحظة استدعاء handleResponse.
  const {
    recording, audioUrl, micError, noSupport,
    start: startRecording, stop: stopRecording, reset: resetRecording,
  } = useAudioRecorder({
    onStop: (blob) => {
      setUploading(true);
      uploadPromiseRef.current = uploadRecording(blob, {
        studentName: studentInfo?.name,
        questionId:  question.id,
        itemId:      idxRef.current,
      }).then((result) => {
        setUploading(false);
        return result;
      });
    },
  });

  useEffect(() => {
    resetRecording();
    setUploading(false);
    uploadPromiseRef.current = null;
    resetError();
  }, [idx, resetError, resetRecording]);

  useEffect(() => () => stopRecording(), [stopRecording]);

  function playQuestion() {
    if (playing) return;
    playOnce(items[idx].text);
  }

  function toggleRecording() {
    if (recording) stopRecording();
    else startRecording();
  }

  async function handleResponse(responseId) {
    stop();
    stopRecording();
    const pending = uploadPromiseRef.current;
    const uploadResult = pending ? await pending : null;
    const updated = [...answers, {
      text:     items[idx].text,
      response: responseId,
      audioUrl: uploadResult?.success ? uploadResult.url : null,
    }];
    setAnswers(updated);
    if (idx + 1 < items.length) {
      setIdx((i) => i + 1);
    } else {
      const correctCount = updated.filter((a) => a.response === 'correct').length;
      onAnswer({
        questionId:    question.id,
        skill:         question.skill ?? 'speaking',
        answer:        updated,
        isCorrect:     correctCount / items.length >= 0.5,
        answerText:    `أجاب صحيحاً عن ${correctCount} من ${items.length} أسئلة شفهية`,
        correctText:   `${items.length} إجابات شفهية صحيحة`,
        recordingUrls: updated.map((a) => a.audioUrl).filter(Boolean),
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
        {audioError && (
          <p style={{ color: '#c62828', fontSize: 12, fontFamily: 'Tajawal, sans-serif', marginTop: 6 }}>
            ⚠️ تعذّر تشغيل الصوت، جرّب مرة أخرى
          </p>
        )}
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

        {noSupport && (
          <p style={{ color: '#c62828', fontSize: 12, fontFamily: 'Tajawal, sans-serif', marginBottom: 8 }}>
            ⚠️ المتصفح لا يدعم التسجيل. استخدم Chrome أو Edge.
          </p>
        )}

        <button
          onClick={toggleRecording}
          disabled={noSupport}
          style={{
            background: recording ? '#c62828' : '#43a047',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 72,
            height: 72,
            fontSize: 28,
            cursor: noSupport ? 'not-allowed' : 'pointer',
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

        {audioUrl && !recording && (
          <div style={{ marginTop: 10 }}>
            <audio controls src={audioUrl} style={{ width: '100%', maxWidth: 280, borderRadius: 8 }} />
            {uploading && (
              <p style={{ marginTop: 6, fontSize: 11, color: '#888', fontFamily: 'Tajawal, sans-serif' }}>
                ⏳ جارٍ حفظ التسجيل...
              </p>
            )}
          </div>
        )}
      </div>

      {/* أزرار تقييم الولي */}
      <div className="oa-parent-controls">
        <p className="oa-controls-label">— للولي فقط: اضغط الزر المناسب بعد إجابة الطفل —</p>
        <div className="oa-buttons">
          {RESPONSES.map((r) => (
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
