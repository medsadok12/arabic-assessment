/* نسخة محرر القصص الكامل (/teacher/stories) — تُرسل مع كل حفظ للقصة.
   صفحة محرر فُتحت قبل تحديث المنصة تبقى تعمل بكودها القديم حتى يُعاد تحميلها.
   المحرر القديم كان يحفظ القصة بينما الأصوات المختارة لم تُرفع بعد (زر «اعتمد»)،
   فيضيع الصوت بصمت — حدث فعلاً لقصة «فَهيم» (2026-10-16): تبويب فُتح 14:44 وحُفظ
   منه ثلاث مرات بعد نشر الإصلاح. فيرفض الخادم حفظ محتوى من محرر بلا هذه النسخة
   برسالة واضحة بدل حفظ ناقص صامت.
   النسخة 3 (2026-10-17): نسخة 2 كانت تسمح بـ«حفظ التغييرات» أثناء رفع صوت صفحة،
   فيُحفظ بلا الصوت (ضاع صوت الصفحة 1 من «فَهيم» هكذا). نسخة 3 تحفظ الصوت في القصة
   فور رفعه وتمنع الحفظ حتى يكتمل الرفع.
   ارفع STORY_EDITOR_VERSION مع أي تغيير يجعل حفظ المحرر القديم يُضيع بيانات. */

export const STORY_EDITOR_HEADER  = 'x-story-editor';
export const STORY_EDITOR_VERSION = 3;
export const EDITOR_OUTDATED_CODE = 'editor_outdated';
export const EDITOR_OUTDATED_MSG  =
  'هذه الصفحة تعمل بنسخة قديمة من المحرر — أعد تحميل الصفحة (⌘+R أو زر التحديث ↻) ثم ارفع الأصوات واحفظ مرة أخرى. '
  + 'لم يُحفظ شيء هذه المرة، وتعديلاتك غير المحفوظة تُعرض لاسترجاعها بعد إعادة التحميل.';

/** هل هذا حفظ لمحتوى القصة من محرر قديم؟ تغيير الحالة أو أصوات لوحة bogga وحدها لا يُمَس. */
export function isOutdatedEditorSave(headers, body) {
  if (!body || body.content === undefined) return false;
  const v = Number(headers?.get?.(STORY_EDITOR_HEADER));
  return !(Number.isFinite(v) && v >= STORY_EDITOR_VERSION);
}

export function editorVersionHeaders() {
  return { [STORY_EDITOR_HEADER]: String(STORY_EDITOR_VERSION) };
}
