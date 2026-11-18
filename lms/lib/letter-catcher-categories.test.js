import { describe, expect, it } from 'vitest';
import {
  LC_CATEGORY_ORDER, LC_LEGACY_PLACES, canonicalLcWord, isLcCategoryUnlocked,
  lcCategoryAccessKeys, lcCategoryAliases, lcCategoryKey, lcCategoryMatchesWord,
  lcCategoryScene, lcNumberValue, lcUsesLegacySelection, normalizeLcCategory,
  normalizeLcCategoryMeta, normalizeLcCategoryResults, pickLcOrderedRound,
  sortLcCategories, sortLcCategoryWords,
} from './letter-catcher-categories';

const word = (text, category, id = text) => ({ id, word: text, missing_letter: 'ب', category, topic: category, image_url: '/keep.png', audio_url: '/keep.mp3' });

describe('Letter Catcher category identity and word boundaries', () => {
  it.each([
    ['الغلال', 'الفواكه', 'fruits'], ['أدوات', 'المدرسة', 'school'],
    ['الأرقام', 'الأعداد', 'numbers'], ['الفلاحة', 'المزرعة', 'farm'],
    ['الطقس', 'الجوّ والفصول', 'weather-seasons'], ['مهن', 'المهن', 'jobs'],
    ['الرّياضة والألعاب', 'الرياضة والألعاب', 'sports-games'],
    ['الملابس والزّينة', 'الملابس والزينة', 'clothes-accessories'],
  ])('keeps old title %s under the same identity as %s', (old, current, key) => {
    expect(normalizeLcCategory(old)).toBe(current);
    expect(lcCategoryKey(old)).toBe(key);
    expect(lcCategoryKey(current)).toBe(key);
    expect(lcCategoryAliases(current)).toContain(old);
  });

  it('keeps unknown teacher topics and the historical mixed report separate', () => {
    expect(normalizeLcCategory('  موضوع خاص  ')).toBe('موضوع خاص');
    expect(normalizeLcCategory(LC_LEGACY_PLACES)).toBe(LC_LEGACY_PLACES);
    expect(lcCategoryKey(LC_LEGACY_PLACES)).not.toBe(lcCategoryKey('أماكن من حولنا'));
    expect(lcCategoryAccessKeys('بلدان ومدن')).toContain(LC_LEGACY_PLACES);
    expect(lcCategoryAliases('بلدان ومدن')).not.toContain(LC_LEGACY_PLACES);
  });

  it('retains the previous world order while replacing the mixed card in place', () => {
    expect(sortLcCategories(['الأشكال', 'الأرقام', 'الفلاحة', 'الغلال', 'الحيوانات', 'أدوات', 'المدرسة'])).toEqual([
      'الحيوانات', 'المدرسة', 'الأعداد', 'الفواكه', 'المزرعة', 'الأشكال',
    ]);
    expect(LC_CATEGORY_ORDER.slice(11, 14)).toEqual(['أماكن من حولنا', 'بلدان ومدن', 'الطبيعة']);
    expect(new Set(LC_CATEGORY_ORDER).size).toBe(16);
  });

  it('classifies each mixed old row without changing IDs, words, pictures or recordings', () => {
    const rows = [word('مَكَّةُ الْمُكَرَّمَةُ', LC_LEGACY_PLACES), word('بَحْرٌ', LC_LEGACY_PLACES), word('مَدْرَسَةٌ', LC_LEGACY_PLACES)];
    expect(rows.map(canonicalLcWord).map(r => r.category)).toEqual(['بلدان ومدن', 'الطبيعة', 'أماكن من حولنا']);
    for (const row of rows) {
      const next = canonicalLcWord(row);
      expect(next).toMatchObject({ id: row.id, word: row.word, image_url: row.image_url, audio_url: row.audio_url });
      expect(row.category).toBe(LC_LEGACY_PLACES);
    }
    expect(canonicalLcWord(word('مِ_رُ', LC_LEGACY_PLACES)).category).toBe('أماكن من حولنا'); // not a guessed country without its actual missing letter
    expect(canonicalLcWord({ ...word('مِ_رُ', LC_LEGACY_PLACES), missing_letter: 'صْ' }).category).toBe('بلدان ومدن');
  });

  it('moves only actual misfits and preserves valid contextual membership', () => {
    expect(canonicalLcWord(word('تِلْمِيذٌ', 'المهن')).category).toBe('المدرسة');
    expect(canonicalLcWord(word('بُرْكَانٌ', 'الطقس')).category).toBe('الطبيعة');
    expect(canonicalLcWord(word('شَاطِئٌ', 'الطقس')).category).toBe('الطبيعة');
    expect(canonicalLcWord(word('رِيحٌ', 'الطقس')).category).toBe('الجوّ والفصول');
    expect(canonicalLcWord(word('وَاحَةُ نَخِيلٍ', 'الفلاحة')).category).toBe('المزرعة');
    expect(canonicalLcWord(word('مُعَلِّمٌ', 'المهن')).category).toBe('المهن');
  });

  it('preserves old cached selections without admitting unrelated new branch words', () => {
    const pupil = canonicalLcWord(word('تِلْمِيذٌ', 'المهن', 'b9e76e35-9365-4c84-aee1-cd690c95bb1d'));
    const volcano = canonicalLcWord(word('بُرْكَانٌ', 'الطقس', 'c9067b00-3b4e-4f20-8ba3-570776880968'));
    const sea = canonicalLcWord(word('بَحْرٌ', LC_LEGACY_PLACES));
    expect(lcUsesLegacySelection('المهن', [pupil.id])).toBe(true);
    expect(lcCategoryMatchesWord(pupil, 'المهن', { legacy: true })).toBe(true);
    expect(lcCategoryMatchesWord(pupil, 'المهن')).toBe(false);
    expect(lcCategoryMatchesWord(volcano, 'الطقس', { legacy: true })).toBe(true);
    expect(lcCategoryMatchesWord(sea, 'الطقس', { legacy: true })).toBe(false);
    expect(lcCategoryMatchesWord(sea, LC_LEGACY_PLACES)).toBe(true);
    expect(lcCategoryMatchesWord(volcano, LC_LEGACY_PLACES)).toBe(false);
  });

  it('keeps the old nine-number selection valid without hiding zero in the new category', () => {
    const zero = word('صِفْرٌ', 'الأعداد');
    expect(lcUsesLegacySelection('الأرقام')).toBe(true);
    expect(lcCategoryMatchesWord(zero, 'الأرقام', { legacy: true })).toBe(false);
    expect(lcCategoryMatchesWord(zero, 'الأرقام')).toBe(true);
    expect(lcCategoryMatchesWord(zero, 'الأعداد')).toBe(true);
  });
});

