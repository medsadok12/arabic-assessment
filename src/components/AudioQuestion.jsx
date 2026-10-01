import { useState, useRef, useEffect } from 'react';
import { useTTSPlayer } from '../hooks/useTTSPlayer.js';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { uploadRecording } from '../utils/uploadRecording.js';

const MAX_SECS = 60;

export default function AudioQuestion({ question, studentInfo, onAnswer }) {
  const [playCount,   setPlayCount]   = useState(0);  // 1..3 أثناء التشغيل
  const [recTime,     setRecTime]     = useState(0);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [retryCount,  setRetryCount]  = useState(0);

  const timerRef = useRef(null);
  const { playing, audioError, playRepeated } = useTTSPlayer();
  const { recording, audioUrl, micError, noSupport, start, stop, getBlob } = useAudioRecorder();

  const recState = recording ? 'recording' : audioUrl ? 'done' : 'idle';

  useEffect(() => () => clearInterval(timerRef.current), []);

  async function playTTS() {
    await playRepeated(question.audioText, 3, 700, setPlayCount);
    setPlayCount(0);
  }

  async function startRec() {
    setUploadError(null);
    setSaved(false);
    const started = await start();
    if (!started) return;
    setRecTime(0);
    timerRef.current = setInterval(() => {
      setRecTime((t) => {
        if (t + 1 >= MAX_SECS) { stop(); return MAX_SECS; }
        return t + 1;
      });
    }, 1000);
  }

  function stopRec() {
    stop();
    clearInterval(timerRef.current);
  }

  async function handleSubmit() {
    const blob = getBlob();
    if (!blob) return;
    setSaving(true);
    setUploadError(null);

    const result = await uploadRecording(blob, {
      studentName: studentInfo?.name,
      questionId:  question.id,
    });

    if (!result.success) {
      console.error('[AudioQuestion] رفع التسجيل فشل:', result.error);
      setUploadError(true);
      setRetryCount((c) => c + 1);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => onAnswer({
      questionId:  question.id,
      skill:       question.skill,
      answer:      0,
      isCorrect:   true,
      answerText:  'تسجيل صوتي مُرسل للمعلم',
      correctText: 'يُقيَّم من المعلم',
      audioUrl:    result.url,
    }), 2000);
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="question-box">
      <div className="question-number">تدريب الكلام</div>
      <p className="question-text">{question.text}</p>

      {/* ── منطقة الاستماع ── */}
      <div className="aq-listen-box">
        <span className="aq-listen-label">النص المسموع</span>
        <div className="aq-text-display">
          «&nbsp;{question.audioText}&nbsp;»
        </div>
        <button
          className={`aq-play-btn${playing ? ' aq-playing' : ''}`}
          onClick={playTTS}
          disabled={playing}
        >
          <span className="aq-play-icon">{playing ? '🔊' : '▶'}</span>
          {playing
            ? `جاري التشغيل... (${playCount}/3)`
            : 'استمع للنص ×3'}
        </button>
        {audioError && (
          <p className="aq-error" style={{ marginTop: 6 }}>⚠️ تعذّر تشغيل الصوت، جرّب مرة أخرى</p>
        )}
      </div>

      {/* ── منطقة التسجيل ── */}
      <div className={`aq-record-box${recState === 'recording' ? ' aq-rec-active' : ''}`}>
        <p className="aq-record-title">{question.prompt}</p>
        <p className="aq-record-hint">سجّل إجابتك بصوتك ثم أرسل التسجيل</p>

        {noSupport && (
          <p className="aq-error">⚠️ المتصفح لا يدعم التسجيل. استخدم Chrome أو Edge.</p>
        )}
        {micError && (
          <p className="aq-error">⚠️ يرجى السماح للمتصفح بالوصول إلى الميكروفون.</p>
        )}

        {recState === 'recording' && (
          <div className="aq-rec-indicator">
            <span className="aq-rec-dot" />
            <span className="aq-rec-time">{fmt(recTime)}</span>
            <span className="aq-rec-max">/ {fmt(MAX_SECS)}</span>
          </div>
        )}

        {recState === 'done' && audioUrl && (
          <div className="aq-playback">
            <p className="aq-playback-label">✅ استمع لتسجيلك قبل الإرسال:</p>
            <audio controls src={audioUrl} style={{ width: '100%', borderRadius: 8 }} />
          </div>
        )}

        {recState !== 'recording' ? (
          <button className="aq-btn-rec" onClick={startRec} disabled={saving}>
            🎙️ {recState === 'done' ? 'إعادة التسجيل' : 'ابدأ التسجيل'}
          </button>
        ) : (
          <button className="aq-btn-stop" onClick={stopRec}>
            ⏹️ إيقاف التسجيل
          </button>
        )}
      </div>

      {/* ── خطأ الرفع ── */}
      {uploadError && (
        <div style={{ marginTop: 10 }}>
          <p className="aq-error">⚠️ عذراً، حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى</p>
          <button className="btn-primary" onClick={handleSubmit} style={{ marginTop: 6 }}>
            🔄 إعادة المحاولة
          </button>
          {retryCount >= 2 && (
            <button
              onClick={() => onAnswer({ questionId: question.id, skill: question.skill, answer: 0, isCorrect: false, answerText: 'تم التخطي بسبب مشكلة تقنية في الرفع', correctText: 'يُقيَّم من المعلم' })}
              style={{ marginTop: 8, width: '100%', padding: '10px', background: 'transparent', border: '1px solid #aaa', borderRadius: 8, color: '#666', cursor: 'pointer', fontSize: 14 }}
            >
              تخطي هذا السؤال ←
            </button>
          )}
        </div>
      )}

      {/* ── نجاح الرفع ── */}
      {saved && (
        <div style={{ marginTop: 10, padding: '10px 14px', background: '#e8f5e9', borderRadius: 8, border: '1px solid #66bb6a' }}>
          <p style={{ margin: 0, color: '#2e7d32', fontWeight: 'bold', fontSize: 14 }}>
            ✅ تم حفظ التسجيل بنجاح
          </p>
        </div>
      )}

      {/* ── زر الإرسال ── */}
      {recState === 'done' && !uploadError && !saved && (
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={saving}
          style={{ opacity: saving ? 0.75 : 1, marginTop: 8 }}
        >
          {saving ? '⏳ جاري الرفع...' : 'إرسال التسجيل ✓'}
        </button>
      )}
    </div>
  );
}
