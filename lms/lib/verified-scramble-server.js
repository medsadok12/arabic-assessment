import { randomUUID } from 'node:crypto';
import { SCRAMBLE_GAME, SCRAMBLE_POINTS, SCRAMBLE_TTL, scrambleSummary, recordScrambleAttempt } from './verified-scramble';
import { letterCount, LEN_NO_LIMIT } from './letter-catcher';

const key = id => `${SCRAMBLE_GAME}:round:${id}`;
const failure = (message, status = 503) => Object.assign(new Error(message), { status });
async function readRow(admin, id) {
  const { data, error } = await admin.from('game_settings').select('game_id, settings, updated_at').eq('game_id', id).maybeSingle();
  if (error) throw failure('تعذّر فتح الجولة. أعد المحاولة.');
  return data;
}
async function putRow(admin, id, settings, owner) {
  return admin.from('game_settings').insert({ game_id: id, settings, updated_by: owner, updated_at: new Date().toISOString() });
}
async function cas(admin, row, settings) {
  const { data, error } = await admin.from('game_settings').update({ settings, updated_at: new Date(Math.max(Date.now(), Date.parse(row.updated_at) + 1)).toISOString() })
    .eq('game_id', row.game_id).eq('updated_at', row.updated_at).select('game_id, settings, updated_at').maybeSingle();
  if (error) throw failure('تعذّر حفظ الجولة. أعد المحاولة.');
  return data;
}
function own(row, userId, owner) {
  if (!row || row.settings.userId !== userId || row.settings.owner !== owner) throw failure('هذه الجولة غير متاحة لهذا الحساب.', 404);
  return row.settings;
}
function publicRound(round, media = []) {
  return { roundId: round.id, preview: !!round.preview, words: round.words.map(w => ({ ...media.find(m => String(m.id) === w.id), ...w })), category: round.category, topic: round.topic, expiresAt: round.expiresAt, cursor: round.cursor, summary: scrambleSummary(round) };
}
export async function resumeScramble(admin, user, userId, id) {
  const round = own(await readRow(admin, key(id)), userId, user.id);
  if (Date.parse(round.expiresAt) < Date.now()) throw failure('انتهت مهلة الجولة. ابدأ جولة جديدة؛ نتائجك السابقة محفوظة.', 409);
  const last = round.events.at(-1);
  const confirmationRequest = last?.right ? { action: 'answer', roundId: id, attemptId: last.id, index: last.index, order: last.order } : null;
  const confirmation = confirmationRequest ? await answerScramble(admin, user, userId, confirmationRequest) : null;
  return { ...publicRound(round), confirmation, confirmationRequest };
}
export async function startScramble(admin, user, userId, body, preview = false) {
  const old = preview ? null : await readRow(admin, key(body.roundId));
  if (old) {
    const saved = own(old, userId, user.id);
    if (saved.events.length) throw failure('هذه الجولة بدأت بالفعل. ابدأ جولة جديدة.', 409);
    if (Date.parse(saved.expiresAt) < Date.now()) throw failure('انتهت مهلة الجولة. ابدأ جولة جديدة.', 409);
    return publicRound(saved);
  }
  const f = body.filters || {};
  if (!['all', 'topic'].includes(body.mode) || (f.topic != null && (typeof f.topic !== 'string' || f.topic.length > 120)) || (body.topic != null && (typeof body.topic !== 'string' || body.topic.length > 120))) throw failure('اختر إعدادات الجولة من جديد.', 400);
  const grade = Number(f.grade || 0), min = Number(f.minLen || 2), max = Number(f.maxLen || LEN_NO_LIMIT);
  if (![grade, min, max].every(Number.isInteger) || grade < 0 || grade > 12 || min < 1 || max < min || max > 200) throw failure('اختر إعدادات الجولة من جديد.', 400);
  let words = [];
  for (let from = 0; ; from += 1000) {
    let q = admin.from('word_scramble_words').select('id, word, topic, grade_level, image_url, emoji, audio_url, created_at').order('id').range(from, from + 999);
    if (f.topic) q = q.eq('topic', f.topic);
    if (body.topic) q = q.eq('topic', body.topic);
    if (grade) q = q.eq('grade_level', grade);
    const { data, error } = await q;
    if (error) throw failure('تعذّر تجهيز الكلمات. جرّب مرة أخرى.');
    words.push(...(data || []));
    if (!data || data.length < 1000) break;
    if (words.length > 2000) throw failure('اختر فصلًا أو مستوى لجولة أخفّ.', 400);
  }
  words = [...new Map(words.map(w => [String(w.id), w])).values()].filter(w => typeof w.word === 'string' && w.word.length >= 2 && w.word.length <= 200 && letterCount(w.word) >= min && (max >= LEN_NO_LIMIT || letterCount(w.word) <= max));
  if (words.length > 2000) throw failure('اختر فصلًا أو مستوى لجولة أخفّ.', 400);
  for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
  if (body.mode === 'topic') words = words.slice(0, 12);
  if (!words.length) throw failure('لا توجد كلمات لهذه الجولة الآن. اختر فصلًا آخر.', 400);
  const round = { id: body.roundId, owner: user.id, userId, preview, category: body.topic || 'عام', topic: body.topic || null, revision: 0,
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + SCRAMBLE_TTL).toISOString(),
    words: words.map(w => ({ id: String(w.id), word: w.word, topic: w.topic, grade_level: w.grade_level })),
    answers: words.map(() => ({ solved: false, wrong: 0 })), cursor: 0, events: [] };
  if (!preview) {
    const { error } = await putRow(admin, key(round.id), round, user.id);
    if (error?.code === '23505') return publicRound(own(await readRow(admin, key(round.id)), userId, user.id), words);
    if (error) throw failure('تعذّر تجهيز الجولة. أعد المحاولة.');
  }
  return publicRound(round, words);
}

