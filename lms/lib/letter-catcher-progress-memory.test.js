import { describe, it, expect } from 'vitest';
import { pickRotation, markSeen } from './letter-catcher';
import { lcSeenStorageKey, readLcCategorySeen, readLcSeen, writeLcSeen, rememberLcAnsweredWord } from './letter-catcher-progress-memory';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

describe('Letter Catcher category-memory migration', () => {
  it('keeps fruit IDs after a display rename, without reapplying a completed old cycle', () => {
    const store = storage();
    store.setItem('lc_seen_v1:u:self:الغلال', JSON.stringify(['apple', 'pear']));
    const first = readLcCategorySeen('u', null, 'الفواكه', store);
    expect(first.ids).toEqual(['apple', 'pear']);
    expect(first.key).toBe(lcSeenStorageKey('u', null, 'الغلال'));
    writeLcSeen(first.key, [], store);
    expect(readLcCategorySeen('u', null, 'الفواكه', store).ids).toEqual([]);
    expect(JSON.parse(store.getItem('lc_seen_v1:u:self:الغلال'))).toEqual(['apple', 'pear']);
  });

  it('keeps each account and each active child separate', () => {
    const store = storage();
    store.setItem('lc_seen_v1:u:child-a:الأرقام', JSON.stringify(['one']));
    expect(readLcCategorySeen('u', 'child-a', 'الأعداد', store).ids).toEqual(['one']);
    expect(readLcCategorySeen('u', 'child-b', 'الأعداد', store).ids).toEqual([]);
    expect(readLcCategorySeen('other', 'child-a', 'الأعداد', store).ids).toEqual([]);
  });

  it('lets each split branch retain only IDs actually belonging to its word pool', () => {
    const store = storage();
    store.setItem('lc_seen_v1:u:self:الأماكن والمدن', JSON.stringify(['sea', 'france', 'market']));
    store.setItem('lc_seen_v1:u:self:الطقس', JSON.stringify(['volcano', 'rain']));
    const nature = readLcCategorySeen('u', null, 'الطبيعة', store);
    const naturePool = ['sea', 'volcano', 'river'];
    const next = pickRotation(naturePool, nature.ids, 1);
    expect(next.picked).toEqual(['river']);
    expect(markSeen(naturePool, nature.ids, 'river')).toEqual([]);
    const countries = readLcCategorySeen('u', null, 'بلدان ومدن', store);
    expect(pickRotation(['france', 'tunisia'], countries.ids, 1).picked).toEqual(['tunisia']);
  });

  it('preserves the moved pupil word when merging school memories', () => {
    const store = storage();
    store.setItem('lc_seen_v1:u:self:أدوات', JSON.stringify(['book']));
    store.setItem('lc_seen_v1:u:self:المهن', JSON.stringify(['pupil', 'doctor']));
    const result = readLcCategorySeen('u', null, 'المدرسة', store);
    expect(pickRotation(['book', 'pupil', 'ruler'], result.ids, 1).picked).toEqual(['ruler']);
  });

  it('also reads already-migrated source memories while the new branch has no memory yet', () => {
    const store = storage();
    writeLcSeen(lcSeenStorageKey('u', null, 'الأماكن والمدن'), ['sea'], store);
    writeLcSeen(lcSeenStorageKey('u', null, 'الجوّ والفصول'), ['volcano'], store);
    expect(readLcCategorySeen('u', null, 'الطبيعة', store).ids).toEqual(['sea', 'volcano']);
  });

  it('keeps the game usable with corrupt or unavailable browser storage', () => {
    const store = storage();
    store.setItem(lcSeenStorageKey('u', null, 'الفواكه'), '{broken');
    expect(readLcCategorySeen('u', null, 'الفواكه', store).ids).toEqual([]);
    expect(readLcCategorySeen('u', null, 'الفواكه', null).ids).toEqual([]);
    expect(readLcSeen('any', { getItem: () => { throw new Error('blocked'); } })).toEqual([]);
  });

  it('records a resumed old professions pupil in school, although the new professions pool excludes it', () => {
    const store = storage();
    const jobs = readLcCategorySeen('u', 'child', 'المهن', store);
    const school = readLcCategorySeen('u', 'child', 'المدرسة', store);
    // Destination migration already occurred before this saved answer resumed.
    expect(school.ids).toEqual([]);
    const word = { id: 'pupil', word: 'تِلْ_يذٌ', missing_letter: 'مِ', category: 'المهن' };
    const round = { category: 'المهن', key: jobs.key, ids: ['doctor', 'teacher'] };
    rememberLcAnsweredWord({ userId: 'u', childId: 'child', word, round }, store);
    expect(readLcSeen(school.key, store)).toEqual(['pupil']);
    expect(readLcSeen(jobs.key, store)).toEqual([]);
    expect(pickRotation(['pupil', 'book'], readLcSeen(school.key, store), 1).picked).toEqual(['book']);
    expect(word.category).toBe('المهن');
    expect(round.ids).toEqual(['doctor', 'teacher']);
  });

  it.each([
    { id: 'volcano', word: 'بُرْ_انٌ', missing_letter: 'كَ', category: 'الطقس' },
    { id: 'beach', word: 'شَاطِ_', missing_letter: 'ئٌ', category: 'الطقس' },
  ])('records resumed old weather word $id directly in nature', word => {
    const store = storage();
    const weather = readLcCategorySeen('u', null, 'الجوّ والفصول', store);
    const nature = readLcCategorySeen('u', null, 'الطبيعة', store);
    const round = { category: 'الجوّ والفصول', key: weather.key, ids: ['rain', 'wind'] };
    rememberLcAnsweredWord({ userId: 'u', word, round }, store);
    expect(readLcSeen(nature.key, store)).toEqual([word.id]);
    expect(readLcSeen(weather.key, store)).toEqual([]);
  });

  it('keeps play-all memory separate and avoids duplicate IDs on retry', () => {
    const store = storage();
    const all = readLcCategorySeen('u', null, '__all__', store);
    const word = { id: 'pupil', word: 'تلميذ', category: 'المدرسة' };
    const round = { category: '__all__', key: all.key, ids: ['pupil', 'doctor'] };
    rememberLcAnsweredWord({ userId: 'u', word, round }, store);
    rememberLcAnsweredWord({ userId: 'u', word, round }, store);
    expect(readLcSeen(all.key, store)).toEqual(['pupil']);
    expect(readLcCategorySeen('u', null, 'المدرسة', store).ids).toEqual([]);
  });
});
