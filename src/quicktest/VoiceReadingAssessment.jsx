import { useState, useRef } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { uploadVoiceRecording } from './uploadVoiceRecording.js';

// أربع جمل ثابتة بالتشكيل + إيموجي معبّر — المكوّن الرابع في تسلسل الاختبار
// الترويجي (بعد تدريبَي المطابقة، قبل الأسئلة الـ15). غير قابل للتعديل من
// bogga في هذه الدفعة (لم يُطلَب ذلك صراحة، بنفس القرار الأولي لتدريبَي
// المطابقة عند بنائهما أول مرة) — إن طُلب لاحقاً يُبنى بنفس نمط
// quicktest_alphabet_letters (جدول منفصل + مسارات CMS).
const SENTENCES = [
  { id: 'sentence-1', text: 'هَذَا أَبِي',             emoji: '👨' },
  { id: 'sentence-2', text: 'هَذِهِ أُمِّي',            emoji: '👩' },
  { id: 'sentence-3', text: 'هَذَا أَخِي',              emoji: '👦' },
  { id: 'sentence-4', text: 'أَنَا أُحِبُّ مَدْرَسَتِي', emoji: '🏫' },
];

/**
 * تقييم القراءة الجهرية والتسجيل الصوتي — يسجّل الطفل قراءته لكل جملة عبر
 * MediaRecorder (useAudioRecorder، نفس الـhook المشترك مع أسئلة النطق في
 * التقييم الحقيقي المدفوع، القسم 15 من CLAUDE.md)، ثم تُرفع المقاطع عند
 * "متابعة" إلى Supabase Storage (bucket assessment_audio مخصَّص — منفصل
 * عمداً عن Vercel Blob المستخدَم في التقييم المدفوع، بطلب صريح من الأستاذ
 * محمد لهذه الميزة تحديداً).
 *
 * صفر إحباط: التسجيل اختياري لكل جملة على حدة، ولا يُشترَط تسجيل الأربع
 * جميعاً للمتابعة — عائلة بلا ميكروفون تعمل، وطفل خجول لا يُحبَس عند هذه
 * الخطوة. أي جملة غير مسجَّلة تُستبعَد بصمت من المصفوفة المُرسَلة.
 */
export default function VoiceReadingAssessment({ onComplete }) {
  const blobsRef = useRef({});
  const [, forceUpdate]               = useState(0);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState('');

  function handleChange(sentenceId, blob) {
    if (blob) blobsRef.current[sentenceId] = blob;
    else delete blobsRef.current[sentenceId];
    forceUpdate(n => n + 1);
  }

  async function handleContinue() {
    if (uploading) return;
    setUploading(true);
    setUploadError('');

    const entries = Object.entries(blobsRef.current);
    const uploaded = await Promise.all(
      entries.map(async ([sentenceId, blob]) => {
        const sentence = SENTENCES.find(s => s.id === sentenceId);
        const result = await uploadVoiceRecording(blob, sentenceId);
        return result.success
          ? { sentenceId, text: sentence.text, emoji: sentence.emoji, audioUrl: result.url }
          : null;
      })
    );

    const recordings = uploaded.filter(Boolean);
    if (entries.length > 0 && recordings.length === 0) {
      setUploading(false);
      setUploadError('تعذّر حفظ التسجيلات، تحقق من اتصالك بالإنترنت وحاول مجدداً.');
      return;
    }

    onComplete({
      type:       'voice-reading',
      questionId: 'voice-reading',
      skillTag:   'القراءة الجهرية',
      recordings,
    });
  }

  return (
    <div className="page-content">
      <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 13, marginBottom: 6 }}>
        المكوّن الرابع
      </p>
      <h2 className="page-title" style={{ fontSize: '1.15rem', marginBottom: 8 }}>🎙️ اقرأ هذه الجمل بصوتك</h2>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>
        اضغط "ابدأ التسجيل"، واقرأ كل جملة بصوت عالٍ وواضح. يمكنك الاستماع لصوتك أو حذفه وإعادة التسجيل قبل المتابعة.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 6 }}>
        {SENTENCES.map(sentence => (
          <SentenceRecorder
            key={sentence.id}
            sentence={sentence}
            onChange={(blob) => handleChange(sentence.id, blob)}
          />
        ))}
      </div>

      {uploadError && <div className="error-msg" style={{ margin: '14px 0' }}>⚠️ {uploadError}</div>}

      <button
        className="btn-primary"
        type="button"
        onClick={handleContinue}
        disabled={uploading}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 18 }}
      >
        {uploading && <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />}
        {uploading ? 'جارٍ الحفظ...' : 'متابعة ←'}
      </button>
    </div>
  );
}

function SentenceRecorder({ sentence, onChange }) {
  const { recording, audioUrl, micError, noSupport, start, stop, reset } = useAudioRecorder({
    onStop: (blob) => onChange(blob),
  });

  function handleDelete() {
    reset();
    onChange(null);
  }

  return (
    <div className={`aq-record-box${recording ? ' aq-rec-active' : ''}`} style={{ marginBottom: 0 }}>
      <div className="vr-sentence-row">
        <span className="vr-sentence-emoji">{sentence.emoji}</span>
        <span className="vr-sentence-text">{sentence.text}</span>
        {audioUrl && <span className="vr-sentence-done">✅</span>}
      </div>

      {noSupport && (
        <p className="aq-error">⚠️ متصفحك الحالي لا يدعم تسجيل الصوت — يمكنك المتابعة بلا تسجيل هذه الجملة.</p>
      )}
      {micError && (
        <p className="aq-error">⚠️ يبدو أنّ المتصفح لم يسمح باستخدام الميكروفون — يمكنك المتابعة بلا تسجيل هذه الجملة.</p>
      )}

      {recording && (
        <div className="aq-rec-indicator">
          <span className="aq-rec-dot" />
          <span style={{ fontWeight: 800, color: 'var(--danger)' }}>جارٍ التسجيل الآن...</span>
        </div>
      )}

      {audioUrl && !recording && (
        <div className="aq-playback">
          <p className="aq-playback-label">🎧 استمع لتسجيلك:</p>
          <audio controls src={audioUrl} style={{ width: '100%', borderRadius: 8 }} />
        </div>
      )}

      {!noSupport && (
        <div className="vr-actions">
          {!recording ? (
            <button type="button" className="aq-btn-rec" onClick={start}>
              🎙️ {audioUrl ? 'إعادة التسجيل' : 'ابدأ التسجيل'}
            </button>
          ) : (
            <button type="button" className="aq-btn-stop" onClick={stop}>
              ⏹️ إيقاف التسجيل
            </button>
          )}
          {audioUrl && !recording && (
            <button type="button" className="vr-delete-btn" onClick={handleDelete}>
              🗑️ حذف التسجيل
            </button>
          )}
        </div>
      )}
    </div>
  );
}
