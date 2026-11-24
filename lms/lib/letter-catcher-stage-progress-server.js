import { canonicalLcWord, normalizeLcCategoryResults, sortLcCategories } from './letter-catcher-categories';
import { normalizeLcSettings } from './letter-catcher';
import { isLcStagedCategoryUnlocked, lcStageDone, lcStagesForCategory } from './letter-catcher-stages';
import { verifiedError } from './verified-training';

const prefix = userId => `lc-stage:${userId}:`;
const stageKey = (userId, stageId) => `${prefix(userId)}${stageId}`;
const sameIds = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((id, index) => String(id) === String(right[index]));
const validWord = row => row.word && row.missing_letter && Array.isArray(row.options) && row.options.filter(Boolean).length >= 2;

async function progressRows(admin, userId) {
  const result = [];
  for (let offset = 0; offset < 10000; offset += 1000) {
    const { data, error } = await admin.from('game_settings').select('game_id, settings, updated_at')
      .like('game_id', `${prefix(userId)}%`).order('game_id').range(offset, offset + 999);
    if (error) throw verifiedError('تعذّر عرض مراحلِك. جرّب مرة أخرى.', 503);
    result.push(...(data || []));
    if (!data || data.length < 1000) return result;
  }
  throw verifiedError('تعذّر عرض مراحلِك. جرّب مرة أخرى.', 503);
}

export async function readLcStageContext(admin, user, userId, { words, settings, preview = false } = {}) {
  const [rows, reports] = preview ? [[], []] : await Promise.all([
    progressRows(admin, userId),
    admin.from('game_results').select('category, correct, wrong, total, played_at')
      .eq('user_id', userId).eq('game_id', 'letter_catcher').order('played_at', { ascending: false }),
  ]);
  if (reports?.error) throw verifiedError('تعذّر عرض مراحلِك. جرّب مرة أخرى.', 503);
  const progress = {};
  for (const row of rows) {
    const saved = row.settings;
    if (!saved || saved.userId !== userId || typeof saved.id !== 'string' || row.game_id !== stageKey(userId, saved.id) || !Array.isArray(saved.wordIds)) continue;
    // The verified child identity owns this progress, including when signing in
    // independently after a parent previously selected the child in their tab.
    progress[saved.id] = {
      id: saved.id, number: saved.number, category: saved.category, wordIds: saved.wordIds,
      complete: saved.complete === true, legacyAccess: saved.legacyAccess === true,
      correct: saved.correct || 0, wrong: saved.wrong || 0, total: saved.total,
      ...(saved.completedAt ? { completedAt: saved.completedAt } : {}),
    };
  }
  const legacyResults = normalizeLcCategoryResults(Array.isArray(reports) ? reports : reports.data || []);
  const playableWords = (words || []).map(canonicalLcWord).filter(validWord);
  const categories = sortLcCategories(playableWords.map(row => row.category).filter(Boolean));
  const stageSize = normalizeLcSettings(settings).stage_size;
  const unlockedCategories = categories.filter(category => preview || isLcStagedCategoryUnlocked(category, categories, playableWords, stageSize, progress, legacyResults));
  return { progress, unlockedCategories, categories, legacyResults, words: playableWords, stageSize };
}

async function stageRow(admin, userId, id) {
  const { data, error } = await admin.from('game_settings').select('game_id, settings, updated_at').eq('game_id', stageKey(userId, id)).maybeSingle();
  if (error) throw verifiedError('تعذّر حفظ المرحلة. جرّب مرة أخرى.', 503);
  return data;
}

export async function enrollLcStage(admin, user, userId, stage, context) {
  const previous = Object.values(context.progress).filter(row => row.category === stage.category);
  const legacyAccess = previous.some(row => row.legacyAccess) || (!previous.length && Boolean(context.legacyResults[stage.category]));
  const settings = {
    id: stage.id, number: stage.number, category: stage.category, wordIds: stage.wordIds,
    total: stage.total, owner: user.id, userId, complete: false, legacyAccess,
  };
  const { error } = await admin.from('game_settings').insert({
    game_id: stageKey(userId, stage.id), settings, updated_by: user.id, updated_at: new Date().toISOString(),
  });
  if (error?.code === '23505') {
    const row = await stageRow(admin, userId, stage.id);
    if (row?.settings.userId !== userId || row.settings.category !== stage.category || !sameIds(row.settings.wordIds, stage.wordIds)) throw verifiedError('تغيّرت المرحلة. افتحها من جديد.', 409);
    return;
  }
  if (error) throw verifiedError('تعذّر حفظ بداية المرحلة. جرّب مرة أخرى.', 503);
}

export async function completeLcStage(admin, user, round, summary) {
  if (!round.lcStage || !round.closed || !summary.complete || summary.done !== summary.total || summary.total !== round.lcStage.wordIds.length) return { state: 'pending' };
  const stage = round.lcStage;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    // Explicit read failures are retryable. This idempotent completion marker
    // never awards points, so no ambiguous-payment review is needed here.
    let row;
    try { row = await stageRow(admin, round.userId, stage.id); }
    catch { return { state: 'pending' }; }
    if (!row || row.settings.userId !== round.userId || row.settings.category !== stage.category || !sameIds(row.settings.wordIds, stage.wordIds)) return { state: 'pending' };
    if (lcStageDone(stage, { [stage.id]: row.settings })) return { state: 'done' };
    const settings = {
      ...row.settings, complete: true, correct: summary.correct, wrong: summary.total - summary.correct,
      total: summary.total, completedAt: round.completedAt || new Date().toISOString(), roundId: round.id,
    };
    let saved;
    try {
      saved = await admin.from('game_settings').update({
        settings, updated_by: user.id,
        updated_at: new Date(Math.max(Date.now(), Date.parse(row.updated_at) + 1)).toISOString(),
      }).eq('game_id', row.game_id).eq('updated_at', row.updated_at).select('game_id').maybeSingle();
    } catch { return { state: 'pending' }; }
    const { data, error } = saved;
    if (error) return { state: 'pending' };
    if (data) return { state: 'done' };
  }
  return { state: 'pending' };
}

export function lcStageDescriptor(stage) {
  const { id, number, category, wordIds, total } = stage;
  return { id, number, category, wordIds, total };
}

export function requestedLcStage(pool, category, stageSize, id, ids) {
  const stages = lcStagesForCategory(pool, category, stageSize);
  const stage = stages.find(row => row.id === id);
  if (!stage || !sameIds(stage.wordIds, ids)) throw verifiedError('عدّل المعلم بعض كلمات المرحلة. حدّث القائمة وابدأ من جديد.', 409);
  return { stage, stages };
}
