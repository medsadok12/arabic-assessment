/* Stable identities for Letter Catcher's editable Arabic topic titles.
   Display renames share their old results. A split keeps its old report separate:
   completing «الأماكن والمدن» never invents results for its three new branches. */
const folded = value => String(value ?? '').normalize('NFC')
  .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/\s+/g, ' ').trim();

export const LC_LEGACY_PLACES = 'الأماكن والمدن';
export const LC_CATEGORIES = [
  { key: 'animals', name: 'الحيوانات', aliases: [], scene: 'savanna' },
  { key: 'weather-seasons', name: 'الجوّ والفصول', aliases: ['الطقس', 'الطقس والفصول'], scene: 'weather' },
  { key: 'sports-games', name: 'الرياضة والألعاب', aliases: ['الرّياضة والألعاب'], scene: 'sports' },
  { key: 'clothes-accessories', name: 'الملابس والزينة', aliases: ['الملابس والزّينة'], scene: 'clothes' },
  { key: 'jobs', name: 'المهن', aliases: ['مهن'], scene: 'jobs' },
  { key: 'colors', name: 'الألوان', aliases: [], scene: 'colors' },
  { key: 'vegetables', name: 'الخضروات', aliases: [], scene: 'garden' },
  { key: 'school', name: 'المدرسة', aliases: ['أدوات'], scene: 'workshop' },
  { key: 'numbers', name: 'الأعداد', aliases: ['الأرقام'], scene: 'numbers' },
  { key: 'fruits', name: 'الفواكه', aliases: ['الغلال'], scene: 'orchard' },
  { key: 'farm', name: 'المزرعة', aliases: ['الفلاحة'], scene: 'farm' },
  { key: 'places', name: 'أماكن من حولنا', aliases: [], scene: 'city' },
  { key: 'countries-cities', name: 'بلدان ومدن', aliases: [], scene: 'city' },
  { key: 'nature', name: 'الطبيعة', aliases: [], scene: 'meadow' },
  { key: 'family', name: 'الأسرة', aliases: [], scene: 'family' },
  { key: 'shapes', name: 'الأشكال', aliases: [], scene: 'shapes' },
  { key: 'body', name: 'أعضاء الجسم', aliases: [], scene: 'family' },
  { key: 'home', name: 'البيت', aliases: ['المنزل'], scene: 'family' },
  { key: 'food-drink', name: 'الطعام والشراب', aliases: [], scene: 'orchard' },
  { key: 'transport', name: 'وسائل النقل', aliases: [], scene: 'city' },
  { key: 'feelings', name: 'المشاعر والحالات', aliases: [], scene: 'family' },
  { key: 'hygiene', name: 'العناية والنظافة', aliases: [], scene: 'workshop' },
];
export const LC_CATEGORY_ORDER = LC_CATEGORIES.map(c => c.name);
export const LC_LEGACY_CATEGORY_ORDER = [
  'الحيوانات', 'الطقس', 'الرّياضة والألعاب', 'الملابس والزّينة', 'المهن',
  'الألوان', 'الخضروات', 'أدوات', 'الأرقام', 'الغلال', 'الفلاحة',
  LC_LEGACY_PLACES, 'الأسرة', 'الأشكال',
];
const definitions = new Map(LC_CATEGORIES.flatMap(c => [c.name, ...c.aliases].map(n => [folded(n), c])));
const splitNames = new Set(['أماكن من حولنا', 'بلدان ومدن', 'الطبيعة']);

export function normalizeLcCategory(name) {
  const text = String(name ?? '').trim();
  return definitions.get(folded(text))?.name || text;
}
export function lcCategoryKey(name) {
  if (folded(name) === folded(LC_LEGACY_PLACES)) return 'legacy-places';
  return definitions.get(folded(name))?.key || normalizeLcCategory(name);
}
export function lcCategoryAliases(name) {
  const definition = definitions.get(folded(name));
  return definition ? [...new Set([definition.name, ...definition.aliases])] : [normalizeLcCategory(name)];
}
export function lcCategoryAccessKeys(name) {
  const canonical = normalizeLcCategory(name);
  return [...lcCategoryAliases(canonical), ...(splitNames.has(canonical) ? [LC_LEGACY_PLACES] : [])];
}
export function lcCategoryScene(name) {
  return definitions.get(folded(name))?.scene || null;
}
export function sortLcCategories(names) {
  const unique = [...new Set((names || []).map(normalizeLcCategory).filter(Boolean))];
  const rank = name => name === LC_LEGACY_PLACES ? 11 : LC_CATEGORY_ORDER.indexOf(name);
  return unique.map((name, index) => ({ name, index, rank: rank(name) }))
    .sort((a, b) => (a.rank < 0 ? 1000 : a.rank) - (b.rank < 0 ? 1000 : b.rank) || a.index - b.index)
    .map(item => item.name);
}

