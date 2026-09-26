// مشغّل صوت حقيقي (Azure Neural TTS عبر /api/tts) بديلاً لـwindow.speechSynthesis.
// لماذا: speechSynthesis يعتمد على الأصوات المثبَّتة على جهاز الطفل نفسه —
// تختلف جودتها بشدة بين المتصفحات، وقد تغيب أي لهجة عربية إطلاقاً على بعض
// الأجهزة (تعليق صامت بلا أي صوت). ملف MP3 حقيقي من الخادم لا يعتمد على
// جهاز الطفل إطلاقاً، ويضمن نطقاً دقيقاً لتمييز الحروف المتقاربة (ط/ت، ص/س).
//
// عمداً بلا أي سقوط صامت لـwindow.speechSynthesis عند الفشل — فشل الشبكة هنا
// يُعاد للمكوّن المستدعي كاستثناء ليعرض حالة "أعد المحاولة" الودودة الموجودة
// أصلاً في مكوّنات مشابهة (WritingQuestion/AudioQuestion)، بدل تكديس مسارين
// صامتين يصعب تتبعهما.

export function createTTSPlayer() {
  let audio = null;
  let currentSettle = null; // { resolve, reject } الخاصة بالتشغيلة الحالية
  let cancelRequested = false;

  function ttsUrl(text) {
    return `/api/tts?t=${encodeURIComponent(text)}`;
  }

  // يوقف أي تشغيل حالي فوراً. عند المقاطعة الطبيعية (مستخدم يشغّل صوتاً
  // جديداً قبل انتهاء السابق) نُنهي الـPromise السابقة بهدوء (resolve) بدل
  // تركها معلّقة للأبد.
  function killCurrentAudio() {
    if (audio) {
      audio.pause();
      audio.src = '';
      audio = null;
    }
    if (currentSettle) {
      currentSettle.resolve();
      currentSettle = null;
    }
  }

  function playAudioOnce(text) {
    killCurrentAudio();
    return new Promise((resolve, reject) => {
      const el = new Audio(ttsUrl(text));
      audio = el;
      currentSettle = { resolve, reject };
      el.onended = () => { currentSettle = null; resolve(); };
      el.onerror = () => { currentSettle = null; reject(new Error('تعذّر تشغيل الصوت')); };
      el.play().catch((err) => { currentSettle = null; reject(err); });
    });
  }

  /** تشغيل لمرة واحدة. يقاطع أي تشغيل سابق تلقائياً (نفس سلوك synth.cancel() سابقاً). */
  function playOnce(text) {
    cancelRequested = false;
    return playAudioOnce(text);
  }

  /** يشغّل النص عدة مرات متتالية بفاصل زمني، مع استدعاء onProgress(playNumber) قبل كل تشغيلة. */
  async function playRepeated(text, times = 1, gapMs = 700, onProgress) {
    cancelRequested = false;
    for (let i = 1; i <= times; i++) {
      if (cancelRequested) return;
      onProgress?.(i);
      await playAudioOnce(text);
      if (cancelRequested) return;
      if (i < times) await new Promise((r) => setTimeout(r, gapMs));
    }
  }

  /** يوقف أي تشغيل/تكرار جارٍ فوراً (يُستدعى عند تفكيك المكوّن). */
  function stop() {
    cancelRequested = true;
    killCurrentAudio();
  }

  return { playOnce, playRepeated, stop };
}
