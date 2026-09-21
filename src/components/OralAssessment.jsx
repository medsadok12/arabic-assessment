import { useState, useEffect, useRef } from 'react';
import { shuffle } from '../data/questions.js';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { uploadRecording } from '../utils/uploadRecording.js';

const ITEMS = [
  { id: 'walad',   emoji: '👦' },
  { id: 'bint',    emoji: '👧' },
  { id: 'bab',     emoji: '🚪' },
  { id: 'sarir',   emoji: '🛏️' },
  { id: 'kursi',   emoji: '🪑' },
  { id: 'bayt',    emoji: '🏠' },
  { id: 'tawla',   emoji: '🍽️' },
  { id: 'tuffaha', emoji: '🍎' },
  { id: 'maa',     emoji: '💧' },
  { id: 'shams',   emoji: '☀️' },
  { id: 'kitab',   emoji: '📖' },
  { id: 'khubz',   emoji: '🍞' },
];

const RESPONSES = [
  { id: 'correct',   icon: '✅', label: 'نطق صحيح'        },
  { id: 'hesitated', icon: '⚠️', label: 'تردد في الإجابة' },
  { id: 'unknown',   icon: '❌', label: 'لم يتعرف عليها'  },
];

export default function OralAssessment({ question, studentInfo, onAnswer }) {
  const [items]     = useState(() => shuffle(ITEMS));
  const [idx,        setIdx]       = useState(0);
  const [answers,    setAnswers]   = useState([]);
  const [uploading,  setUploading] = useState(false);

  const uploadPromiseRef = useRef(null);
  const idxRef = useRef(idx);
  useEffect(() => { idxRef.current = idx; });

  // تسجيل اختياري لصوت الطفل — يُرفَع في الخلفية فور توقّفه (من داخل معالج
  // حدث MediaRecorder نفسه، لا من useEffect)، فيكون الرابط جاهزاً (أو شبه
  // جاهز) لحظة ضغط الولي على زر التقييم.
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
  }, [idx, resetRecording]);

  useEffect(() => () => stopRecording(), [stopRecording]);

  function toggleRecording() {
    if (recording) stopRecording();
    else startRecording();
  }

  async function handleResponse(responseId) {
    stopRecording();
    const pending = uploadPromiseRef.current;
    const uploadResult = pending ? await pending : null;
    const updated = [...answers, {
      item:     items[idx].id,
      response: responseId,
      audioUrl: uploadResult?.success ? uploadResult.url : null,
    }];
    setAnswers(updated);

    if (idx + 1 < items.length) {
      setIdx(idx + 1);
    } else {
      const correctCount = updated.filter((a) => a.response === 'correct').length;
      onAnswer({
        questionId:    question.id,
        skill:         question.skill ?? 'speaking',
        answer:        updated,
        isCorrect:     correctCount / items.length >= 0.5,
        answerText:    `نطق صحيحاً ${correctCount} من ${items.length} كلمة`,
        correctText:   `نطق ${items.length} كلمة بشكل صحيح`,
        recordingUrls: updated.map((a) => a.audioUrl).filter(Boolean),
      });
    }
  }

  const item  = items[idx];
  const total = items.length;

  return (
    <div className="question-box oa-box">

      {/* ── رأس خاص بالولي ── */}
      <div className="oa-parent-header">
        <p className="oa-parent-title">أَسْمِعْنِي صَوْتَكَ</p>
        <div className="oa-progress">{idx + 1} / {total}</div>
      </div>

      {/* ── منطقة الصورة — ما يراه الطفل فقط ── */}
      <div className="oa-image-zone">
        <span className="oa-emoji" role="img" aria-hidden="true">{item.emoji}</span>
      </div>

      {/* ── تسجيل صوتي اختياري — يُحفَظ للمعلم ── */}
      <div style={{
        background: '#f0f7ff',
        border: '2px dashed #a5c8f0',
        borderRadius: 16,
        padding: '14px 12px',
        margin: '4px 0 16px',
        textAlign: 'center',
      }}>
        {noSupport ? (
          <p style={{ color: '#c62828', fontSize: 12, fontFamily: 'Tajawal, sans-serif' }}>
            ⚠️ المتصفح لا يدعم التسجيل. استخدم Chrome أو Edge.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 12, color: '#555', fontFamily: 'Tajawal, sans-serif', marginBottom: 10 }}>
              🎙️ سجّل صوت الطفل (اختياري — يُحفَظ للمعلم)
            </p>
            <button
              onClick={toggleRecording}
              style={{
                background: recording ? '#c62828' : '#43a047',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 60,
                height: 60,
                fontSize: 22,
                cursor: 'pointer',
                boxShadow: recording ? '0 0 0 6px rgba(198,40,40,.25)' : '0 4px 12px rgba(67,160,71,.35)',
                transition: 'all 0.2s',
              }}
              aria-label={recording ? 'إيقاف التسجيل' : 'بدء التسجيل'}
            >
              {recording ? '⏹' : '🎤'}
            </button>
            <p style={{ marginTop: 6, fontSize: 11, color: recording ? '#c62828' : '#888', fontFamily: 'Tajawal, sans-serif' }}>
              {recording ? '● جارٍ التسجيل...' : audioUrl ? 'تم التسجيل ✓' : 'اضغط للتسجيل'}
            </p>
            {micError && (
              <p style={{ color: '#c62828', fontSize: 11, marginTop: 4, fontFamily: 'Tajawal, sans-serif' }}>
                ⚠️ تعذّر الوصول للميكروفون
              </p>
            )}
            {audioUrl && !recording && (
              <div style={{ marginTop: 8 }}>
                <audio controls src={audioUrl} style={{ width: '100%', maxWidth: 240, borderRadius: 8 }} />
                {uploading && (
                  <p style={{ marginTop: 4, fontSize: 10, color: '#888', fontFamily: 'Tajawal, sans-serif' }}>
                    ⏳ جارٍ حفظ التسجيل...
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── لوحة تحكم الولي — مفصولة بصرياً ── */}
      <div className="oa-parent-controls">
        <p className="oa-controls-label">— للولي فقط: اضغط الزر المناسب بعد استجابة الطفل —</p>
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

    </div>
  );
}
