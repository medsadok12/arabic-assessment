import { useState, useRef, useEffect } from 'react';

const MAX_SECS = 60;

export default function AudioQuestion({ question, studentInfo, onAnswer }) {
  const [ttsState,    setTtsState]    = useState('idle');   // idle | playing
  const [recState,    setRecState]    = useState('idle');   // idle | recording | done
  const [recTime,     setRecTime]     = useState(0);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [savedUrl,    setSavedUrl]    = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [micError,    setMicError]    = useState(false);
  const [noSupport,   setNoSupport]   = useState(false);
  const [audioUrl,    setAudioUrl]    = useState(null);

  const recRef    = useRef(null);
  const chunksRef = useRef([]);
  const timerRef  = useRef(null);
  const blobRef   = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    window.speechSynthesis?.cancel();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, []);

  function playTTS() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(question.audioText);
    u.lang = 'ar-SA';
    u.rate  = 0.78;
    u.pitch = 1;
    u.volume = 1;
    u.onstart = () => setTtsState('playing');
    u.onend   = () => setTtsState('idle');
    u.onerror = () => setTtsState('idle');

    const trySpeak = () => {
      const voices  = synth.getVoices();
      const arVoice = voices.find(v => v.lang.startsWith('ar'));
      if (arVoice) u.voice = arVoice;
      synth.speak(u);
    };

    const voices = synth.getVoices();
    if (voices.length > 0) { trySpeak(); }
    else { synth.onvoiceschanged = trySpeak; synth.speak(u); }
    setTtsState('playing');
  }

  async function startRec() {
    setMicError(false);
    setUploadError(null);
    setSaved(false);
    setSavedUrl(null);
    if (!navigator.mediaDevices?.getUserMedia) { setNoSupport(true); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType });
      recRef.current = mr;

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        setAudioUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
        stream.getTracks().forEach(t => t.stop());
        setRecState('done');
        clearInterval(timerRef.current);
      };

      mr.start(200);
      setRecState('recording');
      setRecTime(0);
      timerRef.current = setInterval(() => {
        setRecTime(t => {
          if (t + 1 >= MAX_SECS) { mr.stop(); return MAX_SECS; }
          return t + 1;
        });
      }, 1000);
    } catch {
      setMicError(true);
    }
  }

  function stopRec() {
    recRef.current?.stop();
    clearInterval(timerRef.current);
  }

  async function handleSubmit() {
    if (!blobRef.current) return;
    setSaving(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.readAsDataURL(blobRef.current);
    reader.onloadend = async () => {
      try {
        const res  = await fetch('/api/save-recording', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            audioBase64: reader.result,
            studentName: studentInfo?.name || 'طالب',
            questionId:  question.id,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setUploadError(data.error || 'فشل رفع التسجيل');
          setSaving(false);
          return;
        }
        setSaving(false);
        setSaved(true);
        setSavedUrl(data.url);
        setTimeout(() => onAnswer({
          questionId: question.id,
          skill:      question.skill,
          answer:     0,
          isCorrect:  true,
        }), 2000);
      } catch (err) {
        setUploadError(err.message || 'تعذّر الاتصال بالخادم');
        setSaving(false);
      }
    };
    reader.onerror = () => {
      setUploadError('تعذّر قراءة ملف التسجيل');
      setSaving(false);
    };
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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
          className={`aq-play-btn${ttsState === 'playing' ? ' aq-playing' : ''}`}
          onClick={playTTS}
          disabled={ttsState === 'playing'}
        >
          <span className="aq-play-icon">{ttsState === 'playing' ? '🔊' : '▶'}</span>
          {ttsState === 'playing' ? 'جاري التشغيل...' : 'استمع للنص'}
        </button>
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
          <p className="aq-error">⚠️ {uploadError}</p>
          <button className="btn-primary" onClick={handleSubmit} style={{ marginTop: 6 }}>
            🔄 إعادة المحاولة
          </button>
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
