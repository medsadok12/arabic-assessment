import { describe, it, expect } from 'vitest';
import {
  ITEMS, SLOTS, DEFAULT_LOOK, COLOR_KEYS, normalizeLook, looksEqual, priceOf, unpaidItems,
  parseBuyList, isValidPreview, itemKey, MAX_BUY, PREVIEW_MAX,
} from './hero-catalog';

describe('كتالوج استوديو الأبطال', () => {
  it('كل خانة فيها قطعة مجانية، والبطل الافتراضي مجاني بالكامل', () => {
    for (const slot of SLOTS) expect(ITEMS[slot].some(i => i.price === 0)).toBe(true);
    expect(unpaidItems(DEFAULT_LOOK, [])).toEqual([]);
  });

  it('المعرّفات فريدة داخل كل خانة والأسعار أعداد صحيحة غير سالبة', () => {
    for (const slot of SLOTS) {
      const ids = ITEMS[slot].map(i => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const it of ITEMS[slot]) expect(Number.isInteger(it.price) && it.price >= 0).toBe(true);
    }
  });

  it('priceOf يقرأ المفتاح slot:id ويرفض ما ليس في الكتالوج', () => {
    expect(priceOf('head:crown')).toBe(1000);
    expect(priceOf('top:tee')).toBe(0);
    expect(priceOf('head:ninja')).toBeUndefined();
    expect(priceOf('crown')).toBeUndefined();
    expect(priceOf('head:crown:x')).toBeUndefined();
    expect(priceOf(42)).toBeUndefined();
  });
});

describe('normalizeLook', () => {
  it('يكمل الناقص من الافتراضي ويُبقي الصالح', () => {
    const l = normalizeLook({ top: 'space', skin: 4, hair: 'hijab', hijabC: 2 });
    expect(l).toEqual({ ...DEFAULT_LOOK, top: 'space', skin: 4, hair: 'hijab', hijabC: 2 });
  });

  it('يرفض القيم الغريبة: ألوان خارج اللوحة، قطع مجهولة، أنواع خاطئة', () => {
    const l = normalizeLook({
      skin: 99, hairC: -1, topC: 1.5, shoeC: '2', hair: 'mohawk',
      head: '__proto__', pet: 'unicorn', back: { id: 'wings' }, extra: 'x',
    });
    expect(l).toEqual(DEFAULT_LOOK);
    expect('extra' in l).toBe(false);
  });

  it('يقبل null والمصفوفات والنصوص دون أن ينهار', () => {
    for (const bad of [null, undefined, 'look', [], 7]) expect(normalizeLook(bad)).toEqual(DEFAULT_LOOK);
  });

  it('كل لون صالح في كل لوحة يُقبل', () => {
    for (const [k, list] of Object.entries(COLOR_KEYS)) {
      expect(normalizeLook({ [k]: list.length - 1 })[k]).toBe(list.length - 1);
      expect(normalizeLook({ [k]: list.length })[k]).toBe(DEFAULT_LOOK[k]);
    }
  });

  it('looksEqual يقارن خانات المظهر فقط', () => {
    expect(looksEqual(DEFAULT_LOOK, { ...DEFAULT_LOOK, junk: 1 })).toBe(true);
    expect(looksEqual(DEFAULT_LOOK, { ...DEFAULT_LOOK, head: 'cap' })).toBe(false);
  });
});

describe('unpaidItems', () => {
  const look = { ...DEFAULT_LOOK, top: 'space', head: 'astro', back: 'wings', hand: 'none' };

  it('يعيد القطع الملبوسة غير المشتراة بمفاتيحها وأسعارها', () => {
    const up = unpaidItems(look, ['back:wings']);
    expect(up.map(x => x.key)).toEqual(['top:space', 'head:astro']);
    expect(up.reduce((s, x) => s + x.item.price, 0)).toBe(1700);
  });

  it('يقبل Set أو مصفوفة، والمشتريات القديمة لا تُحسب ملكية لقطعة جديدة', () => {
    expect(unpaidItems(look, new Set(['top:space', 'head:astro', 'back:wings']))).toEqual([]);
    expect(unpaidItems({ ...DEFAULT_LOOK, top: 'space' }, ['astronaut']).length).toBe(1);
  });
});

describe('parseBuyList', () => {
  it('يقبل مفاتيح مدفوعة ويزيل التكرار', () => {
    expect(parseBuyList(['head:cap', 'head:cap', 'pet:faheem'])).toEqual(['head:cap', 'pet:faheem']);
  });

  it('يرفض القائمة الفارغة والطويلة والمجهول والمجاني', () => {
    expect(parseBuyList([])).toBeNull();
    expect(parseBuyList('head:cap')).toBeNull();
    expect(parseBuyList(['head:cap', 'head:ninja'])).toBeNull();
    expect(parseBuyList(['top:tee'])).toBeNull();
    expect(parseBuyList(Array.from({ length: MAX_BUY + 1 }, () => 'head:cap'))).toBeNull();
  });

  it('itemKey يبني المفتاح نفسه الذي يقرؤه priceOf', () => {
    for (const slot of SLOTS) for (const it of ITEMS[slot]) expect(priceOf(itemKey(slot, it.id))).toBe(it.price);
  });
});

