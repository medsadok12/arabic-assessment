import { normalizeLcCategory } from './letter-catcher-categories';
import { readLcStageContext } from './letter-catcher-stage-progress-server';
import { verifiedError } from './verified-training';

const prefix = userId => `lc-topic:${userId}:`;
const topicKey = (userId, category) => `${prefix(userId)}${encodeURIComponent(category)}`;
const sameIds = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((id, index) => String(id) === String(right[index]));

async function topicRows(admin, userId) {
  const rows = [];
  for (let offset = 0; offset < 10000; offset += 1000) {
    const { data, error } = await admin.from('game_settings').select('game_id, settings')
      .like('game_id', `${prefix(userId)}%`).order('game_id').range(offset, offset + 999);
    if (error) throw verifiedError('تعذّر عرض عوالمك. جرّب مرة أخرى.', 503);
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
  throw verifiedError('تعذّر عرض عوالمك. جرّب مرة أخرى.', 503);
}

// Old partial-stage results retain their existing access semantics, while a
// newly completed whole topic has its own durable completion receipt. Neither
// an enrollment nor a five-word stage becomes completion of a larger topic.
export async function readLcTopicContext(admin, user, userId, options = {}) {
  const [context, rows] = await Promise.all([
    readLcStageContext(admin, user, userId, options),
    options.preview ? [] : topicRows(admin, userId),
  ]);
  const topicProgress = {};
  for (const row of rows) {
    const saved = row.settings;
    if (!saved || saved.userId !== userId || saved.complete !== true || !saved.category || !Array.isArray(saved.wordIds) || !saved.wordIds.length) continue;
    const category = normalizeLcCategory(saved.category);
    if (row.game_id !== topicKey(userId, category)) continue;
    topicProgress[category] = {
      category, complete: true, wordIds: saved.wordIds, total: saved.total,
      correct: saved.correct, wrong: saved.wrong, completedAt: saved.completedAt,
    };
  }
  const unlocked = new Set(context.unlockedCategories);
  context.categories.forEach((category, index) => {
    if (options.preview || index === 0 || topicProgress[category]?.complete || topicProgress[context.categories[index - 1]]?.complete) unlocked.add(category);
  });
  return { ...context, topicProgress, unlockedCategories: context.categories.filter(category => unlocked.has(category)) };
}

export async function completeLcTopic(admin, user, round, summary) {
  const topic = round.lcWorld;
  if (!topic || !round.closed || !summary.complete || summary.done !== summary.total || summary.total !== topic.wordIds?.length || !sameIds(round.questions.map(question => question.id), topic.wordIds)) return { state: 'pending' };
  const key = topicKey(round.userId, topic.category);
  try {
    const { data: existing, error: readError } = await admin.from('game_settings').select('settings').eq('game_id', key).maybeSingle();
    if (readError) return { state: 'pending' };
    if (existing) return { state: existing.settings.userId === round.userId && existing.settings.category === topic.category && existing.settings.complete === true ? 'done' : 'pending' };
    const settings = {
      category: topic.category, userId: round.userId, owner: user.id, wordIds: topic.wordIds,
      total: summary.total, correct: summary.correct, wrong: summary.total - summary.correct,
      complete: true, completedAt: round.completedAt || new Date().toISOString(), roundId: round.id,
    };
    const { error } = await admin.from('game_settings').insert({ game_id: key, settings, updated_by: user.id, updated_at: new Date().toISOString() });
    if (!error) return { state: 'done' };
    if (error.code !== '23505') return { state: 'pending' };
    const { data: raced, error: raceError } = await admin.from('game_settings').select('settings').eq('game_id', key).maybeSingle();
    return { state: !raceError && raced?.settings.userId === round.userId && raced.settings.category === topic.category && raced.settings.complete === true ? 'done' : 'pending' };
  } catch {
    // The marker grants no points and is insert-once, so explicit and ambiguous
    // transport failures are safe to retry using the same completion receipt.
    return { state: 'pending' };
  }
}
