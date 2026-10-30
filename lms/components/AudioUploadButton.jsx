'use client';

import { readAudioFile } from '../lib/audio-file';

/* زر «📁 رفع ملف صوتي» للوحات تعديل الألعاب — يمرّر data URL جاهزاً (lib/audio-file.js)
   أو رسالة خطأ ودّية. الشكل يأتي من اللوحة نفسها (style) ليطابق زر التسجيل بجانبه */
export default function AudioUploadButton({ onPick, onError, label = '📁 رفع ملف صوتي', style, disabled }) {
  return (
    <label style={{ ...style, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxSizing: 'border-box' }}>
      {label}
      <input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac" disabled={disabled} style={{ display: 'none' }}
        onChange={async e => {
          const f = e.target.files?.[0];
          e.target.value = ''; // اختيار نفس الملف مرة أخرى يعمل
          if (!f) return;
          try { onPick(await readAudioFile(f)); }
          catch (err) { onError?.(err.message); }
        }} />
    </label>
  );
}