describe('isValidPreview', () => {
  it('يقبل صورة webp/png صغيرة فقط', () => {
    expect(isValidPreview('data:image/webp;base64,UklGRg==')).toBe(true);
    expect(isValidPreview('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isValidPreview('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isValidPreview('https://evil.example/x.png')).toBe(false);
    expect(isValidPreview('data:image/png;base64,abc<script>')).toBe(false);
    expect(isValidPreview(`data:image/png;base64,${'A'.repeat(PREVIEW_MAX)}`)).toBe(false);
    expect(isValidPreview(null)).toBe(false);
  });
});

describe('الشخصيات والقطع الخاصة', () => {
  it('كل شخصية لها لوحة ألوان وتحية وحركة خاصة، والمظهر يتحقق من لونها', async () => {
    const { CHARACTERS, charOf } = await import('./hero-catalog');
    for (const c of CHARACTERS) {
      expect(c.colors.length).toBeGreaterThan(0);
      expect(c.hello && c.special?.name && c.lines.length).toBeTruthy();
    }
    expect(normalizeLook({ char: 'cat', skin: 4 }).skin).toBe(4);
    expect(normalizeLook({ char: 'panda', skin: 3 }).skin).toBe(0);   // للباندا لون واحد
    expect(normalizeLook({ skin: 9 }).skin).toBe(DEFAULT_LOOK.skin);
    expect(charOf({ char: 'dragon' }).id).toBe('kid');
  });

  it('القطع الخاصة لا تُشترى ولا تُلبس بلا ملكية', async () => {
    const { isSpecial } = await import('./hero-catalog');
    for (const slot of SLOTS) for (const it of ITEMS[slot]) {
      if (!isSpecial(it)) continue;
      expect(parseBuyList([itemKey(slot, it.id)])).toBeNull();
      expect(unpaidItems({ ...DEFAULT_LOOK, [slot]: it.id }, []).map(x => x.key)).toContain(itemKey(slot, it.id));
      expect(unpaidItems({ ...DEFAULT_LOOK, [slot]: it.id }, [itemKey(slot, it.id)])).toEqual([]);
    }
  });
});

describe('الإنجازات والمواسم والتحدي والبيضة', async () => {
  const m = await import('./hero-catalog');

  it('الإنجازات تُحسب من سجل النقاط، والقطع المكتسبة تتبعها', () => {
    const stats = { p: { daily_login: { n: 7 }, letter_catcher: { sum: 250 }, fc: { n: 3 } }, letters: [0, 1, 2, 3, 4], earned: 1200 };
    expect(m.earnedAchievements(stats).sort()).toEqual(['catcher', 'letters5', 'loyal']);
    expect(m.earnedItemKeys(['loyal'])).toEqual(['head:laurel']);
    expect(m.earnedItemKeys(['lettersAll'])).toEqual(['hand:shield']);
    expect(m.earnedAchievements({ p: { huroof_all_complete: { n: 1 } } })).toContain('lettersAll');
    expect(m.earnedAchievements(null)).toEqual([]);
  });

  it('المستوى كل 1000 نجمة مكتسبة وحتى «أسطورة»', () => {
    expect([0, 999, 1000, 2500, 3999, 4000, 99999].map(m.levelOf)).toEqual([0, 0, 1, 2, 3, 4, 4]);
  });

  it('المواسم بتواريخها، والقطعة الموسمية لا تُشترى خارج موسمها', () => {
    expect(m.activeSeasons(new Date('2026-10-24T12:00:00Z'))).toEqual(['autumn']);
    expect(m.activeSeasons(new Date('2027-01-15T12:00:00Z'))).toEqual(['winter']);
    expect(m.activeSeasons(new Date('2027-02-20T12:00:00Z')).sort()).toEqual(['ramadan', 'winter']);
    expect(m.buyBlocked('aura:snow', new Date('2026-10-24T12:00:00Z'))).toBe('season');
    expect(m.buyBlocked('aura:leaves', new Date('2026-10-24T12:00:00Z'))).toBeNull();
    expect(m.buyBlocked('head:crown')).toBeNull();
  });

  it('تحدي الأسبوع يبدأ الاثنين ويتبدّل، وتقدّمه من نجوم الأسبوع فقط', () => {
    expect(m.weekStart(new Date('2026-10-24T09:00:00Z')).toISOString()).toBe('2026-10-19T00:00:00.000Z');
    expect(m.weekStart(new Date('2026-10-19T00:00:00Z')).toISOString()).toBe('2026-10-19T00:00:00.000Z');
    const a = m.weeklyOf(new Date('2026-10-24T09:00:00Z')), b = m.weeklyOf(new Date('2026-10-27T09:00:00Z'));
    expect(a.id).not.toBe(b.id);
    for (const w of m.WEEKLY) expect(m.priceOf(w.reward)).toBe(0);
    const w = m.WEEKLY.find(x => x.id === 'catcher');
    expect(m.weeklyProgress({ p: { letter_catcher: { sum: 500, ws: 35 } } }, w)).toBe(35);
    expect(m.weeklyProgress({ p: { letter_catcher: { ws: 90 } } }, w)).toBe(50);
  });

  it('البيضة تمتلئ بنجوم التعلّم بعد وضعها فقط، لا بتسجيل الدخول', () => {
    expect(m.eggProgress({ p: { letter_catcher: { es: 25 }, fc: { es: 6 }, daily_login: { es: 40 } } })).toBe(31);
    expect(m.eggProgress({ p: { letter_catcher: { es: 500 } } })).toBe(m.EGG_GOAL);
    expect(m.LEARN_PREFIXES).not.toContain('daily_login');
  });
});
