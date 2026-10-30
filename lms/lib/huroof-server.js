/* ════════════════════════════════════════════════════════════════
   تحدّي «الحروف الهجائية» على الخادم: الحروف بعد دمج تعديلات المعلم، إعدادات التحدّي،
   وتقدّم الطالب في الجولة الحالية. كل الوصول بـ service_role (RLS يمنع غيره).
════════════════════════════════════════════════════════════════ */
import { HUROOF_COLUMNS, HUROOF_GAME_ID, mergeLetters, normalizeHuroofSettings } from './huroof';

export const HUROOF_SELECT = HUROOF_COLUMNS.join(', ');

export async function loadHuroofRows(admin) {
  const { data, error } = await admin.from('huroof_letters').select(HUROOF_SELECT).order('idx');
  if (error) throw error;
  return data || [];
}

export async function loadHuroofLetters(admin) {
  return mergeLetters(await loadHuroofRows(admin));
}

export async function loadHuroofSettings(admin) {
  const { data } = await admin.from('game_settings').select('settings').eq('game_id', HUROOF_GAME_ID).maybeSingle();
  return normalizeHuroofSettings(data?.settings);
}

export async function saveHuroofSettings(admin, settings, userId) {
  const { error } = await admin.from('game_settings').upsert(
    { game_id: HUROOF_GAME_ID, settings, updated_at: new Date().toISOString(), updated_by: userId },
    { onConflict: 'game_id' },
  );
  if (error) throw error;
  return settings;
}

/* الحروف التي حلّها الطالب في الجولة: [{ idx, solved_at }] بترتيب الحلّ */
export async function loadSolved(admin, userId, epoch) {
  const { data, error } = await admin
    .from('huroof_progress').select('idx, solved_at')
    .eq('user_id', userId).eq('epoch', epoch)
    .order('solved_at', { ascending: true });
  if (error) throw error;
  return data || [];
}
