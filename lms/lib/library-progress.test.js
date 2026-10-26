import { describe, expect, it } from 'vitest';
import { freshDiscover } from './discover-objects';
import { discoverLibraryProgress, finiteProgress, huroofLibraryProgress, libraryOverview, practiceProgress, puzzleLibraryProgress } from './library-progress';

describe('دقة الإنجاز في المكتبة', () => {
  it('لغز واحد لا يكمل التدريب، وإعادة الحل لا تضاعف التقدّم', () => {
    const c = freshDiscover();
    expect(discoverLibraryProgress(c, []).status).toBe('not-started');
    const p = discoverLibraryProgress(c, ['garden-ball', 'garden-ball', 'removed']);
    expect(p).toMatchObject({ status: 'in-progress', completed: 1, total: 48, percent: 2, scenesCompleted: 0, scenesTotal: 10 });
  });
  it('المشهد الأول كاملًا يساوي مشهدًا واحدًا؛ كل الألغاز وحدها تكمل التدريب', () => {
    const c = freshDiscover();
    expect(discoverLibraryProgress(c, c.scenes[0].rounds.map(r => r.id))).toMatchObject({ status: 'in-progress', completed: 3, scenesCompleted: 1 });
    expect(discoverLibraryProgress(c, c.scenes.flatMap(s => s.rounds.map(r => r.id)))).toMatchObject({ status: 'completed', completed: 48, percent: 100 });
  });
  it('تعديلات المعلم تغيّر المقام دون محو الإنجازات؛ المعطل والمحذوف لا يعرقلان', () => {
    const c = freshDiscover(), ids = c.scenes.flatMap(s => s.rounds.map(r => r.id));
    c.scenes[0].rounds[0].enabled = false; c.scenes[1].enabled = false;
    expect(discoverLibraryProgress(c, ids)).toMatchObject({ status: 'completed', completed: 42, total: 42, scenesTotal: 9 });
    c.scenes[0].rounds.push({ ...c.scenes[0].rounds[1], id: 'teacher-new' });
    expect(discoverLibraryProgress(c, ids)).toMatchObject({ status: 'in-progress', completed: 42, total: 43 });
    c.enabled = false; expect(discoverLibraryProgress(c, ids).status).toBe('unavailable');
    c.enabled = true; c.scenes = []; expect(discoverLibraryProgress(c, ids).status).toBe('unavailable');
  });
  it('الحروف تُحسب مرة واحدة في الجولة الحالية، والاستكشاف ليس شهادة إكمال', () => {
    const letters = Array.from({ length: 28 }, (_, idx) => ({ idx }));
    expect(huroofLibraryProgress([{ idx: 0 }, { idx: 0 }, { idx: 99 }], 28, 'challenge')).toMatchObject({ completed: 1, total: 28, status: 'in-progress' });
    expect(huroofLibraryProgress(letters, 28, 'challenge').status).toBe('completed');
    expect(huroofLibraryProgress(letters, 28, 'explore').status).toBe('practiced');
    expect(huroofLibraryProgress([], 28, 'challenge').status).toBe('not-started');
  });
  it('فتح صفحة الأحجية لا يعني البدء؛ صفوف مكررة أو صور مخفية لا تضخّم العدد', () => {
    const puzzles = [{ id: 'a' }, { id: 'b' }];
    expect(puzzleLibraryProgress(puzzles, [{ puzzle_id: 'a', unlocked: [] }]).status).toBe('not-started');
    expect(puzzleLibraryProgress(puzzles, [{ puzzle_id: 'a', unlocked: [0] }]).status).toBe('in-progress');
    expect(puzzleLibraryProgress(puzzles, ['a', 'a', 'hidden'].map(puzzle_id => ({ puzzle_id, completed_at: 'now' })))).toMatchObject({ completed: 1, total: 2 });
    expect(puzzleLibraryProgress(puzzles, ['a', 'b'].map(puzzle_id => ({ puzzle_id, completed_at: 'now' })))).toMatchObject({ completed: 2, status: 'completed' });
    expect(puzzleLibraryProgress([], []).status).toBe('unavailable');
  });
  it('التدريب المتجدد لا يحمل إكمالًا زائفًا، والنسب لا تبلغ 100 قبل النهاية', () => {
    expect(practiceProgress(true)).toMatchObject({ status: 'practiced' });
    expect(practiceProgress(false).status).toBe('not-started');
    expect(finiteProgress(999, 1000, 'عنصر').percent).toBe(99);
  });
  it('المتابعة تفضّل التدريب غير المكتمل، دون القفز بعد آخر لعبة لعبها الطالب', () => {
    const resources = ['a', 'b', 'c', 'd', 'e'].map(key => ({ key, ready: key !== 'e' }));
    const p = { a: { status: 'completed' }, b: { status: 'in-progress' }, c: { status: 'not-started' }, d: { status: 'practiced' }, e: { status: 'completed' } };
    expect(libraryOverview(resources, p)).toMatchObject({ completed: 1, continuing: 1, practiced: 1, next: { key: 'b' } });
    expect(libraryOverview(resources, {}).next).toBeUndefined();
    p.b.status = 'unknown'; expect(libraryOverview(resources, p).next.key).toBe('c');
  });
});
