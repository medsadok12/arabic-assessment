import { describe, it, expect } from 'vitest';
import { isOutdatedEditorSave, editorVersionHeaders, STORY_EDITOR_HEADER } from './story-editor-version.js';

const h = (obj) => new Headers(obj);

describe('story-editor-version', () => {
  it('حفظ محتوى من محرر قديم (بلا النسخة) يُرفض', () => {
    expect(isOutdatedEditorSave(h({}), { content: '<p>1</p>', page_audio: [null] })).toBe(true);
    expect(isOutdatedEditorSave(h({ [STORY_EDITOR_HEADER]: '1' }), { content: '' })).toBe(true);
    // نسخة 2 كانت تحفظ أثناء رفع الصوت فتُسقطه
    expect(isOutdatedEditorSave(h({ [STORY_EDITOR_HEADER]: '2' }), { content: '<p>1</p>', page_audio: [null] })).toBe(true);
    expect(isOutdatedEditorSave(h({ [STORY_EDITOR_HEADER]: 'abc' }), { content: 'x' })).toBe(true);
  });

  it('المحرر الحالي يمرّ', () => {
    expect(isOutdatedEditorSave(h(editorVersionHeaders()), { content: '<p>1</p>' })).toBe(false);
  });

  it('تغيير الحالة أو أصوات اللوحة وحدها لا يُرفض أبداً', () => {
    expect(isOutdatedEditorSave(h({}), { status: 'published' })).toBe(false);
    expect(isOutdatedEditorSave(h({}), { page_audio: ['u', null] })).toBe(false);
    expect(isOutdatedEditorSave(h({}), null)).toBe(false);
  });
});
