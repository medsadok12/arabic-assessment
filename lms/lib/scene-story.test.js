import { describe, it, expect } from 'vitest';
import {
  countWords, goldUsed, wordNoun, bandForGrade, effectiveBand, sceneVisibleTo, sanitizeSceneInput,
  sanitizeResponseInput, sanitizeReview, reviewStars, reviewPoints, isStudentMediaPath, plainArabic,
} from './scene-story';

const SID = 'f4db077e-8016-4abc-94b7-1f53e8b040b6';
const SCENE = { id: '11111111-2222-4333-8444-555555555555', modes: ['write', 'speak', 'photo'], words: [{ w: 'الرِّيحُ', gold: false }, { w: 'فَرِحَ', gold: true }] };
const okMedia = (u) => typeof u === 'string' && u.startsWith('https://x.supabase.co/storage/v1/object/public/media/scenes/');

describe('الكلمات', () => {
  it('عدد الكلمات العربية', () => expect(countWords('في يومٍ مشمسٍ صعدَ فهيم إلى التلّة.')).toBe(7));
  it('تمييز العدد', () => expect([1, 4, 10, 15, 40].map(wordNoun)).toEqual(['كلمة', 'كلمات', 'كلمات', 'كلمة', 'كلمة']));
  it('الذهبية تُحتسب بلا تشكيل', () => {
    expect(goldUsed('وفرح فهيم كثيراً', SCENE.words)).toBe(1);
    expect(goldUsed('هبّت الريح', SCENE.words)).toBe(0);
    expect(plainArabic('فَرِحَ')).toBe('فرح');
  });
});

describe('الفئة والظهور', () => {
  it('الفئة من الصف', () => {
    expect(bandForGrade(1)).toBe('1'); expect(bandForGrade(4)).toBe('2'); expect(bandForGrade(7)).toBe('3'); expect(bandForGrade(null)).toBe('2');
    expect(effectiveBand({ band: '3' }, 1)).toBe('3'); expect(effectiveBand({ band: 'auto' }, 1)).toBe('1');
  });
  const now = Date.parse('2026-10-20T10:00:00Z');
  const base = { is_active: true, publish_at: '2026-10-19T00:00:00Z', audience: 'all', band: 'auto', created_by: 't1' };
  it('مشهد للجميع ظاهر', () => expect(sceneVisibleTo(base, { now })).toBe(true));
  it('مخفي أو لم يحن موعده', () => {
    expect(sceneVisibleTo({ ...base, is_active: false }, { now })).toBe(false);
    expect(sceneVisibleTo({ ...base, publish_at: '2026-10-25T00:00:00Z' }, { now })).toBe(false);
  });
  it('مشهد المعلم لطلابه فقط', () => {
    expect(sceneVisibleTo({ ...base, audience: 'mine' }, { now, teacherIds: ['t2'] })).toBe(false);
    expect(sceneVisibleTo({ ...base, audience: 'mine' }, { now, teacherIds: ['t1'] })).toBe(true);
  });
  it('فئة محددة لا تظهر لصف آخر، وتظهر إن جُهل الصف', () => {
    expect(sceneVisibleTo({ ...base, band: '1' }, { now, grade: 6 })).toBe(false);
    expect(sceneVisibleTo({ ...base, band: '1' }, { now, grade: 2 })).toBe(true);
    expect(sceneVisibleTo({ ...base, band: '1' }, { now, grade: null })).toBe(true);
  });
});

