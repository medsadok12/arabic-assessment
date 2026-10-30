import { DEFAULT_CATEGORIES } from '../config.js';

// الجمع بوحدات الألف (مليم/فلس) لتفادي أخطاء الكسور العشرية
const toMilli = price => Math.round((Number(price) || 0) * 1000);

export function computeStats(items) {
  const sums = { total: 0, bought: 0, soon: 0, pending: 0 };
  const counts = { all: items.length, bought: 0, soon: 0, pending: 0 };
  for (const item of items) {
    const value = toMilli(item.price);
    sums.total += value;
    sums[item.status] += value;
    counts[item.status] += 1;
  }
  const total = sums.total / 1000;
  const paid = sums.bought / 1000;
  return {
    total,
    paid,
    soon: sums.soon / 1000,
    pending: sums.pending / 1000,
    remaining: (sums.soon + sums.pending) / 1000,
    paidRatio: sums.total ? sums.bought / sums.total : 0,
    counts,
  };
}

export function categoryBreakdown(items) {
  const map = new Map();
  for (const item of items) {
    const entry = map.get(item.category) ?? { category: item.category, total: 0, count: 0 };
    entry.total += toMilli(item.price);
    entry.count += 1;
    map.set(item.category, entry);
  }
  return [...map.values()]
    .map(entry => ({ ...entry, total: entry.total / 1000 }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'ar'));
}

export function categoryOptions(items) {
  const names = DEFAULT_CATEGORIES.map(c => c.name);
  for (const item of items) if (!names.includes(item.category)) names.push(item.category);
  return names;
}

export function monthOptions(items) {
  return [...new Set(items.map(item => item.item_date.slice(0, 7)))].sort();
}

export const DEFAULT_FILTERS = { status: 'all', category: 'all', month: 'all', query: '', sort: 'due' };

export function hasActiveFilters(filters) {
  return filters.status !== 'all' || filters.category !== 'all' || filters.month !== 'all' || filters.query.trim() !== '';
}

export function filterItems(items, filters) {
  const query = filters.query.trim().toLowerCase();
  return items.filter(item =>
    (filters.status === 'all' || item.status === filters.status) &&
    (filters.category === 'all' || item.category === filters.category) &&
    (filters.month === 'all' || item.item_date.startsWith(filters.month)) &&
    (!query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)),
  );
}

export const SORTS = {
  due:    'الأقرب استحقاقاً',
  latest: 'الأحدث تاريخاً',
  price:  'الأعلى سعراً',
  added:  'المضافة حديثاً',
};

const byDateAsc = (a, b) => a.item_date.localeCompare(b.item_date) || a.name.localeCompare(b.name, 'ar');

export function sortItems(items, sort) {
  const list = [...items];
  switch (sort) {
    case 'latest':
      return list.sort((a, b) => byDateAsc(b, a));
    case 'price':
      return list.sort((a, b) => Number(b.price) - Number(a.price) || byDateAsc(a, b));
    case 'added':
      return list.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    default:
      // غير المدفوع أولاً بترتيب الاستحقاق، ثم ما تم شراؤه
      return list.sort((a, b) => (a.status === 'bought') - (b.status === 'bought') || byDateAsc(a, b));
  }
}
