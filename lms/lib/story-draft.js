/* نسخة احتياطية محلية لتعديلات محرر القصص (/teacher/stories) — على هذا الجهاز فقط.
   أي تعديل لم يُحفظ يُكتب في localStorage أولاً بأول، فلا يضيع إن فشل الحفظ (جلسة
   منتهية، انقطاع شبكة) أو أُغلقت الصفحة أو أُعيد تحميلها؛ وعند فتح نفس القصة لاحقاً
   يُعرض استرجاعها. تُمسح النسخة بعد نجاح الحفظ أو بطلب المعلم.
   درس 2026-10-16: أربع صفحات جديدة ضاعت نصوصها بعد رفض حفظ بجلسة منتهية. */

export const STORY_DRAFT_PREFIX = 'aarem-story-draft:';
export const STORY_DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 يوماً

export function storyDraftKey(storyId) {
  return STORY_DRAFT_PREFIX + (storyId || 'new');
}

/** تمثيل ثابت للمقارنة: هل تغيّر شيء عن النسخة المحفوظة؟ */
export function draftSnapshot(form, pageAudio) {
  return JSON.stringify({ form: form || null, pageAudio: Array.isArray(pageAudio) ? pageAudio : [] });
}

export function readStoryDraft(storage, storyId, now = Date.now()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(storyDraftKey(storyId));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || !d.form || typeof d.savedAt !== 'number') return null;
    if (now - d.savedAt > STORY_DRAFT_MAX_AGE_MS) {
      storage.removeItem(storyDraftKey(storyId));
      return null;
    }
    return { savedAt: d.savedAt, form: d.form, pageAudio: Array.isArray(d.pageAudio) ? d.pageAudio : [] };
  } catch {
    return null;
  }
}

/** true إن حُفظت النسخة (قد تفشل إن امتلأت مساحة المتصفح أو كان التخزين محجوباً). */
export function writeStoryDraft(storage, storyId, form, pageAudio, now = Date.now()) {
  if (!storage) return false;
  try {
    storage.setItem(storyDraftKey(storyId), JSON.stringify({ v: 1, savedAt: now, form, pageAudio: pageAudio || [] }));
    return true;
  } catch {
    return false;
  }
}

export function clearStoryDraft(storage, storyId) {
  if (!storage) return;
  try { storage.removeItem(storyDraftKey(storyId)); } catch {}
}

/** هل في النسخة المحلية ما يختلف عن النسخة المفتوحة من الخادم؟ */
export function draftDiffers(draft, form, pageAudio) {
  return !!draft && draftSnapshot(draft.form, draft.pageAudio) !== draftSnapshot(form, pageAudio);
}
