/* نطق كلمة عربية بصوت الجهاز (speechSynthesis) — البديل حين لا يوجد تسجيل
   حقيقي للكلمة. يُستدعى من داخل معالج اللمسة نفسه (شرط سفاري على آيفون).
   onStart/onEnd اختياريان لإظهار مؤشر «يُنطق الآن». */
export function speakArabic(text, { onStart, onEnd } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA';
  u.rate = 0.82;
  if (onStart) u.onstart = onStart;
  if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
  function go() {
    window.speechSynthesis.cancel();
    // prefer Arabic voice if available
    const voices = window.speechSynthesis.getVoices();
    const ar = voices.find(v => v.lang.startsWith('ar'));
    if (ar) u.voice = ar;
    window.speechSynthesis.speak(u);
  }
  if (window.speechSynthesis.getVoices().length > 0) go();
  else { window.speechSynthesis.addEventListener('voiceschanged', go, { once: true }); setTimeout(go, 500); }
}