const fullWord = row => String(row?.word ?? '').replace('_', row?.missing_letter || '');
const countries = new Set([
  'إيطاليا', 'الصين', 'العراق', 'الهند', 'تركيا', 'تونس', 'روسيا', 'فرنسا',
  'فلسطين', 'مصر', 'مكة المكرمة',
].map(folded));
const naturalPlaces = new Set(['بحر', 'بحيرة', 'جبال', 'شاطئ', 'شلال', 'صحراء', 'نهر'].map(folded));

/* Reading an old cached row and reading a migrated row produce the same topic.
   Original records, media URLs, answers and IDs are retained unchanged. */
export function canonicalLcWord(row) {
  const source = row?.category || row?.topic || '';
  let category = normalizeLcCategory(source);
  const word = folded(fullWord(row));
  if (folded(source) === folded(LC_LEGACY_PLACES)) {
    category = countries.has(word) ? 'بلدان ومدن' : naturalPlaces.has(word) ? 'الطبيعة' : 'أماكن من حولنا';
  } else if (category === 'الجوّ والفصول' && ['بركان', 'شاطئ'].map(folded).includes(word)) {
    category = 'الطبيعة';
  } else if (category === 'المهن' && word === folded('تلميذ')) {
    category = 'المدرسة';
  }
  return { ...row, category, topic: category };
}

const numberWords = new Map([
  ['صفر', 0], ['واحد', 1], ['اثنان', 2], ['اثنين', 2], ['اثنتان', 2], ['اثنتين', 2],
  ['ثلاثة', 3], ['أربعة', 4], ['خمسة', 5], ['ستة', 6], ['سبعة', 7], ['ثمانية', 8], ['تسعة', 9], ['عشرة', 10],
].map(([word, n]) => [folded(word), n]));
export function lcNumberValue(row) {
  const word = folded(typeof row === 'string' ? row : fullWord(row));
  if (/^(?:[0-9]|10)$/.test(word)) return Number(word);
  return numberWords.get(word) ?? null;
}
export function sortLcCategoryWords(words, category) {
  const result = [...(words || [])];
  if (lcCategoryKey(category) !== 'numbers') return result;
  return result.sort((a, b) => (lcNumberValue(a) ?? Infinity) - (lcNumberValue(b) ?? Infinity));
}

/* Ordered 0–10 learning rounds use the same rotation contract as other topics,
   but never shuffle the number sequence or mutate saved IDs. */
export function pickLcOrderedRound(ids, seenIds, count) {
  const all = [...new Set((ids || []).map(String))];
  const n = Math.min(Math.max(0, count | 0), all.length);
  if (!n) return { picked: [], seen: [] };
  if (n >= all.length) return { picked: all, seen: [] };
  const valid = new Set(all);
  const seen = new Set((seenIds || []).map(String).filter(id => valid.has(id)));
  const unseen = all.filter(id => !seen.has(id));
  if (unseen.length >= n) {
    const picked = unseen.slice(0, n);
    picked.forEach(id => seen.add(id));
    return { picked, seen: seen.size >= all.length ? [] : [...seen] };
  }
  const fill = all.filter(id => seen.has(id)).slice(0, n - unseen.length);
  return { picked: [...unseen, ...fill], seen: fill };
}

/* Only these original word records crossed an old category boundary.
   They also let an already-open old client start its unchanged cached selection
   during rollout, without accepting unrelated new items in that old category. */
