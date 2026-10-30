import { describe, expect, it } from 'vitest';
import {
  createFormatters, daysBetween, daysPhrase, dueHint, isISODate, itemsPhrase, parseAmount, weddingCountdown,
} from './format.js';
import {
  DEFAULT_FILTERS, categoryBreakdown, categoryOptions, computeStats, filterItems, hasActiveFilters, monthOptions, sortItems,
} from './stats.js';
import { formatKey, generateKey, isValidKey, normalizeKey, readInvite, KEY_LENGTH } from './spaceKey.js';

const item = (overrides) => ({
  id: overrides.id ?? overrides.name,
  name: 'بند',
  price: 0,
  category: 'أخرى',
  status: 'soon',
  item_date: '2026-11-01',
  created_at: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

const ITEMS = [
  item({ name: 'حجز القاعة', price: 8000, category: 'القاعة', status: 'bought', item_date: '2026-11-20', created_at: '2026-10-01T10:00:00Z' }),
  item({ name: 'طقم ذهب', price: 6500.5, category: 'الذهب', status: 'soon', item_date: '2026-12-05', created_at: '2026-10-03T10:00:00Z' }),
  item({ name: 'غرفة النوم', price: 4200, category: 'تجهيزات المنزل', status: 'pending', item_date: '2026-11-02', created_at: '2026-10-02T10:00:00Z' }),
  item({ name: 'فستان', price: 0.1, category: 'الملابس', status: 'soon', item_date: '2026-11-15', created_at: '2026-10-04T10:00:00Z' }),
  item({ name: 'بطاقات الدعوة', price: 0.2, category: 'الملابس', status: 'bought', item_date: '2026-10-28', created_at: '2026-10-05T10:00:00Z' }),
];

describe('computeStats', () => {
  it('sums totals, paid and remaining without floating point drift', () => {
    const stats = computeStats(ITEMS);
    expect(stats.total).toBe(18700.8);
    expect(stats.paid).toBe(8000.2);
    expect(stats.soon).toBe(6500.6);
    expect(stats.pending).toBe(4200);
    expect(stats.remaining).toBe(10700.6);
    expect(stats.counts).toEqual({ all: 5, bought: 2, soon: 2, pending: 1 });
    expect(stats.paidRatio).toBeCloseTo(8000.2 / 18700.8);
  });

  it('handles an empty notebook', () => {
    expect(computeStats([])).toMatchObject({ total: 0, paid: 0, remaining: 0, paidRatio: 0 });
  });
});

describe('categories and months', () => {
  it('breaks down by category, largest first', () => {
    expect(categoryBreakdown(ITEMS).map(r => [r.category, r.total, r.count])).toEqual([
      ['القاعة', 8000, 1],
      ['الذهب', 6500.5, 1],
      ['تجهيزات المنزل', 4200, 1],
      ['الملابس', 0.3, 2],
    ]);
  });

  it('offers default categories plus custom ones in use', () => {
    const options = categoryOptions([...ITEMS, item({ name: 'رحلة', category: 'شهر العسل' })]);
    expect(options.slice(0, 5)).toEqual(['تجهيزات المنزل', 'القاعة', 'الملابس', 'الذهب', 'أخرى']);
    expect(options).toContain('شهر العسل');
  });

  it('lists distinct months in order', () => {
    expect(monthOptions(ITEMS)).toEqual(['2026-10', '2026-11', '2026-12']);
  });
});

describe('filterItems and sortItems', () => {
  it('filters by status, category, month and search text', () => {
    const names = filters => filterItems(ITEMS, { ...DEFAULT_FILTERS, ...filters }).map(i => i.name);
    expect(names({ status: 'soon' })).toEqual(['طقم ذهب', 'فستان']);
    expect(names({ category: 'الملابس' })).toEqual(['فستان', 'بطاقات الدعوة']);
    expect(names({ month: '2026-11' })).toEqual(['حجز القاعة', 'غرفة النوم', 'فستان']);
    expect(names({ query: 'ذهب' })).toEqual(['طقم ذهب']);
    expect(names({ status: 'soon', month: '2026-11' })).toEqual(['فستان']);
  });

  it('knows when filters are active', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'price' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, query: '  ' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, month: '2026-11' })).toBe(true);
  });

  it('sorts unpaid items by nearest due date first, bought items last', () => {
    expect(sortItems(ITEMS, 'due').map(i => i.name)).toEqual([
      'غرفة النوم', 'فستان', 'طقم ذهب', 'بطاقات الدعوة', 'حجز القاعة',
    ]);
  });

  it('sorts by latest date, highest price and most recently added', () => {
    expect(sortItems(ITEMS, 'latest')[0].name).toBe('طقم ذهب');
    expect(sortItems(ITEMS, 'price').map(i => i.price)).toEqual([8000, 6500.5, 4200, 0.2, 0.1]);
    expect(sortItems(ITEMS, 'added')[0].name).toBe('بطاقات الدعوة');
  });

  it('does not mutate the original list', () => {
    const copy = [...ITEMS];
    sortItems(ITEMS, 'price');
    expect(ITEMS).toEqual(copy);
  });
});

