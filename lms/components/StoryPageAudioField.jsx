'use client';
import AudioClipField from './AudioClipField';
import { STORY_AUDIO_MAX_MB } from '../lib/story-audio';
import { uploadStoryPageAudio } from '../lib/story-audio-client';

/* ════════════════════════════════════════════════════════════════
   حقل صوت قراءة الصفحة — داخل محرر القصص الكامل (إنشاء وتعديل)
   تسجيل من الميكروفون أو رفع ملف ← معاينة ← «اعتمد هذا الصوت» يرفع
   الملف ويضعه في الصفحة ← يُحفظ مع القصة عند «حفظ التغييرات».
   يُركَّب بـ key={رقم الصفحة}: الانتقال لصفحة أخرى يوقف أي تسجيل جارٍ.
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
        accept:        '✔ اعتمد هذا الصوت للصفحة',
        added:         '✅ أُضيف الصوت لهذه الصفحة — اضغط «حفظ التغييرات» في الأسفل لحفظه مع القصة',
        removeConfirm: `إزالة صوت الصفحة ${page + 1}؟`,
        removed:       '🗑 أُزيل الصوت — يُحذف نهائياً عند «حفظ التغييرات»',
        footer:        `يسمع الطالب هذا الصوت عندما يكون على هذه الصفحة فقط. صفحة بلا تسجيل يقرؤها جهاز الطالب بصوته الآلي عند الضغط على «استمع» — وتسجيلك أوضح وأقرب للطفل. الحد الأقصى ${STORY_AUDIO_MAX_MB}MB — يُفضَّل MP3 أو M4A لأجهزة آيباد وآيفون.`,
      }}
    />
  );
}
