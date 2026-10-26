import { describe, it, expect } from 'vitest';
import { freshDiscover, validateDiscover, playableDiscover, checkDiscoverAnswer, cleanWord, validDiscoverUrl } from './discover-objects';

describe('أكتشف الأشياء — محتوى قابل للتحرير دون كسر اللعب', () => {
  it('المحتوى صالح وفيه عشرة مشاهد و48 لغزًا، والحديقة الأصلية محفوظة', () => {
    const config = freshDiscover();
    expect(validateDiscover(config).error).toBeUndefined();
    expect(config.scenes).toHaveLength(10);
    expect(playableDiscover(config)).toHaveLength(48);
    expect(config.scenes[0].rounds).toHaveLength(3);
    expect(config.scenes[0].objects).toHaveLength(5);
  });
  it('الحذف والتعطيل مقصودان ولا يُعاد إدخال المثال تلقائيًا', () => {
    const c = freshDiscover(); c.scenes = [];
    expect(validateDiscover(c).config.scenes).toEqual([]);
    c.scenes = freshDiscover().scenes; c.scenes.forEach(s => { s.enabled = false; });
    expect(playableDiscover(c)).toEqual([]);
  });
  it('منع تكرار المعرفات وتعلّق لغز بشيء محذوف', () => {
    const c = freshDiscover(); c.scenes[0].rounds[1].id = c.scenes[0].rounds[0].id;
    expect(validateDiscover(c).error).toBeTruthy();
    c.scenes[0].rounds.pop(); c.scenes[0].objects = [];
    expect(validateDiscover(c).error).toBeTruthy();
  });
  it('لا حفظ لصورة ناقصة أو عنصر خارج المشهد أو كلمة غير عربية', () => {
    for (const mutate of [c => { c.scenes[0].objects[0].art = 'image'; }, c => { c.scenes[0].objects[0].x = 0; }, c => { c.scenes[0].rounds[0].word = 'ball'; }, c => { c.pointsPerRound = 999; }]) {
      const c = freshDiscover(); mutate(c); expect(validateDiscover(c).error).toBeTruthy();
    }
  });
  it('لا بيانات صور ضخمة ولا بروتوكولات تنفيذية أو روابط خارجية غير آمنة', () => {
    for (const value of ['javascript:alert(1)', 'data:image/png;base64,abc', '//bad.test/a', 'http://bad.test/a', '/../../x', 'https://user:password@x.test/a']) expect(validDiscoverUrl(value)).toBe(false);
    for (const value of ['', '/faheem.png', 'https://x.test/image.webp']) expect(validDiscoverUrl(value)).toBe(true);
  });
  it('الجملة الصحيحة إلزامية ولا جمل مكررة', () => {
    const c = freshDiscover(); c.scenes[0].rounds[0].correct = 12; expect(validateDiscover(c).error).toBeTruthy();
    c.scenes[0].rounds[0].correct = 0; c.scenes[0].rounds[0].sentences[1] = c.scenes[0].rounds[0].sentences[0]; expect(validateDiscover(c).error).toBeTruthy();
  });
  it('التشكيل لا يغيّر الإجابة، والهمزات والحروف لا تُدمج خطأً', () => {
    expect(cleanWord('كُرَة')).toBe('كرة'); expect(cleanWord('أَسَد')).not.toBe(cleanWord('اسد'));
    const c = freshDiscover();
    expect(checkDiscoverAnswer(c, { roundId: 'garden-ball', found: 'ball', word: 'كُرَة', sentence: 0 })).toBe(true);
    for (const patch of [{ found: 'book' }, { word: 'كرت' }, { sentence: 1 }, { roundId: 'unknown' }]) expect(checkDiscoverAnswer(c, { roundId: 'garden-ball', found: 'ball', word: 'كرة', sentence: 0, ...patch })).toBe(false);
  });
  it('تدعم الأسماء المركبة والمرحلتين الاختياريتين والتعطيل', () => {
    const c = freshDiscover(); c.scenes[0].rounds[0].word = 'كُرَةُ قَدَمٍ';
    expect(validateDiscover(c).error).toBeUndefined();
    expect(checkDiscoverAnswer(c, { roundId: 'garden-ball', found: 'ball', word: 'كرةقدم', sentence: 0 })).toBe(true);
    c.build = false; c.read = false;
    expect(checkDiscoverAnswer(c, { roundId: 'garden-ball', found: 'ball' })).toBe(true);
    c.scenes[0].rounds[0].enabled = false;
    expect(checkDiscoverAnswer(c, { roundId: 'garden-ball', found: 'ball' })).toBe(false);
  });
});
