/* ════════════════════════════════════════════════════════════════
   رفع ملف صوتي جاهز (مثل ملف من ElevenLabs) في لوحات تعديل الألعاب
   يُقرأ الملف كـdata URL ويُرسل مع الكلمة، والخادم يرفعه إلى Storage ويحفظ
   رابطه فقط (lib/game-audio.js) — نفس مسار التسجيل من الميكروفون تماماً.
════════════════════════════════════════════════════════════════ */

// 3MB: يصبح ~4MB بعد base64، تحت حد Vercel لجسم الطلب (4.5MB). مقطع كلمة عادةً أقل من 100KB
export const AUDIO_FILE_MAX_MB = 3;

const BY_EXT = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac',
  wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', webm: 'audio/webm',
};

/* نوع الملف بصيغة يقبلها الخادم — المتصفحات تختلف (audio/mp3، audio/x-m4a، أو فارغ) */
export function audioMimeFor(name, type) {
  const ext = String(name || '').split('.').pop().toLowerCase();
  if (BY_EXT[ext]) return BY_EXT[ext];
  const t = String(type || '').toLowerCase();
  if (t === 'audio/mp3' || t === 'audio/mpeg3' || t === 'audio/x-mpeg') return 'audio/mpeg';
  if (t === 'audio/x-m4a' || t === 'audio/m4a') return 'audio/mp4';
  if (t === 'audio/x-wav' || t === 'audio/wave') return 'audio/wav';
  return ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/ogg', 'audio/webm'].includes(t) ? t : null;
}

/* يُرجع data URL جاهزاً للحفظ، أو يرمي خطأً برسالة ودّية تُعرض للمعلم */
export function readAudioFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('لم يُختر ملف'));
    const mime = audioMimeFor(file.name, file.type);
    if (!mime) return reject(new Error('هذا ليس ملفاً صوتياً مدعوماً — استعمل MP3 أو M4A أو WAV'));
    if (file.size > AUDIO_FILE_MAX_MB * 1024 * 1024) {
      return reject(new Error(`الملف كبير (${(file.size / 1048576).toFixed(1)}MB) — الحد ${AUDIO_FILE_MAX_MB}MB`));
    }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = String(reader.result || '').split(',')[1];
      if (!b64) return reject(new Error('تعذّرت قراءة الملف'));
      resolve(`data:${mime};base64,${b64}`);
    };
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملف'));
    reader.readAsDataURL(file);
  });
}
