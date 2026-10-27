import { VERIFIED_GAMES, applyTrainingEvent, trainingSummary, trainingStars, verifiedError } from './verified-training';
import { scrambleId } from './verified-scramble';
import { deliverVerifiedEffect, awardVerifiedPoints } from './verified-effects';
import { normalizeGlobalConfig, wheelForPlay, defaultChallengeRows, cardFor, missingIndex } from './word-wheel';
import { normalizeLcSettings, roundSize, letterCount, LEN_NO_LIMIT } from './letter-catcher';
import { randomUUID } from 'node:crypto';
const tables = { letter_catcher: 'letter_catcher_words', vowel_balloon: 'vowel_balloon_games', word_smash: 'syllable_games', word_image_match: 'word_image_matches' };
const key = (game, id) => `verified:round:${game}:${id}`;
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
async function read(admin, id) { const { data, error } = await admin.from('game_settings').select('game_id, settings, updated_at').eq('game_id', id).maybeSingle(); if (error) throw verifiedError('تعذّر فتح التدريب. أعد المحاولة.', 503); return data; }
async function cas(admin, row, settings) {
  const { data, error } = await admin.from('game_settings').update({ settings, updated_at: new Date(Math.max(Date.now(), Date.parse(row.updated_at) + 1)).toISOString() }).eq('game_id', row.game_id).eq('updated_at', row.updated_at).select('game_id, settings, updated_at').maybeSingle();
  if (error) throw verifiedError('تعذّر تأكيد الحفظ. أعد المحاولة.', 503); return data;
}
const own = (row, user, id) => { if (!row || row.settings.owner !== user.id || row.settings.userId !== id) throw verifiedError('هذه الجولة غير متاحة لهذا الطفل.', 404); return row.settings; };
const safeItem = item => Object.fromEntries(Object.entries(item).filter(([, v]) => typeof v !== 'string' || !v.startsWith('data:') || v.length < 8192));
function publicRound(r, items = r.items) { return { roundId: r.id, preview: r.preview, game: r.game, items, wheel: r.wheel, category: r.category, summary: trainingSummary(r), answers: r.answers, clock: r.clock, pointsPerWord: r.points, stars: trainingStars(r), snapshot: r }; }
async function sourceRows(admin, table) {
  let rows = [];
  for (let offset = 0; offset < 3000; offset += 1000) {
    const { data, error } = await admin.from(table).select('*').order('id').range(offset, offset + 999);
    if (error) throw verifiedError('تعذّر تجهيز المحتوى. جرّب مرة أخرى.', 503);
    rows.push(...(data || [])); if (!data || data.length < 1000) return rows;
  }
  throw verifiedError('اختر فصلًا أو مستوى لجولة أخفّ.');
}
export async function startTraining(admin, user, userId, body, preview) {
  const game = body.game;
  if (!VERIFIED_GAMES.includes(game) || !scrambleId(body.roundId)) throw verifiedError('ابدأ التدريب من صفحته.');
  const existing = preview ? null : await read(admin, key(game, body.roundId));
  if (existing) {const saved=own(existing,user,userId);if(saved.expiresAt<Date.now())throw verifiedError('انتهت مهلة الجولة. ابدأ جولة جديدة.',409);return publicRound(saved);}
  let items, questions, wheel, clock, points = 5, category = typeof body.category === 'string' ? body.category : 'عام', bonus = 0;
  if (category.length > 160) throw verifiedError('اختر الفصل من جديد.');
  if (game === 'word_wheel') {
    // قراءة صارمة: لا نحول خطأ القاعدة إلى محتوى افتراضي يمنح مكافآت.
    const [config, rows] = await Promise.all([read(admin,'word-wheel'),sourceRows(admin,'word_wheel_configs')]);
    const global = normalizeGlobalConfig(config?.settings);
    let wheels=rows.filter(r=>r.is_active).map(r=>wheelForPlay(r,global)).filter(Boolean);
    if(!wheels.some(w=>w.mode==='challenge'))wheels=wheels.concat(defaultChallengeRows().map(r=>wheelForPlay(r,global)).filter(Boolean));
    wheel = wheels.find(w => String(w.id) === String(body.wheelId));
    if (!wheel) throw verifiedError('هذه العجلة غير متاحة الآن.');
    wheel = structuredClone(wheel);
    const {data:bankRows,error:bankError}=await admin.from('word_wheel_words').select('*').in('word',wheel.words.map(x=>x.word));if(bankError)throw verifiedError('تعذّر تجهيز بطاقات الكلمات.',503);
    const bank=Object.fromEntries((bankRows||[]).map(r=>[r.word,r]));
    items=wheel.words.map(x=>({id:x.word,word:x.word,card:cardFor(x.word,bank,x.image)}));
    wheel.words=wheel.words.map(x=>x.word);
    if(wheel.mode==='complete'&&wheel.settings.complete_style==='missing')wheel.missingIndices=Object.fromEntries(wheel.words.map(w=>[w,missingIndex(w)]));
    if (wheel.settings.shuffle_words && wheel.mode !== 'challenge') { wheel.words=shuffle(wheel.words);items=wheel.words.map(w=>items.find(x=>x.word===w)); }
    points = global.points_per_word || 0; bonus = global.win_points || 0; category = wheel.name;
    questions = items.map(i => ({ id: i.id, expected: i.word }));
    clock = { started: false, running: false, left: wheel.time * 1000, at: Date.now() };
  } else {
    const f = body.filters || {}, grade = Number(f.grade || 0);
    if (!Number.isInteger(grade) || grade < 0 || grade > 12 || (f.topic && (typeof f.topic !== 'string' || f.topic.length > 120))) throw verifiedError('اختر إعدادات التدريب من جديد.');
    let pool = await sourceRows(admin, tables[game]);
    pool = pool.filter(r => (!grade || Number(r.grade_level) === grade) && (!f.topic || r.topic === f.topic));
    if (game === 'letter_catcher') {
      const min = Number(f.minLen || 0), max = Number(f.maxLen || LEN_NO_LIMIT);
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min || max > 200) throw verifiedError('اختر طول الكلمات من جديد.');
      pool = pool.filter(r => r.word && r.missing_letter && Array.isArray(r.options) && r.options.filter(Boolean).length && (category === '__all__' || r.category === category) && letterCount(r.word) >= min && (max >= LEN_NO_LIMIT || letterCount(r.word) <= max));
    } else if (game === 'word_smash') pool = pool.filter(r => r.word_text && r.correct_segments?.length && r.wrong_options?.length >= 2 && r.rule_text && (category === 'عام' || r.topic === category));
    else if (game === 'word_image_match') pool = pool.filter(r => r.word_text && r.image_url && (r.topic || 'عام') === category);
    else pool = pool.filter(r => r.target_text && r.correct_option && r.rule_text);
    const ids = body.ids;
    if (!Array.isArray(ids) || !ids.length || ids.length > 1000 || ids.some(x => !['number', 'string'].includes(typeof x))) throw verifiedError('اختر أسئلة التدريب من جديد.');
    const byId = new Map(pool.map(r => [String(r.id), r]));
    items = ids.map(id => byId.get(String(id)));
    if (items.some(x => !x)) throw verifiedError('عدّل المعلم بعض المحتوى. حدّث القائمة وابدأ من جديد.', 409);
    if (!preview && new Set(ids.map(String)).size !== ids.length) throw verifiedError('لا نكرر السؤال في الجولة نفسها.');
    if (!preview) {
      let expected;
      if (game === 'letter_catcher') {
        const row = await read(admin, 'letter-catcher'); expected = roundSize(pool.length, normalizeLcSettings(row?.settings).words_per_round);
      } else if (game === 'word_image_match') expected = Math.min(pool.length, 4);
      else if (game === 'word_smash') expected = Math.min(pool.length, category === 'عام' ? 15 : 12);
      else expected = pool.length;
      if (items.length !== expected) throw verifiedError('تغيّر عدد أسئلة الجولة. حدّث القائمة وابدأ من جديد.', 409);
    }
    items = items.map(r => ({ ...r, id: String(r.id) }));
    questions = items.map(r => ({ id: r.id, expected: game === 'letter_catcher' ? r.missing_letter : game === 'vowel_balloon' ? r.correct_option : game === 'word_smash' ? r.correct_segments : r.id }));
  }
  if (!questions.length) throw verifiedError('لا يوجد محتوى مفعّل لهذه الجولة.');
  const round = { id: body.roundId, game, userId, owner: user.id, preview, category, revision: 0, items: items.map(safeItem), questions, wheel, clock,
    points, bonus, hints: 0, answers: questions.map(() => ({ done: false, right: false, wrong: 0, hints: 0, status: 'play' })),
    events: [], closed: false, expiresAt: Date.now() + 86400000 };
  if (!preview) {
    const { error } = await admin.from('game_settings').insert({ game_id: key(game, round.id), settings: round, updated_by: user.id, updated_at: new Date().toISOString() });
    if (error?.code === '23505') return publicRound(own(await read(admin, key(game, round.id)), user, userId));
    if (error) throw verifiedError('تعذّر بدء الجولة. أعد المحاولة.', 503);
  }
  return publicRound(round, items);
}
async function effects(admin, user, r, event, repeated) {
  const summary = trainingSummary(r), prefix = `verified:${r.game}:${r.id}`;
  let award = { state: 'none' }, bonus = { state: 'none' }, result = { state: 'none' };
  if (event.reward > 0) award = await deliverVerifiedEffect(admin, `${prefix}:reward:${event.index}`, user.id, () => awardVerifiedPoints(admin, r.userId, `${r.game}:${r.id}:${event.index}`, event.reward));
  if (r.closed) {
    if (r.bonus && trainingStars(r) > 0) bonus = await deliverVerifiedEffect(admin, `${prefix}:bonus`, user.id, () => awardVerifiedPoints(admin, r.userId, `word_wheel_win:${r.id}`, r.bonus));
    result = await deliverVerifiedEffect(admin, `${prefix}:result`, user.id, async () => {
      const { error } = await admin.from('game_results').insert({ user_id: r.userId, game_id: r.game, category: r.category, correct: summary.correct, wrong: summary.total - summary.correct, total: summary.total });
      return { state: error ? 'pending' : 'done' };
    });
  }
  return { verified: true, right: event.right, questionDone: event.done, outcome: event.status, expired: event.expired, message: event.message,
    summary, answers: r.answers, clock: r.clock, reward: award.state, result: result.state, bonus: bonus.state,
    awarded: !repeated && award.state === 'done' ? event.reward : 0, points: bonus.points ?? award.points, stars: trainingStars(r), repeated };
}
export async function trainingEvent(admin, user, userId, body) {
  let recorded;
  for (let tries = 0; tries < 5; tries++) {
    const row = await read(admin, key(body.game, body.roundId)), r = own(row, user, userId);
    if (r.expiresAt < Date.now() && !r.events.some(e => e.id === body.eventId)) throw verifiedError('انتهت مهلة الجولة. ابدأ من جديد.', 409);
    recorded = applyTrainingEvent(r, body);
    if (recorded.repeated) break;
    const saved = await cas(admin, row, recorded.round); if (saved) break; recorded = null;
  }
  if (!recorded) throw verifiedError('نؤكّد إجابة أخرى. أعد المحاولة.', 409);
  return effects(admin, user, recorded.round, recorded.event, recorded.repeated);
}
export async function resumeTraining(admin, user, userId, body) {
  let r = own(await read(admin, key(body.game, body.roundId)), user, userId);
  if (r.expiresAt < Date.now()) throw verifiedError('انتهت مهلة الجولة. ابدأ من جديد؛ نتائجك محفوظة.', 409);
  if(!r.closed&&r.game==='word_wheel'&&r.wheel.mode==='challenge'&&r.wheel.time&&r.clock.running&&r.clock.left-(Date.now()-r.clock.at)<=0){
    await trainingEvent(admin,user,userId,{...body,action:'finish',eventId:randomUUID()});
    r=own(await read(admin,key(body.game,body.roundId)),user,userId);
  }
  const last = r.events.at(-1);
  const confirmation = last ? await effects(admin, user, r, last, true) : null;
  const publicView=publicRound(r);
  if(r.clock?.running){publicView.clock={...r.clock,left:Math.max(0,r.clock.left-(Date.now()-r.clock.at)),at:Date.now()};publicView.snapshot={...r,clock:publicView.clock};}
  return { ...publicView, confirmation };
}