describe('Number ordering and progressive rounds', () => {
  const numbers = ['صِفْرٌ', 'وَاحِدٌ', 'اِثْنَانِ', 'ثَلَاثَةٌ', 'أَرْبَعَةٌ', 'خَمْسَةٌ', 'سِتَّةٌ', 'سَبْعَةٌ', 'ثَمَانِيَةٌ', 'تِسْعَةٌ'];
  const ids = numbers.map((_, n) => `n${n}`);
  it('orders all ten number words from 0 through 9, including a restored missing letter', () => {
    const rows = numbers.map((text, n) => word(text, 'الأعداد', ids[n])).reverse();
    rows[9] = { ...rows[9], word: 'صِفْ_ٌ', missing_letter: 'ر' };
    expect(sortLcCategoryWords(rows, 'الأرقام').map(r => r.id)).toEqual(ids);
    expect(rows[0].id).toBe('n9');
    expect(lcNumberValue('عَشَرَةٌ')).toBeNull();
  });
  it('does not reorder other topics or mix unknown teacher words into the 0–9 sequence', () => {
    const rows = [word('س', 'الحيوانات'), word('أ', 'الحيوانات')];
    expect(sortLcCategoryWords(rows, 'الحيوانات')).toEqual(rows);
    expect(sortLcCategoryWords([word('جديد', 'الأعداد'), word('صفر', 'الأعداد')], 'الأعداد').map(r => r.word)).toEqual(['صفر', 'جديد']);
  });
  it('shows 0–4 then 5–9 for five-word rounds, then restarts at 0', () => {
    const first = pickLcOrderedRound(ids, [], 5);
    expect(first.picked).toEqual(ids.slice(0, 5));
    const second = pickLcOrderedRound(ids, first.seen, 5);
    expect(second).toEqual({ picked: ids.slice(5), seen: [] });
    expect(pickLcOrderedRound(ids, second.seen, 5).picked).toEqual(ids.slice(0, 5));
  });
  it('shows newly added zero first even if the previous nine were all seen', () => {
    expect(pickLcOrderedRound(ids, ids.slice(1), 5)).toEqual({ picked: ids.slice(0, 5), seen: ids.slice(1, 5) });
    expect(pickLcOrderedRound(ids, ids.slice(1), 10)).toEqual({ picked: ids, seen: [] });
  });
  it('ignores removed IDs and never duplicates an item within a round', () => {
    const result = pickLcOrderedRound(['0', '1', '1', '2'], ['gone', '0', '1'], 2);
    expect(result).toEqual({ picked: ['2', '0'], seen: ['0'] });
    expect(pickLcOrderedRound(ids, [], 0)).toEqual({ picked: [], seen: [] });
  });
});

