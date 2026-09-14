import { useState, useRef } from 'react';

export default function WritingQuestion({ question, studentInfo, onAnswer }) {
  const [imgFile,      setImgFile]      = useState(null);
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploaded,     setUploaded]     = useState(false);
  const [uploadError,  setUploadError]  = useState(null);
  const [retryCount,   setRetryCount]   = useState(0);

  const cameraRef  = useRef(null);
  const galleryRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImgFile(file);
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setUploaded(false);
    setUploadError(null);
    e.target.value = '';
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit() {
    if (!imgFile) return;
    setUploading(true);
    setUploadError(null);

    try {
      const dataUrl  = await toBase64(imgFile);
      const base64   = dataUrl.split(',')[1];
      const ext      = (imgFile.name.split('.').pop() || 'jpg').toLowerCase();
      const uniqueId = Date.now().toString(36).toUpperCase();
      const name     = (studentInfo?.name || 'طالب').replace(/[<>&"'`/\\]/g, '').trim().slice(0, 40);
      const fileName = `${name}_${question.id}_${uniqueId}.${ext}`;

      const res  = await fetch('/api/save-writing', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageBase64: base64, studentName: name, questionId: question.id, fileName }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setUploadError(data.error || 'فشل رفع الصورة');
        setRetryCount(c => c + 1);
        setUploading(false);
        return;
      }

      setUploading(false);
      setUploaded(true);
      setTimeout(() => onAnswer({
        questionId: question.id, skill: question.skill, answer: 0, isCorrect: true,
        answerText:  'صورة الكتابة مُرسلة للمعلم',
        correctText: 'تُقيَّم من المعلم',
      }), 2000);
    } catch (err) {
      setUploadError(err.message || 'تعذّر الاتصال بالخادم');
      setUploading(false);
    }
  }

  return (
    <div className="question-box">
      <div className="question-number">تدريب الكتابة</div>
      <p className="question-text">{question.text}</p>

      <div className="wq-instruction-box">
        <p className="wq-instruction">✍️ اكتب إجابتك على ورقة، ثم التقط صورة للورقة وأرسلها</p>
      </div>

      {previewUrl ? (
        <div className="wq-preview-wrap">
          <img src={previewUrl} alt="الإجابة المكتوبة" className="wq-preview-img" />
          <button className="wq-change-btn" onClick={() => galleryRef.current?.click()}>
            🔄 تغيير الصورة
          </button>
        </div>
      ) : (
        <div className="wq-pick-area">
          <button className="wq-btn-camera" onClick={() => cameraRef.current?.click()}>
            📷 التقاط صورة
          </button>
          <button className="wq-btn-gallery" onClick={() => galleryRef.current?.click()}>
            🖼️ اختيار من المعرض
          </button>
        </div>
      )}

      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

      {uploadError && (
        <div style={{ marginTop: 10 }}>
          <p className="aq-error">⚠️ {uploadError}</p>
          <button className="btn-primary" onClick={handleSubmit} style={{ marginTop: 6 }}>
            🔄 إعادة المحاولة
          </button>
          {retryCount >= 2 && (
            <button
              onClick={() => onAnswer({ questionId: question.id, skill: question.skill, answer: 0, isCorrect: true, answerText: 'تخطّى سؤال الكتابة', correctText: 'تُقيَّم من المعلم' })}
              style={{ marginTop: 8, width: '100%', padding: '10px', background: 'transparent', border: '1px solid #aaa', borderRadius: 8, color: '#666', cursor: 'pointer', fontSize: 14 }}
            >
              تخطي هذا السؤال ←
            </button>
          )}
        </div>
      )}

      {uploaded && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#e8f5e9', borderRadius: 8, border: '1px solid #66bb6a' }}>
          <p style={{ margin: 0, color: '#2e7d32', fontWeight: 'bold', fontSize: 14 }}>
            ✅ تم حفظ الإجابة الكتابية بنجاح
          </p>
        </div>
      )}

      {imgFile && !uploadError && !uploaded && (
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={uploading}
          style={{ opacity: uploading ? 0.75 : 1, marginTop: 12 }}
        >
          {uploading ? '⏳ جاري الرفع...' : 'إرسال الإجابة ✓'}
        </button>
      )}
    </div>
  );
}
