// حالات عرض فقط؛ لا تمنح نقاطًا ولا تغيّر سجلًا أو تقرر الإتقان.
import { discoverJourney } from './discover-objects-journey';
export const PRACTICE_GAMES = {
  'vowel-balloon': 'vowel_balloon', 'letter-catcher': 'letter_catcher',
  'word-scramble': 'word_scramble', 'word-image-match': 'word_image_match',
  'word-smash': 'word_smash', 'word-wheel': 'word_wheel',
};
export const unknownProgress = () => ({ status: 'unknown', label: 'تعذّر تحميل التقدّم', detail: 'إنجازاتك محفوظة. أعد المحاولة لعرضها.' });
export const unavailableProgress = () => ({ status: 'unavailable', label: 'غير متاح حاليًا', detail: 'لا يوجد محتوى مفعّل لهذا المسار الآن.' });
export function practiceProgress(started, label = 'تدرّبت هنا', detail = 'تدريب متجدد؛ المشاركة فيه لا تعني إكمال جميع محتواه.') {
  return { status: started ? 'practiced' : 'not-started', label: started ? label : 'ابدأ رحلتك', detail: started ? detail : 'اكتشاف جديد ينتظرك!' };
}
export function finiteProgress(completed, total, unit, started = false) {
  if (!Number.isInteger(total) || total <= 0) return unavailableProgress();
  const done = Math.max(0, Math.min(total, completed));
  const status = done === total ? 'completed' : done > 0 || started ? 'in-progress' : 'not-started';
  // لا نعرض 100% قبل آخر عنصر، حتى لو قرّب الحساب 99.9% إلى 100.
  return { status, completed: done, total, percent: done === total ? 100 : Math.floor(done / total * 100),
    label: status === 'completed' ? 'أكملت التدريب' : status === 'not-started' ? 'ابدأ رحلتك' : `${done} من ${total} ${unit}`,
    detail: `أكملت ${done} من ${total} ${unit} من المحتوى المتاح حاليًا.` };
}
export function discoverLibraryProgress(config, solved) {
  if (!config.enabled) return unavailableProgress();
  const path = discoverJourney(config, solved);
  const result = finiteProgress(path.reduce((n, s) => n + s.solved, 0), path.reduce((n, s) => n + s.total, 0), 'لغزًا');
  const scenesCompleted = path.filter(s => s.complete).length;
  return { ...result, scenesCompleted, scenesTotal: path.length,
    detail: `${result.detail} المشاهد المكتملة: ${scenesCompleted} من ${path.length}.` };
}
export function huroofLibraryProgress(solved, total, mode) {
  const ids = new Set(solved.map(r => r.idx).filter(n => Number.isInteger(n) && n >= 0 && n < total));
  if (mode === 'explore') return practiceProgress(ids.size > 0, 'تدرّبت هنا', 'وضع الاستكشاف مفتوح؛ إكمال التحدّي يُحسب في وضع التحدّي فقط.');
  return finiteProgress(ids.size, total, 'حرفًا');
}
export function puzzleLibraryProgress(puzzles, progress) {
  const active = new Set(puzzles.map(p => p.id));
  const rows = progress.filter(p => active.has(p.puzzle_id));
  const done = new Set(rows.filter(p => p.completed_at).map(p => p.puzzle_id));
  return finiteProgress(done.size, active.size, 'أحجية', rows.some(p => Array.isArray(p.unlocked) && p.unlocked.length > 0));
}
export function libraryOverview(resources, progress) {
  const available = resources.filter(r => r.ready);
  const completed = available.filter(r => progress[r.key]?.status === 'completed');
  const continuing = available.filter(r => progress[r.key]?.status === 'in-progress');
  const practiced = available.filter(r => progress[r.key]?.status === 'practiced');
  const next = continuing[0] || available.find(r => progress[r.key]?.status === 'not-started') || practiced[0] || completed[0];
  return { completed: completed.length, continuing: continuing.length, practiced: practiced.length, next,
    hasProgress: completed.length + continuing.length + practiced.length > 0 };
}
