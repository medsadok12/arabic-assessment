// «أكتشف الأشياء» — محتوى مستقل في صف game_settings؛ لا يغيّر أي لعبة أخرى.
import { DEFAULT_DISCOVER_SOUND, normalizeDiscoverSound } from './discover-objects-sounds';
import { addDiscoverScenePack } from './discover-objects-scenes';
export const DISCOVER_ID = 'discover_objects';
export const DISCOVER_MEDIA = 'discover-objects/';
export const DISCOVER_STAFF = ['teacher', 'admin', 'super_admin'];
export const ART_TYPES = ['ball', 'flower', 'book', 'bird', 'can', 'image'];
export const cleanWord = value => String(value || '').normalize('NFKC').replace(/[\u0640\u064B-\u065F\u0670]/g, '').replace(/\s+/g, ' ').trim();
export const lettersOf = word => [...cleanWord(word)].filter(c => c !== ' ');
export const DEFAULT_DISCOVER = {
  title: 'أكتشف الأشياء', subtitle: 'أبحثُ مع فهيم، وأركّبُ الكلمات، وأفهمُ الجمل.',
  enabled: true, hints: true, showWord: true, build: true, read: true, pointsPerRound: 3,
  sounds: { ...DEFAULT_DISCOVER_SOUND },
  successMessage: 'رائع! كلُّ كلمةٍ جديدة تفتحُ لك عالمًا جديدًا.',
  retryMessage: 'محاولة جميلة! تأمّل الدليل وجرّب ثانية، أنت تستطيع.',
  scenes: [{
    id: 'garden', title: 'أسرار الحديقة', enabled: true, background: '', sky: '#b8e4ef', grass: '#d5e5a5',
    objects: [
      { id: 'ball', label: 'كرة', art: 'ball', image: '', x: 49, y: 79, size: 16 },
      { id: 'flower', label: 'زهرة', art: 'flower', image: '', x: 83, y: 78, size: 19 },
      { id: 'book', label: 'كتاب', art: 'book', image: '', x: 23, y: 51, size: 14 },
      { id: 'bird', label: 'عصفور', art: 'bird', image: '', x: 75, y: 43, size: 13 },
      { id: 'can', label: 'إبريق سقي', art: 'can', image: '', x: 18, y: 82, size: 18 },
    ],
    rounds: [
      { id: 'garden-ball', target: 'ball', word: 'كُرَة', clue: 'أبحثُ عن شيءٍ مستديرٍ، نركلُهُ بأقدامِنا ونلعبُ به. يبدأُ اسمُهُ بحرفِ الكافِ… أينَ هو؟', hint: 'هو على العشب، وله ألوانٌ جميلة. يبدأُ اسمه بحرف «ك».', audio: '', wordAudio: '', enabled: true, sentences: ['يَلْعَبُ رَاشِدٌ بِالْكُرَةِ.', 'يَشْرَبُ رَاشِدٌ الْكُرَةَ.', 'يَقْرَأُ رَاشِدٌ الْكُرَةَ.'], correct: 0 },
      { id: 'garden-flower', target: 'flower', word: 'زَهْرَة', clue: 'لي أوراقٌ خضراءُ، وبتلاتٌ ورديّةٌ جميلةٌ. أنمو في الحديقةِ، ويبدأُ اسمي بحرفِ الزايِ… من أنا؟', hint: 'أنا نبتةٌ ورديّة، ولستُ الشجرة. أوّلُ حروفي «ز».', audio: '', wordAudio: '', enabled: true, sentences: ['تَقْرَأُ مُنَى الزَّهْرَةَ.', 'تَشُمُّ مُنَى الزَّهْرَةَ.', 'تَرْكَلُ مُنَى الزَّهْرَةَ.'], correct: 1 },
      { id: 'garden-book', target: 'book', word: 'كِتَاب', clue: 'لي غلافٌ وصفحاتٌ، وفي داخلي كلماتٌ وحكاياتٌ. تجدُني على المقعدِ، ويبدأُ اسمي بحرفِ الكافِ… من أنا؟', hint: 'غلافي أزرقُ، وأنا فوق المقعد الخشبيّ. أوّلُ حروفي «ك».', audio: '', wordAudio: '', enabled: true, sentences: ['يَسْقِي سَامِي الْكِتَابَ.', 'يَرْكَلُ سَامِي الْكِتَابَ.', 'يَقْرَأُ سَامِي الْكِتَابَ.'], correct: 2 },
    ],
  }],
};
export const freshDiscover = () => addDiscoverScenePack(JSON.parse(JSON.stringify(DEFAULT_DISCOVER)));

