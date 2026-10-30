import { describe, it, expect } from 'vitest';
import { pickRotation, markSeen, letterCount, roundSize, normalizeLcSettings, validateLcSettings } from './letter-catcher';

const ids = (n) => Array.from({ length: n }, (_, i) => `w${i}`);

describe('pickRotation', () => {
  it('يمرّ على كل كلمات المجموعة قبل أن يكرر أي كلمة', () => {
    const all = ids(31);
    let seen = [];
    const shown = [];
    for (let round = 0; round < 3; round++) {
      const r = pickRotation(all, seen, 10);
      expect(r.picked).toHaveLength(10);
      expect(new Set(r.picked).size).toBe(10);
      shown.push(...r.picked);
      seen = r.seen;
    }
    expect(new Set(shown).size).toBe(30); // 3 جولات × 10 بلا أي تكرار
  });

  it('الجولة التي تكمل الدورة تأخذ الباقي أولاً ثم تبدأ دورة جديدة بلا تكرار داخلها', () => {
    const all = ids(31);
    const seen = all.slice(0, 30);
    const r = pickRotation(all, seen, 10);
    expect(r.picked[0]).toBe('w30');
    expect(new Set(r.picked).size).toBe(10);
    expect(r.seen).toHaveLength(9);          // ذاكرة الدورة الجديدة فقط
    expect(r.seen).not.toContain('w30');
  });

  it('اكتمال الدورة بالضبط يصفّر الذاكرة', () => {
    const all = ids(20);
    const r = pickRotation(all, all.slice(0, 10), 10);
    expect(new Set([...all.slice(0, 10), ...r.picked]).size).toBe(20);
    expect(r.seen).toEqual([]);
  });

  it('جولة بكل الكلمات أو أكثر تعرضها كلها مرة واحدة', () => {
    const r = pickRotation(ids(9), ['w1'], 20);
    expect(r.picked).toHaveLength(9);
    expect(r.seen).toEqual([]);
  });

  it('يتجاهل الكلمات المحذوفة من الذاكرة القديمة', () => {
    const r = pickRotation(['a', 'b', 'c', 'd'], ['zzz', 'a', 'b'], 2);
    expect(r.picked.sort()).toEqual(['c', 'd']);
  });
});

describe('markSeen', () => {
  it('تسجّل ما أجاب عنه الطفل فقط، وكلمات لم يصلها تبقى للجولة القادمة', () => {
    const all = ids(31);
    let seen = [];
    const round = pickRotation(all, seen, 10).picked;
    round.slice(0, 3).forEach(id => { seen = markSeen(all, seen, id); }); // خرج بعد 3 كلمات
    expect(seen).toHaveLength(3);
    const next = pickRotation(all, seen, 10).picked;
    expect(next.some(id => round.slice(0, 3).includes(id))).toBe(false);
  });
  it('اكتمال الدورة بالإجابة يصفّر الذاكرة، والدورة الجديدة تبدأ بما يليها', () => {
    const all = ids(31);
    const r = pickRotation(all, all.slice(0, 30), 10);
    let seen = all.slice(0, 30);
    r.picked.forEach(id => { seen = markSeen(all, seen, id); });
    expect(seen.sort()).toEqual([...r.seen].sort());
  });
});

describe('letterCount', () => {
  it('لا يحسب المسافة ولا التشكيل', () => {
    expect(letterCount('حمار وح_ي')).toBe(8);
    expect(letterCount('الشّريط اللّا_ق')).toBe(12);
    expect(letterCount('قِطَّة')).toBe(3);
  });
});

describe('settings', () => {
  it('roundSize: صفر يعني كل كلمات المجموعة', () => {
    expect(roundSize(31, 0)).toBe(31);
    expect(roundSize(31, 10)).toBe(10);
    expect(roundSize(4, 10)).toBe(4);
  });
  it('normalize يعيد القيم غير المعروفة للافتراضي، وvalidate يرفضها', () => {
    expect(normalizeLcSettings({ words_per_round: 7, options_count: 9 })).toEqual({ words_per_round: 20, options_count: 5 });
    expect(normalizeLcSettings({ words_per_round: 0, options_count: 3 })).toEqual({ words_per_round: 0, options_count: 3 });
    expect(validateLcSettings({ words_per_round: 7, options_count: 4 })).toBeNull();
    expect(validateLcSettings({ words_per_round: '15', options_count: '4' })).toEqual({ words_per_round: 15, options_count: 4 });
  });
});
