'use client';
import AudioClipField from './AudioClipField';
import { STORY_AUDIO_MAX_MB } from '../lib/story-audio';

/* ════════════════════════════════════════════════════════════════
   حقل صوت قراءة الصفحة — داخل محرر القصص الكامل (إنشاء وتعديل)
   تسجيل من الميكروفون أو رفع ملف ← يُرفع فوراً ويوضع في الصفحة ← يُحفظ في القصة
   على الخادم فوراً إن كانت الصفحة محفوظة فيها (upload من StoryPageEditor يُرجع
   { url, live })، وإلا مع «حفظ التغييرات».
   يُركَّب بـ key={uid الصفحة}: الانتقال لصفحة أخرى أثناء التسجيل يوقفه ويحفظه
   لصفحته هو (لا يُرمى).
════════════════════════════════════════════════════════════════ */

export default function StoryPageAudioField({ page, audioUrl, onChange, upload }) {
  return (
    <AudioClipField
      audioUrl={audioUrl}
      onChange={onChange}
      upload={async (blob, onProgress) => {
        const { url, live } = await upload(blob, onProgress);
        return {
          url,
          message: live
            ? `✅ حُفظ صوت الصفحة ${page + 1} في القصة — يسمعه الطلاب الآن`
            : '✅ رُفع الصوت — اضغط «💾 حفظ التغييرات» في الأسفل ليصل إلى الطلاب',
        };
      }}
      texts={{
        title:         `🔊 صوت قراءة الصفحة ${page + 1}`,
        has:           '✅ لهذه الصفحة صوت',
        record:        'سجّل قراءة الصفحة',
        rerecord:      'إعادة تسجيل الصفحة',
        clipName:      `تسجيل الصفحة ${page + 1}`,
        recordingHint: 'جارٍ التسجيل... اقرأ نص الصفحة بصوت واضح وهادئ',
        added:         '✅ رُفع الصوت — اضغط «💾 حفظ التغييرات» في الأسفل ليصل إلى الطلاب',
        removeConfirm: `إزالة صوت الصفحة ${page + 1}؟`,
        removed:       '🗑 أُزيل الصوت — يُزال من القصة عند «💾 حفظ التغييرات»',
        footer:        `يسمع الطالب هذا الصوت عندما يكون على هذه الصفحة فقط. الحد الأقصى ${STORY_AUDIO_MAX_MB}MB — يُفضَّل MP3 أو M4A لأجهزة آيباد وآيفون.`,
      }}
    />
  );
}
