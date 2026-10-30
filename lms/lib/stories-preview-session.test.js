import { describe, it, expect } from 'vitest';
import { emptyStoryPreview, normalizeStoryPreview, previewResumePage, proposedStoryWorld, STORY_WORLDS } from './stories-preview-session';
const stories = [{ id: 'a', title: 'راشد' }, { id: 'b', title: 'مريم والزهرة' }];
describe('حالة معاينة القصص المؤقتة', () => {
  it('تبدأ بلا قراءات أو مفضلة مفترضة ولا تقبل صيغة قديمة', () => { expect(normalizeStoryPreview(null, stories)).toEqual(emptyStoryPreview()); expect(normalizeStoryPreview({ version: 8, finished: ['a'] }, stories).finished).toEqual([]); });
  it('تفصل المفضلة والإكمال المؤقت عن موضع القراءة وتزيل القصص المحذوفة', () => {
    const value = normalizeStoryPreview({ version: 1, favorites: ['a', 'a', 'x'], finished: ['b', 'x'], bookmarks: { a: { page: 1, total: 3, version: 'v1', at: 1 }, x: { page: 0, total: 3, version: 'v1' } } }, stories);
    expect(value.favorites).toEqual(['a']); expect(value.finished).toEqual(['b']); expect(Object.keys(value.bookmarks)).toEqual(['a']);
  });
  it('لا تقبل مواضع خارج حدود الصفحات أو أطوالًا غير سليمة', () => {
    for (const b of [{ page: -1, total: 3 }, { page: 3, total: 3 }, { page: 0.5, total: 3 }, { page: 0, total: 301 }]) expect(normalizeStoryPreview({ version: 1, bookmarks: { a: { ...b, version: 'v' } } }, stories).bookmarks).toEqual({});
  });
  it('تحصر التصنيف والنصوص في الصيغة المعتمدة', () => {
    const value = normalizeStoryPreview({ version: 1, notes: { a: { blurb: 'ا'.repeat(400), world: 'family' }, b: { blurb: 'غير صالح', world: 'invented' } }, reflections: { a: 'ب'.repeat(300) } }, stories);
    expect(value.notes.a.blurb).toHaveLength(240); expect(value.notes.b).toBeUndefined(); expect(value.reflections.a).toHaveLength(160);
  });
  it('تستأنف النسخة نفسها فقط ولا تفتح صفحة قديمة بعد تعديل المحتوى', () => {
    expect(previewResumePage({ page: 2, version: 'one' }, 'one', 3)).toBe(2);
    expect(previewResumePage({ page: 2, version: 'one' }, 'two', 3)).toBe(0);
    expect(previewResumePage({ page: 2, version: 'one' }, 'one', 2)).toBe(0);
  });
  it('التصنيفات مقترحات قابلة للتعديل وكل قيمة لها تعريف', () => { for (const story of [...stories, { title: 'فَهِيم' }, { title: 'حكاية جديدة' }]) expect(STORY_WORLDS.some(w => w.id === proposedStoryWorld(story))).toBe(true); });
});
