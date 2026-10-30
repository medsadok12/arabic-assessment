import {loadSentences,readSentenceRow} from './sentence-builder-server';
import {activeSentences,sentenceStamp,SENTENCE_ID} from './sentence-builder';
import {finiteProgress,unavailableProgress} from './library-progress';
import { PRACTICE_GAMES, practiceProgress, unknownProgress, discoverLibraryProgress, huroofLibraryProgress, puzzleLibraryProgress } from './library-progress';
import { loadDiscover, loadDiscoverSolved } from './discover-objects-server';
import { loadSolved } from './huroof-server';
import { HUROOF_COUNT, HUROOF_GAME_ID, normalizeHuroofSettings } from './huroof';

const rows = async query => { const { data, error } = await query; if (error) throw error; return data || []; };
// صفحات ذات ترتيب فريد ثابت؛ لا يتوقف التقدّم عند حد Supabase الافتراضي (1000).
async function paged(query) {
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await rows(query().range(offset, offset + 999)); result.push(...page);
    if (page.length < 1000) return result;
  }
}
export async function loadLibraryProgress(admin, userId) {
  const progress = {};
  const read = async (key, fn) => { try { progress[key] = await fn(); } catch { progress[key] = unknownProgress(); } };
  await Promise.all([
    read('sentence-builder',async()=>{
      const {config}=await loadSentences(admin);if(!config.enabled)return unavailableProgress();
      const items=activeSentences(config),row=await readSentenceRow(admin,`${SENTENCE_ID}:progress:${userId}:${config.epoch}`);
      const done=new Set((row?.settings.completed||[]).filter(e=>items.some(item=>item.id===e.id&&sentenceStamp(item)===e.stamp)).map(e=>e.id));
      return finiteProgress(done.size,items.length,'جملة',Boolean(row));
    }),
    read('discover-objects', async () => {
      const { config } = await loadDiscover(admin);
      return discoverLibraryProgress(config, config.enabled ? await loadDiscoverSolved(admin, userId, config) : []);
    }),
    read('huroof', async () => {
      const { data, error } = await admin.from('game_settings').select('settings').eq('game_id', HUROOF_GAME_ID).maybeSingle();
      if (error) throw error;
      const settings = normalizeHuroofSettings(data?.settings);
      return huroofLibraryProgress(await loadSolved(admin, userId, settings.epoch), HUROOF_COUNT, settings.mode);
    }),
    read('puzzle', async () => {
      const [puzzles, progress] = await Promise.all([
        paged(() => admin.from('puzzles').select('id').eq('is_active', true).order('id')),
        paged(() => admin.from('puzzle_progress').select('id, puzzle_id, unlocked, completed_at').eq('user_id', userId).order('id')),
      ]);
      return puzzleLibraryProgress(puzzles, progress);
    }),
    read('flashcards', async () => {
      const data = await paged(() => admin.from('flashcard_progress').select('word_id').eq('user_id', userId).order('word_id'));
      const count = new Set(data.map(r => r.word_id).filter(Boolean)).size;
      return practiceProgress(count > 0, `راجعت ${count} كلمة`, 'بطاقات مراجعة متجددة؛ عدد الكلمات التي راجعتها لا يعني إتقانها جميعًا.');
    }),
    ...Object.entries(PRACTICE_GAMES).map(([key, gameId]) => read(key, async () => practiceProgress((await rows(admin.from('game_results').select('game_id').eq('user_id', userId).eq('game_id', gameId).limit(1))).length > 0))),
    ...[['challenge', 'challenge\\_%'], ['literature', 'scene\\_story:%']].map(([key, pattern]) => read(key, async () => practiceProgress((await rows(admin.from('points_log').select('reason').eq('user_id', userId).like('reason', pattern).limit(1))).length > 0))),
  ]);
  return progress;
}