// حجز دائم لكل أثر جانبي: إعادة الإرسال والمتزامن لا ينفذان المنح/النسخ مرتين.
// خطأ قاعدة صريح يسمح بإعادة المحاولة. انقطاع مبهم بعد الكتابة يبقى للمراجعة،
// ولا نعيد منح رصيد قد يكون كُتب بالفعل. النتيجة الأصلية تبقى في صف الجولة.
async function deliver(admin, id, owner, action) {
  let row = await readRow(admin, id);
  if (!row) {
    const { error } = await putRow(admin, id, { state: 'working', token: randomUUID() }, owner);
    if (error?.code === '23505') return (await readRow(admin, id))?.settings || { state: 'pending' };
    if (error) return { state: 'pending' };
    row = await readRow(admin, id);
  } else {
    if (row.settings.state !== 'pending') return row.settings;
    row = await cas(admin, row, { state: 'working', token: randomUUID() });
    if (!row) return { state: 'pending' };
  }
  let result;
  try { result = await action(); } catch { result = { state: 'review' }; }
  try { await cas(admin, row, result); } catch { /* الحجز يبقى working: لا نكرر أثرًا مبهمًا */ }
  return result;
}
async function reward(admin, userId, round, index) {
  const reason = `${SCRAMBLE_GAME}:${round.id}:${index}`;
  // reason فريد لكل كلمة في الجولة، لا يأتي مقدار النقاط من المتصفح.
  const { data: log, error: logError } = await admin.from('points_log').select('id').eq('user_id', userId).eq('reason', reason).maybeSingle();
  if (logError) return { state: 'pending' };
  if (log) return { state: 'done', amount: SCRAMBLE_POINTS };
  for (let retry = 0; retry < 4; retry++) {
    const { data: current, error } = await admin.from('user_points').select('total').eq('user_id', userId).maybeSingle();
    if (error) return { state: 'pending' };
    const before = current?.total ?? 0, after = before + SCRAMBLE_POINTS;
    const write = current
      ? await admin.from('user_points').update({ total: after, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('total', before).select('total').maybeSingle()
      : await admin.from('user_points').insert({ user_id: userId, total: after, updated_at: new Date().toISOString() }).select('total').maybeSingle();
    if (write.error?.code === '23505') continue;
    if (write.error) return { state: 'pending' };
    if (!write.data) continue;
    const { error: insertError } = await admin.from('points_log').insert({ user_id: userId, delta: SCRAMBLE_POINTS, reason });
    if (insertError) return { state: 'review', before, after, reason, amount: SCRAMBLE_POINTS };
    return { state: 'done', points: after, amount: SCRAMBLE_POINTS };
  }
  return { state: 'pending' };
}
export async function answerScramble(admin, user, userId, body) {
  let row, recorded;
  for (let tries = 0; tries < 5; tries++) {
    row = await readRow(admin, key(body.roundId));
    const round = own(row, userId, user.id);
    // يمكن إعادة إرسال محاولة محفوظة بعد المهلة؛ لا نقبل محاولات جديدة حينئذ.
    if (Date.parse(round.expiresAt) < Date.now() && !round.events.some(e => e.id === body.attemptId)) throw failure('انتهت مهلة الجولة. ابدأ جولة جديدة.', 409);
    recorded = recordScrambleAttempt(round, body);
    if (recorded.error) throw failure(recorded.error, recorded.status);
    if (recorded.repeated) break;
    const saved = await cas(admin, row, recorded.round);
    if (saved) { row = saved; break; }
    recorded = null;
  }
  if (!recorded) throw failure('نحفظ إجابة أخرى الآن. أعد المحاولة.', 409);
  const round = recorded.round, summary = scrambleSummary(round);
  let award = { state: 'none', amount: 0 }, result = { state: 'none' };
  if (recorded.event.right) award = await deliver(admin, `${SCRAMBLE_GAME}:reward:${round.id}:${body.index}`, user.id, () => reward(admin, userId, round, body.index));
  if (summary.complete) result = await deliver(admin, `${SCRAMBLE_GAME}:result:${round.id}`, user.id, async () => {
    const { error } = await admin.from('game_results').insert({ user_id: userId, game_id: SCRAMBLE_GAME, category: round.category,
      correct: summary.correct, wrong: summary.wrong, total: summary.total });
    return { state: error ? 'pending' : 'done' };
  });
  return { verified: true, right: recorded.event.right, attemptId: body.attemptId, summary,
    reward: award.state, awarded: award.state === 'done' && !recorded.repeated ? SCRAMBLE_POINTS : 0,
    points: award.points, result: result.state, repeated: recorded.repeated };
}