// النصوص ليست HTML؛ الروابط ملفات من نطاق المنصة أو HTTPS فقط (بلا data/base64).
export function validDiscoverUrl(value) {
  if (value === '') return true;
  if (typeof value !== 'string' || value.length > 1800 || /[\s\\]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return !value.includes('..');
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; }
}
export function validateDiscover(raw) {
  const fail = error => ({ error });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('إعدادات غير صالحة');
  if (JSON.stringify(raw).length > 240000) return fail('المحتوى كبير — قلّل النصوص أو عدد المشاهد');
  const text = (v, max, required = false) => typeof v === 'string' && v.length <= max && (!required || v.trim().length > 0);
  if (!text(raw.title, 100, true) || !text(raw.subtitle, 400) || !text(raw.successMessage, 400, true) || !text(raw.retryMessage, 400, true)) return fail('راجع العنوان ورسائل التدريب');
  for (const k of ['enabled', 'hints', 'showWord', 'build', 'read']) if (typeof raw[k] !== 'boolean') return fail('إعدادات التشغيل غير صالحة');
  if (!Number.isInteger(raw.pointsPerRound) || raw.pointsPerRound < 0 || raw.pointsPerRound > 20) return fail('المكافأة من صفر إلى 20 نجمة لكل لغز');
  const sounds = normalizeDiscoverSound(raw.sounds);
  if (!sounds || !validDiscoverUrl(sounds.backgroundUrl) || !validDiscoverUrl(sounds.successUrl) || (sounds.background === 'custom' && !sounds.backgroundUrl) || (sounds.success === 'custom' && !sounds.successUrl)) return fail('راجع اختيارات الموسيقى وروابطها ومستويات الصوت');
  if (!Array.isArray(raw.scenes) || raw.scenes.length > 20) return fail('الحد الأقصى 20 مشهدًا');
  const scenePacks = raw.scenePacks === undefined ? [] : raw.scenePacks;
  if (!Array.isArray(scenePacks) || scenePacks.length > 10 || !scenePacks.every(p => typeof p === 'string' && /^[a-z0-9_-]{1,70}$/i.test(p))) return fail('معرّفات حزم المشاهد غير صالحة');
  const ids = new Set();
  const id = value => typeof value === 'string' && /^[a-z0-9_-]{1,70}$/i.test(value) && !ids.has(value) && (ids.add(value), true);
  const scenes = [];
  for (const s of raw.scenes) {
    if (!id(s.id) || !text(s.title, 100, true) || typeof s.enabled !== 'boolean' || !validDiscoverUrl(s.background) || !/^#[a-f\d]{6}$/i.test(s.sky) || !/^#[a-f\d]{6}$/i.test(s.grass)) return fail('راجع عنوان المشهد وخلفيته وألوانه ومعرّفه');
    if (!Array.isArray(s.objects) || s.objects.length > 30 || !Array.isArray(s.rounds) || s.rounds.length > 50) return fail('الحد الأقصى لكل مشهد: 30 شيئًا و50 لغزًا');
    const objIds = new Set();
    const objects = [];
    for (const o of s.objects) {
      if (typeof o.id !== 'string' || !/^[a-z0-9_-]{1,70}$/i.test(o.id) || objIds.has(o.id) || !text(o.label, 100, true) || !ART_TYPES.includes(o.art) || !validDiscoverUrl(o.image) || (o.art === 'image' && !o.image)) return fail('راجع أسماء الأشياء وصورها');
      if (!Number.isFinite(o.x) || !Number.isFinite(o.y) || !Number.isFinite(o.size) || o.size < 8 || o.size > 35 || o.x < o.size / 2 || o.x > 100 - o.size / 2 || o.y < o.size / 2 || o.y > 100 - o.size / 2) return fail('حرّك الشيء داخل حدود المشهد (الموضع والحجم)');
      objIds.add(o.id); objects.push({ id: o.id, label: o.label.trim(), art: o.art, image: o.image, x: o.x, y: o.y, size: o.size });
    }
    const rounds = [];
    for (const r of s.rounds) {
      const word = cleanWord(r.word);
      const wordAudio = r.wordAudio === undefined ? '' : r.wordAudio;
      if (!validDiscoverUrl(wordAudio)) return fail('رابط صوت الكلمة غير صالح');
      if (!id(r.id) || !objIds.has(r.target) || !text(r.word, 100, true) || !/^[\u0621-\u063A\u0641-\u064A\s]+$/.test(word) || lettersOf(word).length > 18 || !text(r.clue, 1000, true) || !text(r.hint, 600) || !validDiscoverUrl(r.audio) || typeof r.enabled !== 'boolean') return fail('راجع اللغز وكلمته العربية (حتى 18 حرفًا) والشيء المطلوب');
      if (!Array.isArray(r.sentences) || r.sentences.length < 2 || r.sentences.length > 5 || !r.sentences.every(t => text(t, 300, true)) || !Number.isInteger(r.correct) || r.correct < 0 || r.correct >= r.sentences.length || new Set(r.sentences.map(t => t.trim())).size !== r.sentences.length) return fail('لكل لغز جملتان إلى خمس جمل مختلفة، وحدّد الجملة الصحيحة');
      rounds.push({ id: r.id, target: r.target, word: r.word.trim(), clue: r.clue.trim(), hint: r.hint, audio: r.audio, wordAudio, enabled: r.enabled, sentences: r.sentences.map(t => t.trim()), correct: r.correct });
    }
    if (s.enabled && !rounds.some(r => r.enabled)) return fail('أضف لغزًا مفعّلًا للمشهد أو أخفِ المشهد');
    scenes.push({ id: s.id, title: s.title.trim(), enabled: s.enabled, background: s.background, sky: s.sky, grass: s.grass, objects, rounds });
  }
  return { config: { title: raw.title.trim(), subtitle: raw.subtitle, enabled: raw.enabled, hints: raw.hints, showWord: raw.showWord, build: raw.build, read: raw.read, pointsPerRound: raw.pointsPerRound, successMessage: raw.successMessage, retryMessage: raw.retryMessage, sounds, scenePacks: [...new Set(scenePacks)], scenes } };
}
export function playableDiscover(config) {
  return config.scenes.filter(s => s.enabled).flatMap(s => s.rounds.filter(r => r.enabled).map(r => ({ scene: s, round: r })));
}
export function checkDiscoverAnswer(config, body) {
  const entry = playableDiscover(config).find(x => x.round.id === body?.roundId);
  if (!entry || body.found !== entry.round.target) return false;
  if (config.build && lettersOf(body.word).join('') !== lettersOf(entry.round.word).join('')) return false;
  return !config.read || body.sentence === entry.round.correct;
}
