import { canonicalLcWord, normalizeLcCategory, lcCategoryKey, lcCategoryAliases, lcCategoryAccessKeys } from './letter-catcher-categories';
import { markSeen } from './letter-catcher';

function browserStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

export function lcSeenStorageKey(userId, childId, category) {
  return `lc_seen_v2:${userId || 'guest'}:${childId || 'self'}:${lcCategoryKey(category)}`;
}

export function readLcSeen(key, storage = browserStorage()) {
  try {
    const value = JSON.parse(storage?.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function writeLcSeen(key, ids, storage = browserStorage()) {
  try { storage?.setItem(key, JSON.stringify(ids)); } catch {}
}

// These sources contain individual moved words, not shared category results.
// pickRotation/markSeen discard IDs absent from the destination word pool.
const movedWordSources = {
  school: ['المهن', 'مهن'],
  nature: ['الطقس', 'الطقس والفصول', 'الجوّ والفصول'],
};

/* Copy old display-name memories once. Reading old names on every new round
   would reapply a finished cycle after its new stable memory was reset to []. */
export function readLcCategorySeen(userId, childId, category, storage = browserStorage()) {
  const key = lcSeenStorageKey(userId, childId, category);
  try {
    if (storage?.getItem(key) != null) return { key, ids: readLcSeen(key, storage) };
    const names = [...new Set([
      ...lcCategoryAliases(category), ...lcCategoryAccessKeys(category),
      ...(movedWordSources[lcCategoryKey(category)] || []),
    ])];
    const prefix = `lc_seen_v1:${userId || 'guest'}:${childId || 'self'}:`;
    const ids = [...new Set(names.flatMap(name => [
      ...readLcSeen(`${prefix}${name}`, storage),
      ...(lcSeenStorageKey(userId, childId, name) !== key
        ? readLcSeen(lcSeenStorageKey(userId, childId, name), storage) : []),
    ]))];
    writeLcSeen(key, ids, storage);
    return { key, ids };
  } catch { return { key, ids: [] }; }
}

/* A saved old round keeps its own question order and report. Its pupil/volcano/
   beach answer must also reach the word's current destination memory, even
   when the current source-category pool no longer includes that word ID. */
export function rememberLcAnsweredWord({ userId, childId, word, round }, storage = browserStorage()) {
  const id = String(word?.id ?? '');
  if (!id) return;
  if (round?.key) {
    writeLcSeen(round.key, markSeen(round.ids || [], readLcSeen(round.key, storage), id), storage);
  }
  const destination = canonicalLcWord(word).category;
  if (!destination || !round?.category || round.category === '__all__'
      || destination === normalizeLcCategory(round.category)) return;
  const memory = readLcCategorySeen(userId, childId, destination, storage);
  // We are completing a historical mixed round, not a new full destination
  // cycle. Preserve IDs; the next destination round validates its current pool.
  writeLcSeen(memory.key, [...new Set([...memory.ids, id])], storage);
}
