'use client';
import AudioClipField from './AudioClipField';
import { STORY_AUDIO_MAX_MB } from '../lib/story-audio';
import { uploadStoryPageAudio } from '../lib/story-audio-client';

/* ════════════════════════════════════════════════════════════════
   حقل صوت قراءة الصفحة — داخل محرر القصص الكامل (إنشاء وتعديل)
   تسجيل من الميكروفون أو رفع ملف ← يُرفع فوراً ويوضع في الصفحة ← يُحفظ مع
   القصة عند «حفظ التغييرات».
   يُركَّب بـ key={رقم الصفحة}: الانتقال لصفحة أخرى أثناء التسجيل يوقفه ويحفظه
   لصفحته هو (لا يُرمى).
════════════════════════════════════════════════════════════════ */

export default function StoryPageAudioField({ storyId, page, audioUrl, onChange }) {
  return (
    <AudioClipField
      audioUrl={audioUrl}
      onChange={onChange}
      upload={(blob, onProgress) => uploadStoryPageAudio(storyId, page, blob, onProgress)}
      texts={{
        title:         `🔊 صوت قراءة الصفحة ${page + 1}`,
        has:           '✅ لهذه الصفحة صوت',
        record:        'سجّل قراءة الصفحة',
        rerecord:      'إعادة تسجيل الصفحة',
        clipName:      `تسجيل الصفحة ${page + 1}`,
        recordingHint: 'جارٍ التسجيل... اقرأ نص الصفحة بصوت واضح وهادئ',
        added:         '✅ حُفظ تسجيل هذه الصفحة — اضغط «حفظ التغييرات» في الأسفل ليصل إلى الطلاب',
        removeConfirm: `إزالة صوت الصفحة ${page + 1}؟`,
        removed:       '🗑 أُزيل الصوت — يُحذف نهائياً عند «حفظ التغييرات»',
        footer:        `يسمع الطالب هذا الصوت عندما يكون على هذه الصفحة فقط. الحد الأقصى ${STORY_AUDIO_MAX_MB}MB — يُفضَّل MP3 أو M4A لأجهزة آيباد وآيفون.`,
      }}
    />
  );
}
