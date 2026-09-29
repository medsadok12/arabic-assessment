/**
 * يرفع تسجيلاً واحداً من VoiceReadingAssessment.jsx إلى Supabase Storage
 * (bucket assessment_audio مخصَّص لهذه الميزة تحديداً، مختلف عمداً عن
 * Vercel Blob المستخدَم لتسجيلات التقييم المدفوع — src/utils/uploadRecording.js)
 * عبر /api/upload-voice-recording. نفس أسلوب التحويل لـbase64 المعتمد في
 * uploadRecording.js (يتفادى تعقيد multipart في دالة Vercel بلا حالة).
 */
export function uploadVoiceRecording(blob, sentenceId) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      try {
        const res = await fetch('/api/upload-voice-recording', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: reader.result,
            sentenceId,
            contentType: blob.type || 'audio/webm',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          resolve({ success: false, error: data.error || 'فشل رفع التسجيل' });
          return;
        }
        resolve({ success: true, url: data.url });
      } catch (err) {
        resolve({ success: false, error: err.message || 'تعذّر الاتصال بالخادم' });
      }
    };
    reader.onerror = () => resolve({ success: false, error: 'تعذّر قراءة ملف التسجيل' });
  });
}