describe('format helpers', () => {
  it('parses Arabic and Western digits with separators', () => {
    expect(parseAmount('١٢٬٥٠٠')).toBe(12500);
    expect(parseAmount('12,500.75')).toBe(12500.75);
    expect(parseAmount('٣٥٠٫٥')).toBe(350.5);
    expect(parseAmount(' 900 ')).toBe(900);
    expect(parseAmount('')).toBeNaN();
    expect(parseAmount('-5')).toBeNaN();
    expect(parseAmount('abc')).toBeNaN();
  });

  it('validates ISO dates', () => {
    expect(isISODate('2026-02-28')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('28/02/2026')).toBe(false);
  });

  it('uses correct Arabic counting forms', () => {
    expect(daysPhrase(1)).toBe('يوم واحد');
    expect(daysPhrase(2)).toBe('يومين');
    expect(daysPhrase(2, 'nom')).toBe('يومان');
    expect(daysPhrase(7)).toBe('7 أيام');
    expect(daysPhrase(45)).toBe('45 يوماً');
    expect(daysPhrase(100)).toBe('100 يوم');
    expect(daysPhrase(103)).toBe('103 أيام');
    expect(itemsPhrase(12)).toBe('12 بنداً');
    expect(itemsPhrase(3)).toBe('3 بنود');
  });

  it('describes how soon an item is due', () => {
    const today = '2026-11-10';
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(dueHint(item({ item_date: '2026-11-08' }), today)).toEqual({ tone: 'late', text: 'متأخر منذ يومين' });
    expect(dueHint(item({ item_date: '2026-11-10' }), today).text).toBe('اليوم');
    expect(dueHint(item({ item_date: '2026-11-11' }), today).text).toBe('غداً');
    expect(dueHint(item({ item_date: '2026-11-15' }), today).text).toBe('بعد 5 أيام');
    expect(dueHint(item({ item_date: '2026-12-30' }), today)).toBeNull();
    expect(dueHint(item({ item_date: '2026-11-01', status: 'bought' }), today)).toBeNull();
  });

  it('counts down to the wedding', () => {
    expect(weddingCountdown(null, '2026-11-10')).toBeNull();
    expect(weddingCountdown('2026-12-25', '2026-11-10')).toBe('45 يوماً على الزفاف');
    expect(weddingCountdown('2026-11-12', '2026-11-10')).toBe('يومان على الزفاف');
    expect(weddingCountdown('2026-11-10', '2026-11-10')).toContain('اليوم');
  });

  it('formats money and local month names', () => {
    const tn = createFormatters('TND');
    expect(tn.money(12500.5)).toBe('12,500.5 د.ت');
    expect(tn.month('2026-01')).toBe('جانفي 2026');
    expect(tn.date('2026-01-15', '2026-10-30')).toBe('15 جانفي');
    expect(tn.date('2027-01-15', '2026-10-30')).toBe('15 جانفي 2027');
    const sa = createFormatters('SAR');
    expect(sa.money(1000)).toBe('1,000 ر.س');
    expect(sa.month('2026-01')).toBe('يناير 2026');
  });
});

describe('space keys', () => {
  it('generates valid unambiguous keys', () => {
    const keys = new Set(Array.from({ length: 200 }, generateKey));
    expect(keys.size).toBe(200);
    for (const key of keys) {
      expect(key).toHaveLength(KEY_LENGTH);
      expect(isValidKey(key)).toBe(true);
      expect(key).not.toMatch(/[lo01]/);
    }
  });

  it('normalizes pasted or formatted keys', () => {
    expect(normalizeKey(' ABCD-efgh-jkmn-pq٢٣ ')).toBe('abcdefghjkmnpq23');
    expect(formatKey('abcdefghjkmnpq23')).toBe('abcd-efgh-jkmn-pq23');
  });

  it('reads invites from the link hash', () => {
    expect(readInvite('#join=abcd-efgh-jkmn-pq23')).toBe('abcdefghjkmnpq23');
    expect(readInvite('#join=short')).toBeNull();
    expect(readInvite('')).toBeNull();
  });
});
