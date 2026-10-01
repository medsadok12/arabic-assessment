/**
 * مسار الرفع الوحيد المعتمد لكل تسجيلات الصوت الثلاثة (AudioQuestion،
 * ListenSpeak، OralAssessment) — يحوّل الـblob إلى base64 ويرسله إلى نفس
 * /api/save-recording (الذي يرفعه فعلياً إلى Vercel Blob). أي تعديل مستقبلي
 * على بروتوكول الرفع (إعادة محاولة، ضغط، إلخ) يُعدَّل هنا مرة واحدة فقط.
 */
export function uploadRecording(blob, { studentName, questionId, itemId } = {}) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      try {
        const res = await fetch('/api/save-recording', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            audioBase64: reader.result,
            studentName: studentName || 'طالب',
            questionId:  itemId ? `${questionId}_${itemId}` : questionId,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          resolve({ success: false, error: data.error || 'فشل رفع التسجيل' });
          return;
        }
        resolve({ success: true, url: data.url, fileName: data.fileName });
      } catch (err) {
        resolve({ success: false, error: err.message || 'تعذّر الاتصال بالخادم' });
      }
    };
    reader.onerror = () => resolve({ success: false, error: 'تعذّر قراءة ملف التسجيل' });
  });
}