describe('Historical reports, access and category artwork', () => {
  it('uses the latest report under a renamed identity without awarding or merging totals', () => {
    const original = [
      { category: 'الفواكه', correct: 2, total: 5, played_at: '2026-11-18T09:00:00Z' },
      { category: 'الغلال', correct: 8, total: 10, played_at: '2026-11-17T09:00:00Z' },
      { category: 'مهن', correct: 3, total: 4 },
    ];
    const mapped = normalizeLcCategoryResults(original);
    expect(mapped['الفواكه']).toMatchObject({ correct: 2, total: 5 });
    expect(mapped['المهن']).toMatchObject({ correct: 3, total: 4 });
    expect(original[1].category).toBe('الغلال');
  });
  it('opens the split worlds using old access without fabricating three sets of stars', () => {
    const reports = normalizeLcCategoryResults([{ category: LC_LEGACY_PLACES, correct: 26, total: 26 }]);
    expect(Object.keys(reports)).toEqual([LC_LEGACY_PLACES]);
    for (const name of ['أماكن من حولنا', 'بلدان ومدن', 'الطبيعة', 'الأسرة']) {
      expect(reports[name]).toBeUndefined();
      expect(isLcCategoryUnlocked(name, reports, LC_CATEGORY_ORDER)).toBe(true);
    }
    expect(isLcCategoryUnlocked('الأشكال', reports, LC_CATEGORY_ORDER)).toBe(false);
  });
  it('preserves access already available after the farm and completed categories', () => {
    const reports = { الفلاحة: { correct: 10, total: 20 } };
    for (const name of ['أماكن من حولنا', 'بلدان ومدن', 'الطبيعة']) expect(isLcCategoryUnlocked(name, reports, LC_CATEGORY_ORDER)).toBe(true);
    expect(isLcCategoryUnlocked('الحيوانات', {}, LC_CATEGORY_ORDER)).toBe(true);
    expect(isLcCategoryUnlocked('الجوّ والفصول', {}, LC_CATEGORY_ORDER)).toBe(false);
    expect(isLcCategoryUnlocked('الأعداد', { الأرقام: { correct: 9 } }, LC_CATEGORY_ORDER)).toBe(true);
  });
  it('keeps the new learner sequence after the newly named farm', () => {
    const reports = { المزرعة: { correct: 21, total: 21 } };
    expect(isLcCategoryUnlocked('أماكن من حولنا', reports, LC_CATEGORY_ORDER)).toBe(true);
    expect(isLcCategoryUnlocked('بلدان ومدن', reports, LC_CATEGORY_ORDER)).toBe(false);
    expect(isLcCategoryUnlocked('الطبيعة', reports, LC_CATEGORY_ORDER)).toBe(false);
    const afterPlaces = { ...reports, 'أماكن من حولنا': { correct: 8, total: 8 } };
    expect(isLcCategoryUnlocked('بلدان ومدن', afterPlaces, LC_CATEGORY_ORDER)).toBe(true);
    expect(isLcCategoryUnlocked('الطبيعة', afterPlaces, LC_CATEGORY_ORDER)).toBe(false);
    expect(isLcCategoryUnlocked('الطبيعة', { ...afterPlaces, 'بلدان ومدن': { correct: 11, total: 11 } }, LC_CATEGORY_ORDER)).toBe(true);
  });
  it('retains inherited farm access after a newer replay without mixing either score', () => {
    const old = { category: 'الفلاحة', correct: 18, total: 21, played_at: '2026-11-17T12:00:00Z' };
    const replay = { category: 'المزرعة', correct: 2, total: 5, played_at: '2026-11-19T12:00:00Z' };
    for (const rows of [[old, replay], [replay, old]]) {
      const reports = normalizeLcCategoryResults(rows);
      expect(reports['المزرعة']).toMatchObject({ correct: 2, total: 5, legacyAliases: ['الفلاحة'] });
      expect(Object.keys(reports)).toEqual(['المزرعة']);
      const normalizedAgain = normalizeLcCategoryResults(reports);
      for (const name of ['أماكن من حولنا', 'بلدان ومدن', 'الطبيعة']) {
        expect(reports[name]).toBeUndefined();
        expect(isLcCategoryUnlocked(name, normalizedAgain, LC_CATEGORY_ORDER)).toBe(true);
      }
    }
    expect(old.category).toBe('الفلاحة');
    expect(replay).not.toHaveProperty('legacyAliases');
  });
  it('retains uploaded fruit artwork whichever alias or placeholder arrives first', () => {
    const image = { name: 'الغلال', image_url: '/fruit-original.jpg', emoji: null };
    const placeholder = { name: 'الفواكه', image_url: null, emoji: '🍎' };
    for (const rows of [[image, placeholder], [placeholder, image]]) {
      expect(normalizeLcCategoryMeta(rows)).toEqual([{ name: 'الفواكه', image_url: '/fruit-original.jpg', emoji: '🍎' }]);
    }
    expect(lcCategoryScene('أدوات')).toBe('workshop');
    expect(lcCategoryScene('بلدان ومدن')).toBe('city');
  });
});
