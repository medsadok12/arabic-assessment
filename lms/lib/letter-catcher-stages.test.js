import { describe, expect, it } from 'vitest';
import { LC_STAGE_SIZE_CHOICES, isLcStageUnlocked, isLcStagedCategoryUnlocked, lcStageDone, lcStagesForCategory } from './letter-catcher-stages';

const rows = (category, count) => Array.from({ length: count }, (_, index) => ({
  id: `word-${String(index).padStart(2, '0')}`, word: 'كِتابٌ', missing_letter: 'ك', category,
}));
const complete = stages => Object.fromEntries(stages.map(stage => [stage.id, {
  complete: true, category: stage.category, wordIds: [...stage.wordIds],
}]));

describe('Letter Catcher sequential stages', () => {
  it('covers the whole live category once, retaining the final short stage', () => {
    const words = rows('الحيوانات', 31);
    const stages = lcStagesForCategory([...words].reverse(), 'الحيوانات');
    expect(LC_STAGE_SIZE_CHOICES).toEqual([5, 10, 15]);
    expect(stages.map(stage => stage.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(stages.map(stage => stage.total)).toEqual([5, 5, 5, 5, 5, 5, 1]);
    expect(stages.flatMap(stage => stage.wordIds)).toEqual(words.map(word => word.id));
    expect(new Set(stages.flatMap(stage => stage.wordIds)).size).toBe(31);
    expect(lcStagesForCategory(words, 'الحيوانات', 10).map(stage => stage.total)).toEqual([10, 10, 10, 1]);
    expect(lcStagesForCategory(words, 'الحيوانات', 15).map(stage => stage.total)).toEqual([15, 15, 1]);
  });

  it('canonicalizes renamed and moved words without changing input or including other categories', () => {
    const words = [
      { id: 'school-2', word: 'تِلْميذٌ', category: 'المهن' },
      { id: 'school-1', word: 'قَلَمٌ', category: 'أدوات' },
      { id: 'teacher', word: 'مُعَلِّمٌ', category: 'المهن' },
    ];
    const before = structuredClone(words);
    expect(lcStagesForCategory(words, 'أدوات')[0]).toMatchObject({
      category: 'المدرسة', wordIds: ['school-1', 'school-2'], total: 2,
    });
    expect(words).toEqual(before);
    expect(lcStagesForCategory(words, '__all__')).toEqual([]);
    expect(lcStagesForCategory(words, 'غير موجود')).toEqual([]);
    expect(lcStagesForCategory([], 'الحيوانات')).toEqual([]);
  });

  it('keeps 0–9 in numeric order regardless of IDs or source ordering', () => {
    const labels = ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const words = labels.map((word, index) => ({ id: `number-${9 - index}`, word, category: 'الأرقام' })).reverse();
    expect(lcStagesForCategory(words, 'الأعداد').flatMap(stage => stage.words.map(word => word.word))).toEqual(labels);
  });

  it('deduplicates IDs and keeps stable stage identities across reloads and media edits', () => {
    const words = rows('الحيوانات', 12);
    const original = lcStagesForCategory(words, 'الحيوانات');
    const reloaded = lcStagesForCategory([...words, words[1]].reverse().map(word => ({ ...word, image_url: '/teacher-new.webp' })), 'الحيوانات');
    expect(reloaded.map(stage => stage.id)).toEqual(original.map(stage => stage.id));
    const changed = lcStagesForCategory([...words.slice(0, 11), { ...words[11], id: 'word-12' }], 'الحيوانات');
    expect(changed[0].id).toBe(original[0].id);
    expect(changed[1].id).toBe(original[1].id);
    expect(changed[2].id).not.toBe(original[2].id);
    expect(lcStagesForCategory(rows('الفواكه', 12), 'الفواكه')[0].id).not.toBe(original[0].id);
    expect(lcStagesForCategory(words, 'الحيوانات', 0)).toEqual(original);
  });

  it('requires verified completion and the exact ordered word IDs', () => {
    const [stage] = lcStagesForCategory(rows('الحيوانات', 5), 'الحيوانات');
    expect(lcStageDone(stage)).toBe(false);
    expect(lcStageDone(stage, complete([stage]))).toBe(true);
    expect(lcStageDone(stage, { [stage.id]: { complete: false, wordIds: stage.wordIds } })).toBe(false);
    expect(lcStageDone(stage, { [stage.id]: { complete: true, wordIds: [...stage.wordIds].reverse() } })).toBe(false);
    expect(lcStageDone(stage, { [stage.id]: { complete: true, wordIds: stage.wordIds.slice(1) } })).toBe(false);
    expect(lcStageDone(stage, { [stage.id]: { complete: true } })).toBe(false);
    expect(lcStageDone(null, complete([stage]))).toBe(false);
  });

  it('opens only the first stage and stages with every predecessor complete', () => {
    const stages = lcStagesForCategory(rows('الحيوانات', 16), 'الحيوانات');
    expect(stages.map(stage => isLcStageUnlocked(stage, stages))).toEqual([true, false, false, false]);
    expect(stages.map(stage => isLcStageUnlocked(stage, stages, complete(stages.slice(0, 2))))).toEqual([true, true, true, false]);
    expect(isLcStageUnlocked(stages[3], stages, complete([stages[0], stages[2]]))).toBe(false);
    expect(isLcStageUnlocked({ id: 'missing' }, stages, complete(stages))).toBe(false);
  });
});

describe('Letter Catcher staged world access', () => {
  const categories = ['الحيوانات', 'الجوّ والفصول', 'الرياضة والألعاب'];
  const words = categories.flatMap(category => rows(category, 6).map(word => ({ ...word, id: `${category}:${word.id}` })));
  const animalStages = lcStagesForCategory(words, categories[0]);
  const unlocked = (category, progress, reports) => isLcStagedCategoryUnlocked(category, categories, words, 5, progress, reports);

  it('requires every current stage of the previous world', () => {
    expect(unlocked(categories[0], {}, {})).toBe(true);
    expect(unlocked(categories[1], {}, {})).toBe(false);
    const first = complete(animalStages.slice(0, 1));
    const reports = { [categories[0]]: { correct: 5, wrong: 0, total: 5 } };
    expect(unlocked(categories[1], first, reports)).toBe(false);
    expect(unlocked(categories[1], complete(animalStages), reports)).toBe(true);
    expect(unlocked(categories[2], complete(animalStages), reports)).toBe(false);
  });

  it('does not reuse a stage report after the word partition changes', () => {
    const progress = complete(animalStages);
    const reports = { [categories[0]]: { correct: 1, total: 1 } };
    const changed = [...words, { id: 'new-animal', word: 'أَسَدٌ', category: categories[0] }];
    expect(isLcStagedCategoryUnlocked(categories[1], categories, changed, 5, progress, reports)).toBe(false);
  });

  it('retains historical access across enrollment and direct saved world reports', () => {
    const reports = { [categories[0]]: { correct: 1, total: 20 } };
    expect(unlocked(categories[1], {}, reports)).toBe(true);
    const enrollment = { [animalStages[0].id]: { complete: false, wordIds: animalStages[0].wordIds, category: categories[0] } };
    expect(unlocked(categories[1], enrollment, reports)).toBe(false);
    enrollment[animalStages[0].id].legacyAccess = true;
    expect(unlocked(categories[1], enrollment, reports)).toBe(true);
    expect(unlocked(categories[2], {}, { [categories[2]]: { correct: 2, total: 5 } })).toBe(true);
  });
});
