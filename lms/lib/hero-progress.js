/* «عالم الأبطال» على الخادم: من إحصاءات hero_stats وصفوف avatar_items إلى ما يراه الطالب —
   القطع المملوكة (مع المكتسبة بالإنجاز)، الألقاب، المستوى، الحروف المتقنة، تحدّي الأسبوع، والبيضة. */
import {
  earnedAchievements, earnedItemKeys, levelOf, weeklyOf, weeklyProgress, weekStart,
  eggProgress, EGG_GOAL, activeSeasons, ACHIEVEMENTS,
} from './hero-catalog';

export async function loadHeroData(admin, userId, now = new Date()) {
  const [{ data: cfg }, { data: items }, { data: pts }] = await Promise.all([
    admin.from('hero_config').select('*').eq('user_id', userId).maybeSingle(),
    admin.from('avatar_items').select('item_id').eq('user_id', userId),
    admin.from('user_points').select('total').eq('user_id', userId).maybeSingle(),
  ]);
  const { data: stats } = await admin.rpc('hero_stats', {
    p_user: userId, p_week: weekStart(now).toISOString(), p_egg: cfg?.egg_started_at ?? null,
  });
  return { cfg: cfg ?? null, rows: (items ?? []).map(r => r.item_id), points: pts?.total ?? 0, stats: stats ?? {} };
}

export function heroSummary({ cfg, rows, stats, now = new Date() }) {
  const achievements = earnedAchievements(stats);
  const owned = [...new Set([...rows, ...earnedItemKeys(achievements)])];
  const w = weeklyOf(now);
  const hatched = rows.includes('pet:dragon');
  return {
    owned,
    achievements,
    title: cfg?.title && achievements.includes(cfg.title) ? cfg.title : null,
    level: levelOf(stats?.earned),
    earned: stats?.earned ?? 0,
    letters: Array.isArray(stats?.letters) ? stats.letters.filter(n => Number.isInteger(n) && n >= 0 && n < 28).sort((a, b) => a - b) : [],
    seasons: activeSeasons(now),
    weekly: { id: w.id, progress: weeklyProgress(stats, w), goal: w.goal, reward: w.reward, claimed: rows.includes(w.reward) },
    egg: { started: !!cfg?.egg_started_at && !hatched, progress: cfg?.egg_started_at ? eggProgress(stats) : 0, goal: EGG_GOAL, hatched },
  };
}

export const isAchievement = (id) => ACHIEVEMENTS.some(a => a.id === id);
