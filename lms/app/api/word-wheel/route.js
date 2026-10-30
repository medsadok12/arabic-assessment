import { createAdminClient } from '../../../lib/supabase-admin';
import { json, loadGamePayload } from '../../../lib/word-wheel-server';
import { normalizeGlobalConfig, defaultChallengeRows, wheelForPlay, resolveTheme } from '../../../lib/word-wheel';

// المعلم يعدّل العجلات والبطاقات من اللوحة، فالقراءة حيّة دائماً (القسم 9.5)
export const dynamic = 'force-dynamic';

// GET — كل ما يحتاجه الطفل للعب في طلب واحد: العجلات الظاهرة بأنماطها الثلاثة،
// بطاقات كلماتها (صورة/تشكيل/صوت/شرح/تلميح)، والإعدادات والمظهر العامّان
export async function GET() {
  try {
    return json(await loadGamePayload(createAdminClient()));
  } catch {
    const global = normalizeGlobalConfig(null);
    const wheels = defaultChallengeRows().map(r => wheelForPlay(r, global)).filter(Boolean)
      .map(w => ({ ...w, words: w.words.map(x => x.word) }));
    const { theme, ...settings } = global;
    return json({ wheels, cards: {}, settings, theme: resolveTheme(theme), fallback: true });
  }
}