describe('sanitizeSceneInput', () => {
  const good = { title: ' يومٌ على التلّة ', image_url: 'https://x.supabase.co/storage/v1/object/public/media/scenes/image/1.webp', prompt: 'ماذا يحدث في الصورة؟', modes: ['write', 'photo'] };
  it('مشهد سليم', () => {
    const { data, error } = sanitizeSceneInput({ ...good, words: ['الريح', { w: 'فرح', gold: true }, 'الريح'], hotspots: [{ x: 40.123, y: 30, q: 'ما لونها؟' }, { x: 140, y: 2, q: 'خارج' }], band: '9', audience: 'mine' }, okMedia);
    expect(error).toBeUndefined();
    expect(data.title).toBe('يومٌ على التلّة');
    expect(data.words).toEqual([{ w: 'الريح', gold: false }, { w: 'فرح', gold: true }]);
    expect(data.hotspots).toEqual([{ x: 40.1, y: 30, q: 'ما لونها؟' }]);
    expect(data.band).toBe('auto');
    expect(data.audience).toBe('mine');
    expect(data.modes).toEqual(['write', 'photo']);
  });
  it('بلا سؤال مكتوب: مقبول ويُحفظ فارغاً، والتعديل الجزئي لا يلمسه', () => {
    const { prompt, ...noPrompt } = good;
    expect(sanitizeSceneInput(noPrompt, okMedia).data.prompt).toBe('');
    expect(sanitizeSceneInput({ title: 'جديد' }, okMedia, { partial: true }).data).toEqual({ title: 'جديد' });
  });
  it('صورة من خارج تخزيننا مرفوضة', () => expect(sanitizeSceneInput({ ...good, image_url: 'https://evil.com/a.png' }, okMedia).error).toMatch(/صورة/));
  it('بلا طريقة تعبير مرفوض', () => expect(sanitizeSceneInput({ ...good, modes: [] }, okMedia).error).toMatch(/طريقة/));
  it('تعديل جزئي (إخفاء فقط)', () => expect(sanitizeSceneInput({ is_active: false }, okMedia, { partial: true }).data).toEqual({ is_active: false }));
});

describe('sanitizeResponseInput', () => {
  const audio = `${SID}/${SCENE.id}/audio-1792500000000-abc123.webm`;
  it('نص + صوت + شعور', () => {
    const { data } = sanitizeResponseInput({ text: ' فرح فهيم بالطائرة ', audio_path: audio, feeling: 'happy', word_count: 999 }, SCENE, { studentId: SID });
    expect(data).toMatchObject({ text: 'فرح فهيم بالطائرة', audio_path: audio, photo_path: null, feeling: 'happy', word_count: 3, gold_used: 1 });
  });
  it('مسار ملف طالب آخر مرفوض', () => {
    const other = `00000000-0000-4000-8000-000000000000/${SCENE.id}/audio-1792500000000-abc123.webm`;
    expect(sanitizeResponseInput({ audio_path: other }, SCENE, { studentId: SID }).error).toBeTruthy();
    expect(isStudentMediaPath(`${SID}/${SCENE.id}/../x/audio-1-abc123.webm`, SID, SCENE.id, 'audio')).toBe(false);
  });
  it('طريقة غير مسموحة في المشهد تُرفض أو تُهمل', () => {
    const writeOnly = { ...SCENE, modes: ['write'] };
    expect(sanitizeResponseInput({ audio_path: audio, text: 'نص' }, writeOnly, { studentId: SID }).error).toBeTruthy();
    expect(sanitizeResponseInput({ text: 'نص' }, { ...SCENE, modes: ['photo'] }, { studentId: SID }).error).toMatch(/حكايتك/);
  });
  it('ردّ فارغ برسالة ودّية', () => expect(sanitizeResponseInput({}, SCENE, { studentId: SID }).error).toMatch(/🌟/));
});

describe('التقييم', () => {
  it('ثلاثة معايير وملصقات معروفة وتعليق', () => {
    const { review } = sanitizeReview({ idea: 3, words: 2.6, order: 9, stickers: ['brave', 'nope', 'brave'], comment: ' أحسنت ' });
    expect(review).toEqual({ idea: 3, words: 3, order: 3, stickers: ['brave'], comment: 'أحسنت' });
    expect(reviewStars(review)).toBe(9);
    expect(reviewPoints(review)).toBe(18);
  });
  it('معيار بلا نجوم مرفوض', () => expect(sanitizeReview({ idea: 3, words: 2 }).error).toMatch(/الترتيب/));
});
