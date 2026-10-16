import { describe, it, expect } from 'vitest';
import {
  storyDraftKey, draftSnapshot, readStoryDraft, writeStoryDraft, clearStoryDraft, draftDiffers,
  STORY_DRAFT_MAX_AGE_MS,
} from './story-draft.js';

function memStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    size: () => m.size,
  };
}

const FORM = { title: 'فهيم', content: '<p>1</p>\n<!-- PAGE -->\n<p>2</p>', status: 'draft' };

describe('story-draft', () => {
  it('مفتاح لكل قصة، و«new» للقصة الجديدة', () => {
    expect(storyDraftKey('abc')).toBe('aarem-story-draft:abc');
    expect(storyDraftKey(null)).toBe('aarem-story-draft:new');
  });

  it('حفظ ثم قراءة تُرجع نفس التعديلات', () => {
    const s = memStorage();
    expect(writeStoryDraft(s, 'abc', FORM, ['u1', null], 1000)).toBe(true);
    const d = readStoryDraft(s, 'abc', 2000);
    expect(d.form).toEqual(FORM);
    expect(d.pageAudio).toEqual(['u1', null]);
    expect(d.savedAt).toBe(1000);
  });

  it('المسح بعد الحفظ الناجح', () => {
    const s = memStorage();
    writeStoryDraft(s, 'abc', FORM, []);
    clearStoryDraft(s, 'abc');
    expect(readStoryDraft(s, 'abc')).toBeNull();
  });

  it('نسخة أقدم من 30 يوماً تُحذف ولا تُعرض', () => {
    const s = memStorage();
    writeStoryDraft(s, 'abc', FORM, [], 0);
    expect(readStoryDraft(s, 'abc', STORY_DRAFT_MAX_AGE_MS + 1)).toBeNull();
    expect(s.size()).toBe(0);
  });

  it('بيانات تالفة أو تخزين محجوب لا يكسر المحرر', () => {
    const s = memStorage();
    s.setItem(storyDraftKey('abc'), '{not json');
    expect(readStoryDraft(s, 'abc')).toBeNull();
    expect(readStoryDraft(null, 'abc')).toBeNull();
    const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); }, removeItem: () => {} };
    expect(writeStoryDraft(full, 'abc', FORM, [])).toBe(false);
  });

  it('يُعرض الاسترجاع فقط إن اختلفت النسخة المحلية عن المحفوظة', () => {
    const s = memStorage();
    writeStoryDraft(s, 'abc', FORM, [null, null]);
    const d = readStoryDraft(s, 'abc');
    expect(draftDiffers(d, FORM, [null, null])).toBe(false);
    expect(draftDiffers(d, { ...FORM, content: '<p>1</p>' }, [null])).toBe(true);
    expect(draftDiffers(null, FORM, [])).toBe(false);
    expect(draftSnapshot(FORM, undefined)).toBe(draftSnapshot(FORM, []));
  });
});
