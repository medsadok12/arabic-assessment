import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { freshDiscover, validateDiscover } from './discover-objects';
import { discoverJourney, discoverSceneCover, DISCOVER_COVERS } from './discover-objects-journey';

describe('بطاقات المشاهد والمسار المتسلسل', () => {
  it('المشهد الأول وحده مفتوح في البداية، ولا يكفي إنهاء لغز واحد', () => {
    const c = freshDiscover();
    expect(discoverJourney(c).map(x => x.unlocked)).toEqual([true, false, false, false, false, false, false, false, false, false]);
    expect(discoverJourney(c, [c.scenes[0].rounds[0].id])[1].unlocked).toBe(false);
    expect(discoverJourney(c, c.scenes[0].rounds.map(r => r.id))[1].unlocked).toBe(true);
  });
  it('يتطلب جميع المشاهد السابقة ولا يقبل إنجاز مشهد متأخر لتجاوز الأول', () => {
    const c = freshDiscover();
    const later = c.scenes[1].rounds.map(r => r.id);
    expect(discoverJourney(c, later)[2].unlocked).toBe(false);
    const firstTwo = c.scenes.slice(0, 2).flatMap(s => s.rounds.map(r => r.id));
    expect(discoverJourney(c, firstTwo).slice(0, 4).map(x => x.unlocked)).toEqual([true, true, true, false]);
  });
  it('المشاهد والألغاز المعطلة لا تمنع المسار، وترتيب المعلم هو المعتمد', () => {
    const c = freshDiscover(); c.scenes[0].enabled = false; c.scenes[1].rounds[0].enabled = false;
    const done = c.scenes[1].rounds.filter(r => r.enabled).map(r => r.id);
    expect(discoverJourney(c, done).slice(0, 2)).toMatchObject([{ id: 'bedroom', unlocked: true, complete: true }, { id: 'kitchen', unlocked: true }]);
  });
  it('إعادة اللعب لا تمحو بيانات الإنجاز ولا تعيد قفل المشاهد المفتوحة', () => {
    const c = freshDiscover(), solved = c.scenes[0].rounds.map(r => r.id);
    const before = [...solved]; discoverJourney(c, solved); discoverJourney(c, solved);
    expect(solved).toEqual(before); expect(discoverJourney(c, solved)[1].unlocked).toBe(true);
  });
  it('معاينة المعلم ووضع الاستكشاف الحر يفتحان المشاهد دون تغيير بياناتها', () => {
    const c = freshDiscover(); expect(discoverJourney(c, [], true).every(s => s.unlocked)).toBe(true);
    c.sequentialScenes = false; expect(discoverJourney(c).every(s => s.unlocked)).toBe(true);
  });
  it('محتوى قديم بلا إعداد ترتيب يبقى صالحًا ويبدأ بالتسلسل', () => {
    const c = freshDiscover(); delete c.sequentialScenes;
    expect(validateDiscover(c).config.sequentialScenes).toBe(true);
    c.sequentialScenes = 'false'; expect(validateDiscover(c).error).toBeTruthy();
  });
  it('صور مصمّمة للمشاهد العشرة، وصورة المعلم تتقدم على الافتراضي', () => {
    expect(Object.keys(DISCOVER_COVERS)).toHaveLength(10);
    for (const scene of freshDiscover().scenes) {
      const image = discoverSceneCover(scene);
      expect(existsSync(fileURLToPath(new URL(`../public${image}`, import.meta.url))), image).toBe(true);
    }
    expect(discoverSceneCover({ ...freshDiscover().scenes[0], cover: '/custom.webp' })).toBe('/custom.webp');
    const c = freshDiscover(); c.scenes[0].cover = 'javascript:alert(1)'; expect(validateDiscover(c).error).toBeTruthy();
  });
});
