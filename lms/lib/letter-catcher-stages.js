import { canonicalLcWord, isLcCategoryUnlocked, lcCategoryKey, lcNumberValue, normalizeLcCategory, normalizeLcCategoryResults, sortLcCategories } from './letter-catcher-categories';

export const LC_STAGE_SIZE_CHOICES = Object.freeze([5, 10, 15]);

// Compare IDs without locale-sensitive collation so Node and every browser use
// the same word partition, even if the API returned the bank in another order.
const compareIds = (a, b) => String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0;

function fingerprint(value) {
  let first = 0x811c9dc5, second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
    second ^= second >>> 13;
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}

// Stages cover the live category exactly once. A changed partition receives a
// new identity; unchanged media/wording keep the existing word IDs and progress.
export function lcStagesForCategory(words, category, stageSize = 5) {
  const name = normalizeLcCategory(category);
  if (!name || name === '__all__') return [];
  const size = LC_STAGE_SIZE_CHOICES.includes(Number(stageSize)) ? Number(stageSize) : 5;
  const numeric = lcCategoryKey(name) === 'numbers';
  const seen = new Set();
  const ordered = (Array.isArray(words) ? words : []).map(canonicalLcWord)
    .filter(word => word.category === name && ['string', 'number'].includes(typeof word.id) && String(word.id).length > 0)
    .sort((a, b) => numeric
      ? ((lcNumberValue(a) ?? Infinity) - (lcNumberValue(b) ?? Infinity) || compareIds(a, b))
      : compareIds(a, b))
    .filter(word => {
      const id = String(word.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  const stages = [];
  for (let offset = 0; offset < ordered.length; offset += size) {
    const stageWords = ordered.slice(offset, offset + size);
    const wordIds = stageWords.map(word => String(word.id));
    const number = stages.length + 1;
    const id = `lc-stage-${number}-${fingerprint(JSON.stringify([name, number, wordIds]))}`;
    stages.push({ id, number, category: name, wordIds, words: stageWords, total: stageWords.length });
  }
  return stages;
}

// The fingerprint is a lookup key, not proof of completion: compare the entire
// stored ID list before using a result to unlock the next stage.
export function lcStageDone(stage, progress = {}) {
  if (!stage?.id || !Array.isArray(stage.wordIds) || !stage.wordIds.length) return false;
  const completed = progress?.[stage.id];
  return completed?.complete === true && Array.isArray(completed.wordIds)
    && completed.wordIds.length === stage.wordIds.length
    && stage.wordIds.every((id, index) => id === completed.wordIds[index]);
}

export function isLcStageUnlocked(stage, stages, progress = {}) {
  if (!stage?.id || !Array.isArray(stages)) return false;
  const index = stages.findIndex(item => item.id === stage.id);
  return index >= 0 && stages.slice(0, index).every(item => lcStageDone(item, progress));
}

// Old reports preserve access without pretending they completed any new stage.
// Reports created by a single new stage cannot unlock the following world.
export function isLcStagedCategoryUnlocked(category, categories, words, stageSize, progress = {}, legacyResults = {}) {
  const name = normalizeLcCategory(category);
  const ordered = sortLcCategories(categories || []);
  const index = ordered.indexOf(name);
  if (index < 0) return false;
  const reports = normalizeLcCategoryResults(legacyResults);
  if (index === 0 || reports[name]) return true;
  const previousStages = lcStagesForCategory(words, ordered[index - 1], stageSize);
  if (previousStages.length && previousStages.every(stage => lcStageDone(stage, progress))) return true;

  const entries = Object.values(progress || {}).filter(entry => entry && typeof entry.category === 'string');
  const enrolled = new Set(entries.map(entry => normalizeLcCategory(entry.category)));
  const inherited = new Set(entries.filter(entry => entry.legacyAccess === true).map(entry => normalizeLcCategory(entry.category)));
  const historical = Object.fromEntries(Object.entries(reports).filter(([key]) => !enrolled.has(key) || inherited.has(key)));
  return isLcCategoryUnlocked(name, historical, ordered);
}
