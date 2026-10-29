import { SCRABBLE_THEMES } from './scrabble-themes';
import { SCRABBLE_LEVELS } from './scrabble-levels';
// منطق السكرابل الصغير؛ الحروف العربية محفوظة بلا تحويل الهمزات.
export const SCRABBLE_ID = 'scrabble';
export const SCRABBLE_STAFF = ['teacher', 'admin', 'super_admin'];
export const cleanWord = s => String(s || '').normalize('NFKC').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640\s]/g, '');
export const lettersOf = s => [...cleanWord(s)];
export const scrabbleUuid = s => typeof s === 'string' && /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(s);
export function wordCells(word, size) {
  return lettersOf(word.word).map((char, i) => ({ pos: (word.row + (word.direction === 'down' ? i : 0)) * size + word.col - (word.direction === 'across' ? i : 0), char }));
}
export function boardBefore(board, index) {
  const cells = {};
  for (const w of [...board.seed, ...board.rounds.slice(0, index)]) for (const c of wordCells(w, board.size)) cells[c.pos] = c.char;
  return cells;
}
// ألوان ثابتة لكل كلمة مكتملة؛ التقاطع يحتفظ بألوان كل كلماته.
const WORD_COLORS = ['#ffe1a3','#bde8dc','#c8dffa','#f6cddd','#d9cff4','#dceaaf','#facdb5','#bfe8ed','#f1d8b5','#d1e4cb','#d4d0ed','#f3d8a5'];
export function scrabbleWordPaint(board, completed) {
  const memberships = {};
  const words = [...board.seed, ...board.rounds];
  const visibleCount = board.seed.length + Math.max(0, Math.min(completed, board.rounds.length));
  words.slice(0, visibleCount).forEach((word, i) => {
    const color = WORD_COLORS[i % WORD_COLORS.length];
    for (const {pos} of wordCells(word, board.size)) {
      memberships[pos] ||= [];
      if (!memberships[pos].includes(color)) memberships[pos].push(color);
    }
  });
  return Object.fromEntries(Object.entries(memberships).map(([pos, colors]) => [pos,
    colors.length === 1 ? colors[0] : `linear-gradient(135deg, ${colors.map((c,i) => `${c} ${i/colors.length*100}% ${(i+1)/colors.length*100}%`).join(', ')})`
  ]));
}
export function roundNeeds(board, index) {
  const before = boardBefore(board, index);
  return wordCells(board.rounds[index], board.size).filter(c => !before[c.pos]);
}
export function checkScrabbleAnswer(board, index, placements) {
  const needs = roundNeeds(board, index), round = board.rounds[index];
  if (!Array.isArray(placements) || placements.length !== needs.length) return { error: 'أكمل حروف الكلمة أولًا.' };
  const seen = new Set(), tiles = [...needs.map(n => n.char), ...lettersOf(round.distractors)];
  for (const p of placements) {
    if (!p || !Number.isInteger(p.pos) || !needs.some(n => n.pos === p.pos) || seen.has(p.pos) || typeof p.char !== 'string' || lettersOf(p.char).length !== 1 || p.char !== cleanWord(p.char)) return { error: 'ضع الحروف في أماكن الكلمة.' };
    const at = tiles.indexOf(p.char); if (at < 0) return { error: 'استخدم حروف الجولة فقط.' };
    tiles.splice(at, 1); seen.add(p.pos);
  }
  return { right: needs.every(n => placements.some(p => p.pos === n.pos && p.char === n.char)) };
}
const round = (id, word, emoji, row, col, distractors = '') => ({ id, word, vocalized: word, emoji, row, col, direction: 'down', distractors, image_url: '', audio_url: '', enabled: true, motion: 'bloom' });
export function legacyScrabble() {
  const rounds = [round('door', 'باب', '🚪', 2, 2), round('fish', 'سمك', '🐟', 0, 5), round('berry', 'توت', '🫐', 2, 4, 'ر'), round('home', 'دار', '🏠', 1, 3, 'ب')];
  rounds.forEach((r, i) => { r.vocalized = ['بابٌ','سَمَكٌ','توتٌ','دارٌ'][i]; r.motion = ['door','swim','bloom','house'][i]; });
  return { enabled: true, title: 'سكرابل الصغار', epoch: 0, curriculum: 1,
    settings: { backgroundOpacity:14, helpCost: 5, reward: 3, errorMs: 1700, pictureSize: 100, letterSize: 32, animate: true, stars: true, sound: true, showWord: true,
      background: '#fffaf0', ink: '#244d40', grid: '#e9efdf', tile: '#ffe1a3', edge: '#c4d5b5', purple: '#7339ba', purpleSoft: '#f1e5ff', success: '#356e4e', error: '#c02a38', errorBackground: '#ffe3e6',
      startText: 'اختر حرفًا 👇', placeText: 'اضغط المربع البنفسجي 👆', continueText: 'أكمل الكلمة 👇', successText: 'أحسنت! 🌸', retryText: 'حاول من جديد 🌱', errorText: 'خطأ', nextText: 'نكمل؟ ←', helpText: '💡 ساعدني', againText: 'نلعب من جديد ↻' },
    boards: [{ backgroundTheme:'auto', id: 'first-garden', title: 'كلماتي الأولى', theme: 'first-garden', themeTitle: 'كلماتي الأولى', themeEmoji: '🧩', enabled: true, size: 6, seed: [{ word: 'كتاب', row: 2, col: 5, direction: 'across' }], rounds }] };
}
export function freshScrabble() {
  const config = legacyScrabble();
  config.curriculum = 2;
  config.boards = structuredClone(SCRABBLE_LEVELS).map(b=>({...b,backgroundTheme:'auto'}));
  return config;
}
// كل خانة مرئية لها حرف معروف في إحدى كلمات اللوحة؛ لا مربعات زينة فارغة.
export function scrabblePlan(board) {
  const cells = {};
  for (const word of [...board.seed, ...board.rounds]) for (const cell of wordCells(word, board.size)) cells[cell.pos] = cell.char;
  return cells;
}
export function scrabbleBoardFilled(board, cursor, placements = []) {
  if (cursor !== board.rounds.length) return false;
  const actual = { ...boardBefore(board, cursor), ...Object.fromEntries(placements.map(p => [p.pos, p.char])) };
  return Object.entries(scrabblePlan(board)).every(([pos, char]) => actual[pos] === char);
}
export function withScrabbleCurriculum(config) {
  if (config.curriculum >= 2) return config;
  const original = legacyScrabble().boards[0];
  const stock = config.boards.length === 1 && config.boards[0].id === original.id && config.boards[0].title === original.title && config.boards[0].size === original.size && config.boards[0].enabled === original.enabled && JSON.stringify(config.boards[0].seed) === JSON.stringify(original.seed) && config.boards[0].rounds.length === original.rounds.length && config.boards[0].rounds.every((w,i) => ['id','word','row','col','direction','enabled'].every(k => w[k] === original.rounds[i][k]));
  const media = new Map(config.boards.flatMap(b => b.rounds).map(w => [cleanWord(w.word),w]));
  const added = structuredClone(SCRABBLE_LEVELS).map(b => ({...b,rounds:b.rounds.map(w => {const old=media.get(cleanWord(w.word));return old ? {...w,image_url:old.image_url||w.image_url||'',audio_url:old.audio_url||'',vocalized:old.vocalized||w.vocalized} : w})}));
  // نرقي المثال القديم فقط إن بقي تخطيطه الأصلي؛ لوحات المعلم المخصصة لا تُمحى.
  const existing = stock ? [] : config.boards;
  const ids = new Set(existing.map(b => b.id));
  return {...config,curriculum:2,boards:[...existing,...added.filter(b => !ids.has(b.id))]};
}
const safeUrl = s => typeof s === 'string' && s.length < 1500 && (!s || /^https:\/\/[^\s]+$/.test(s) || /^\/(?!\/)[^\s]+$/.test(s));
const fail = error => ({ error });
export function validateScrabble(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('إعدادات غير صالحة.');
  const config = freshScrabble();
  if (typeof input.enabled !== 'boolean' || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 80) return fail('اكتب عنوانًا وحدّد تفعيل اللعبة.');
  config.enabled = input.enabled; config.title = input.title.trim();
  if (!Number.isInteger(input.epoch) || input.epoch < 0 || input.epoch > 100000) return fail('رقم جولة التقدّم غير صالح.');
  config.epoch = input.epoch;
  if (input.curriculum != null && ![1,2].includes(input.curriculum)) return fail('إصدار المستويات غير صالح.');
  config.curriculum = input.curriculum ?? 1;
  const s = input.settings;
  if (!s || typeof s !== 'object') return fail('إعدادات المظهر مطلوبة.');
  if(s.backgroundOpacity!=null&&(!Number.isInteger(s.backgroundOpacity)||s.backgroundOpacity<0||s.backgroundOpacity>25))return fail('وضوح الخلفية من 0 إلى 25.');
  config.settings.backgroundOpacity=s.backgroundOpacity??14;
  for (const [key, min, max] of [['helpCost',0,1000],['reward',0,50],['errorMs',700,5000],['pictureSize',70,160],['letterSize',24,44]]) {
    if (!Number.isInteger(s[key]) || s[key] < min || s[key] > max) return fail(`قيمة غير صالحة: ${key}`);
    config.settings[key] = s[key];
  }
  for (const key of ['animate','stars','sound','showWord']) { if (typeof s[key] !== 'boolean') return fail('راجع خيارات الحركة والصوت.'); config.settings[key] = s[key]; }
  for (const key of ['background','ink','grid','tile','edge','purple','purpleSoft','success','error','errorBackground']) { if (!/^#[\da-f]{6}$/i.test(s[key])) return fail('استعمل ألوانًا صالحة.'); config.settings[key] = s[key]; }
  for (const key of ['startText','placeText','continueText','successText','retryText','errorText','nextText','helpText','againText']) { if (typeof s[key] !== 'string' || !s[key].trim() || s[key].length > 100) return fail('النصوص مطلوبة وبحد أقصى 100 حرف.'); config.settings[key] = s[key].trim(); }
  if (!Array.isArray(input.boards) || !input.boards.length || input.boards.length > 80) return fail('أضف من لوحة إلى 80 لوحة.');
  config.boards = []; const ids = new Set();
  for (const b of input.boards) {
    if (!b || !/^[a-zA-Z0-9_-]{1,64}$/.test(b.id) || ids.has(b.id) || typeof b.title !== 'string' || !b.title.trim() || b.title.length > 80 || typeof b.enabled !== 'boolean' || !Number.isInteger(b.size) || b.size < 4 || b.size > 7) return fail('تحقّق من اسم اللوحة ومعرّفها وحجمها (4 إلى 7).');
    if(b.backgroundTheme!=null&&!['auto','none',...SCRABBLE_THEMES.map(([id])=>id)].includes(b.backgroundTheme))return fail('اختر خلفية متاحة للّوحة.');
    ids.add(b.id);
    if (!Array.isArray(b.seed) || !b.seed.length || b.seed.length > 8 || !Array.isArray(b.rounds) || !b.rounds.length || b.rounds.length > 20) return fail('كل لوحة تحتاج كلمة بداية ومن 1 إلى 20 كلمة.');
    const out = { backgroundTheme:b.backgroundTheme??'auto', id: b.id, title: b.title.trim(), theme: typeof b.theme==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(b.theme)?b.theme:b.id, themeTitle: typeof b.themeTitle==='string'&&b.themeTitle.trim()&&b.themeTitle.length<=80?b.themeTitle.trim():b.title.trim(), themeEmoji: typeof b.themeEmoji==='string'&&b.themeEmoji.length<=16?b.themeEmoji:'🧩', enabled: b.enabled, size: b.size, seed: [], rounds: [] }, cells = {}, roundIds = new Set();
    for (const [kind, list] of [['seed',b.seed],['rounds',b.rounds]]) for (const w of list) {
      const chars = lettersOf(w?.word);
      if (chars.length < 2 || chars.length > b.size || chars.some(c => !/^[\u0621-\u063a\u0641-\u064a]$/.test(c)) || !['across','down'].includes(w.direction) || !Number.isInteger(w.row) || !Number.isInteger(w.col) || w.row < 0 || w.col < 0 || w.row >= b.size || w.col >= b.size || (w.direction === 'across' ? w.col - chars.length + 1 < 0 : w.row + chars.length > b.size)) return fail(`كلمة أو موقع خارج اللوحة: ${w?.word || ''}`);
      const next = { word: w.word.trim(), row: w.row, col: w.col, direction: w.direction };
      if (kind === 'rounds') {
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(w.id) || roundIds.has(w.id) || typeof w.enabled !== 'boolean' || !safeUrl(w.image_url) || !safeUrl(w.audio_url) || typeof w.emoji !== 'string' || w.emoji.length > 16 || typeof w.vocalized !== 'string' || w.vocalized.length > 60 || cleanWord(w.vocalized) !== cleanWord(w.word) || typeof w.distractors !== 'string' || lettersOf(w.distractors).length > 3 || lettersOf(w.distractors).some(c => !/^[\u0621-\u063a\u0641-\u064a]$/.test(c)) || !['door','swim','bloom','house','none'].includes(w.motion)) return fail(`راجع صورة وصوت وتشكيل ومعرّف كلمة: ${w.word}`);
        roundIds.add(w.id); Object.assign(next, { id: w.id, enabled: w.enabled, image_url: w.image_url, audio_url: w.audio_url, emoji: w.emoji, vocalized: w.vocalized, distractors: w.distractors, motion: w.motion });
      }
      const positions = wordCells(next,b.size), shared = positions.filter(c => cells[c.pos]);
      if (positions.some(c => cells[c.pos] && cells[c.pos] !== c.char)) return fail(`تقاطع حروف متعارض في كلمة: ${w.word}`);
      if (kind === 'rounds' && (!shared.length || shared.length === chars.length)) return fail(`كلمة «${w.word}» يجب أن تشترك بحرف وتضيف حرفًا جديدًا.`);
      positions.forEach(c => { cells[c.pos] = c.char; }); out[kind].push(next);
    }
    config.boards.push(out);
  }
  return { config };
}
export function playableBoards(config) {
  return config.boards.filter(b => b.enabled).map(b => {
    const seed = [...b.seed], rounds = [];
    // الكلمات المعطّلة تبقى حروفها مثبتة كي لا ينكسر التقاطع التالي.
    for (const r of b.rounds) { if (!r.enabled) seed.push(r); else rounds.push(r); }
    return { ...b, seed, rounds: rounds.filter((r,i) => roundNeeds({ ...b, seed, rounds },i).length > 0) };
  }).filter(b => b.rounds.length);
}
// getRandomValues متاح أيضًا في المعاينات HTTP؛ randomUUID يتطلب سياق HTTPS.
export function scrabbleRequestId(source = globalThis.crypto) {
  if (source?.randomUUID) return source.randomUUID();
  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const h = Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