const movedOrigins = {
  'b9e76e35-9365-4c84-aee1-cd690c95bb1d': 'المهن', // تلميذ
  'c9067b00-3b4e-4f20-8ba3-570776880968': 'الطقس', // بركان
  '63edf47e-498f-418a-83d2-73330383ec87': 'الطقس', // second شاطئ record
};
const legacyNames = {
  'الجوّ والفصول': 'الطقس', 'الرياضة والألعاب': 'الرّياضة والألعاب',
  'الملابس والزينة': 'الملابس والزّينة', 'المدرسة': 'أدوات',
  'الأعداد': 'الأرقام', 'الفواكه': 'الغلال', 'المزرعة': 'الفلاحة',
};
function legacyCategoryForWord(row) {
  if (movedOrigins[String(row?.id)]) return movedOrigins[String(row.id)];
  const canonical = canonicalLcWord(row).category;
  if (canonical === 'الأعداد' && lcNumberValue(row) === 0) return null; // newly added, absent from the old nine-item pool
  if (splitNames.has(canonical)) return LC_LEGACY_PLACES;
  return legacyNames[canonical] || canonical;
}
export function lcCategoryMatchesWord(row, requested, { legacy = false } = {}) {
  if (!requested || requested === '__all__') return true;
  if (legacy || folded(requested) === folded(LC_LEGACY_PLACES)) {
    return folded(legacyCategoryForWord(row)) === folded(requested);
  }
  return canonicalLcWord(row).category === normalizeLcCategory(requested);
}
export function lcUsesLegacySelection(category, ids = []) {
  const canonical = normalizeLcCategory(category);
  return folded(category) === folded(LC_LEGACY_PLACES)
    || (canonical !== String(category ?? '').trim() && LC_LEGACY_CATEGORY_ORDER.includes(String(category ?? '').trim()))
    || ids.some(id => movedOrigins[String(id)] === category);
}

/* Latest report wins when old/new display titles share one identity. Historical
   mixed-places reports remain under their own key and only preserve access. */
export function normalizeLcCategoryResults(results) {
  const rows = Array.isArray(results) ? results : Object.entries(results || {}).map(([category, row]) => ({ ...row, category: row?.category || category }));
  const normalized = {};
  for (const row of rows) {
    if (!row?.category) continue;
    const category = normalizeLcCategory(row.category);
    const old = normalized[category];
    // Access inherited from an old card survives a newer replay under its new
    // title. This marker does not merge scores, totals or completion reports.
    const legacyAliases = [...new Set([
      ...(Array.isArray(old?.legacyAliases) ? old.legacyAliases : []),
      ...(Array.isArray(row.legacyAliases) ? row.legacyAliases : []),
      ...(row.category !== category ? [row.category] : []),
    ].filter(alias => typeof alias === 'string' && alias !== category && normalizeLcCategory(alias) === category))];
    const date = Date.parse(row.played_at || ''), oldDate = Date.parse(old?.played_at || '');
    const latest = !old || (Number.isFinite(date) && (!Number.isFinite(oldDate) || date > oldDate)) ? row : old;
    normalized[category] = { ...latest, category, ...(legacyAliases.length ? { legacyAliases } : {}) };
  }
  return normalized;
}
export function isLcCategoryUnlocked(name, results, availableCategories) {
  const category = normalizeLcCategory(name);
  const reports = normalizeLcCategoryResults(results);
  const categories = sortLcCategories(availableCategories || LC_CATEGORY_ORDER);
  const index = categories.indexOf(category);
  if (index < 0) return false;
  if (index === 0 || lcCategoryAccessKeys(category).some(key => reports[normalizeLcCategory(key)])) return true;
  if (reports[categories[index - 1]]) return true;
  // Preserve the former mixed card's access only for old farm completions.
  // A new learner still follows places -> countries/cities -> nature in order.
  if (splitNames.has(category) && reports['المزرعة']?.legacyAliases?.some(alias => folded(alias) === folded('الفلاحة'))) return true;
  if (category === 'الأسرة' && reports[LC_LEGACY_PLACES]) return true;
  return false;
}

export function normalizeLcCategoryMeta(rows) {
  const byName = new Map();
  for (const row of rows || []) {
    const name = normalizeLcCategory(row.name);
    const previous = byName.get(name);
    byName.set(name, {
      ...previous, ...row, name,
      image_url: row.image_url || previous?.image_url || null,
      emoji: row.emoji || previous?.emoji || null,
    });
  }
  const rank = sortLcCategories([...byName.keys()]);
  return rank.map(name => byName.get(name));
}

