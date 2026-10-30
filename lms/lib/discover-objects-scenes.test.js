import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DISCOVER, freshDiscover, validateDiscover, checkDiscoverAnswer, playableDiscover } from './discover-objects';
import { DISCOVER_NEW_SCENES, DISCOVER_SCENE_PACK, addDiscoverScenePack } from './discover-objects-scenes';
const copy = value => JSON.parse(JSON.stringify(value));

describe('مشاهد أكتشف الأشياء — إضافة آمنة للمحتوى المحفوظ', () => {
  it('يضيف تسعة مشاهد للحديقة دون تعديل النصوص والصور والأصوات والمكافآت المخصّصة', () => {
    const old = copy(DEFAULT_DISCOVER);
    old.title = 'عنواني'; old.sounds.background = 'clouds'; old.enabled = false;
    old.scenes[0].title = 'حديقتي الخاصة'; old.scenes[0].objects[0].image = '/my-photo.png';
    old.scenes[0].rounds[0].wordAudio = '/my-word.mp3'; old.scenes[0].rounds[0].audio = '/my-clue.mp3';
    old.scenes[0].rounds[0].clue = 'لغز كتبه المعلم'; old.scenes[0].enabled = false;
    const before = copy(old), next = addDiscoverScenePack(old);
    expect(next.scenes).toHaveLength(10); expect(next.scenes[0]).toEqual(before.scenes[0]);
    expect(next.title).toBe(before.title); expect(next.sounds).toEqual(before.sounds); expect(next.enabled).toBe(false);
    expect(old).toEqual(before); expect(next.scenePacks).toContain(DISCOVER_SCENE_PACK);
  });
  it('لا تكرار عند إعادة التحميل ولا عودة لمشهد حذفه المعلم بعد إضافة الحزمة', () => {
    const first = freshDiscover(); expect(addDiscoverScenePack(first)).toBe(first);
    first.scenes = first.scenes.filter(s => s.id !== 'kitchen');
    const saved = validateDiscover(first).config;
    expect(saved.scenePacks).toContain(DISCOVER_SCENE_PACK);
    expect(addDiscoverScenePack(saved).scenes.some(s => s.id === 'kitchen')).toBe(false);
  });
  it('يحافظ على ترتيب ومحتوى المشاهد الخاصة ويتجنب تصادم المعرفات', () => {
    const old = copy(DEFAULT_DISCOVER), custom = copy(DISCOVER_NEW_SCENES[1]);
    custom.title = 'مطبخ المعلم'; custom.rounds[0].wordAudio = '/recording.mp3';
    old.scenes.unshift(custom);
    const result = addDiscoverScenePack(old);
    expect(result.scenes[0]).toEqual(custom); expect(result.scenes[1]).toEqual(old.scenes[1]);
    expect(result.scenes.filter(s => s.id === 'kitchen')).toHaveLength(1);
    expect(validateDiscover(result).error).toBeUndefined();
  });
  it('لا يتجاوز حد 20 مشهدًا، ولا يعيد ملء تدريب أفرغه المعلم عمدًا', () => {
    const old = copy(DEFAULT_DISCOVER);
    old.scenes = Array.from({ length: 19 }, (_, i) => ({ ...copy(old.scenes[0]), id: `custom-${i}`, rounds: old.scenes[0].rounds.map(r => ({ ...r, id: `custom-${i}-${r.id}` })) }));
    const next = addDiscoverScenePack(old); expect(next.scenes).toHaveLength(20); expect(next.scenes.slice(0, 19)).toEqual(old.scenes);
    old.scenes = []; expect(addDiscoverScenePack(old).scenes).toEqual([]);
  });
  it('كل لغز يشير لشيء موجود، وإجابته وجمله صالحة على الخادم', () => {
    const config = freshDiscover(), ids = new Set();
    for (const { scene, round } of playableDiscover(config)) {
      expect(scene.objects.some(o => o.id === round.target)).toBe(true);
      expect(ids.has(round.id)).toBe(false); ids.add(round.id);
      expect(checkDiscoverAnswer(config, { roundId: round.id, found: round.target, word: round.word, sentence: round.correct })).toBe(true);
      expect(checkDiscoverAnswer(config, { roundId: round.id, found: round.target, word: round.word, sentence: (round.correct + 1) % 3 })).toBe(false);
    }
    expect(ids.size).toBe(48);
  });
  it('54 رسمة محلية موجودة: 9 خلفيات و45 شيئًا، بلا سكربتات أو مصادر خارجية', () => {
    const urls = new Set(DISCOVER_NEW_SCENES.flatMap(s => [s.background, ...s.objects.map(o => o.image)]));
    expect(urls.size).toBe(54);
    for (const url of urls) {
      const path = fileURLToPath(new URL(`../public${url}`, import.meta.url));
      expect(existsSync(path), url).toBe(true);
      const svg = readFileSync(path, 'utf8');
      expect(svg).toContain('<svg'); expect(svg).toContain('viewBox=');
      expect(svg).not.toMatch(/<script|<foreignObject|(?:href|src)\s*=|onload=/i);
    }
  });
});
