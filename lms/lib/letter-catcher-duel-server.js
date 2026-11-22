import { randomInt, randomUUID } from 'node:crypto';
import { LC_GAME_ID } from './letter-catcher';
import { canonicalLcWord } from './letter-catcher-categories';
import { applyDuelAction, createDuelState, duelQuestion, normalizeDuelSettings, publicDuelState } from './letter-catcher-duel';
import { awardVerifiedPoints, deliverVerifiedEffect } from './verified-effects';

const TABLE = 'letter_catcher_duels';
const ROOM_FIELDS = 'id, code, owner_id, state, version, created_at, updated_at, expires_at';
const OPEN_STATUSES = ['waiting', 'countdown', 'playing', 'review', 'paused'];
const ROOM_LIFETIME_MS = 2 * 60 * 60 * 1000;
const MAX_RETRIES = 6;
const failure = (message, status = 503) => Object.assign(new Error(message), { status });
const unavailable = () => failure('تعذّر فتح التحدي الآن. جرّب مرة أخرى، مغامرتك تنتظرك.');
const member = (state, id) => state?.participants?.some(player => player.id === id);
const ACTION_MESSAGES = {
  room_closed: 'انتهى هذا التحدي. أنشئ تحديًا جديدًا مع صديقك.',
  room_full: 'اكتمل هذا التحدي بصديقين. أنشئ تحديًا جديدًا لكما.',
  same_participant: 'أنت داخل هذا التحدي بالفعل. شارك الرمز مع صديق آخر.',
  stale_question: 'تغيّرت الكلمة. انتظر لحظة ثم جرّب مرة أخرى.',
  not_ready: 'انتظر انضمام صديقك ثم اضغط أنا جاهز.',
  not_in_review: 'أكملا هذه الكلمة أولًا، ثم انتقلا معًا.',
  room_paused: 'ننتظر عودة صديقك. ستكملان من حيث توقفتما.',
  not_playing: 'انتظر بداية الكلمة ثم اختر حرفك.',
  already_answered: 'وصلت إجابتك. انتظر صديقك لتكملا معًا.',
  answer_cooldown: 'خذ لحظة صغيرة ثم اختر حرفًا آخر.',
  invalid_option: 'اختر حرفًا من الحروف المعروضة.',
};

export function duelRoomCode(value) {
  return typeof value === 'string' && /^[0-9]{6}$/.test(value) ? value : null;
}

// The display identity is server resolved. Never share an email, parent account,
// auth metadata, or a client-supplied player name with the other participant.
export function duelParticipant(user, identity) {
  const child = identity.viewingChild;
  const source = child?.full_name || (!child && (user.app_metadata?.display_name || user.user_metadata?.full_name)) || 'صديقي';
  const name = String(source).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().split(/\s+/)[0].slice(0, 24) || 'صديقي';
  const avatar = !child && user.app_metadata?.custom_avatar_url;
  return {
    id: identity.effectiveUserId,
    name,
    ...(typeof avatar === 'string' && avatar.length < 2000 && /^https:\/\//.test(avatar) ? { avatar_url: avatar } : {}),
  };
}

export async function loadDuelSettings(admin) {
  const { data, error } = await admin.from('game_settings').select('settings').eq('game_id', LC_GAME_ID).maybeSingle();
  if (error) throw unavailable();
  return normalizeDuelSettings(data?.settings?.duel);
}

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function animalQuestions(admin, settings) {
  const { data, error } = await admin.from('letter_catcher_words')
    .select('id, word, missing_letter, options, emoji, image_url, audio_url, topic, grade_level, category').order('id');
  if (error || !Array.isArray(data)) throw unavailable();
  const seenIds = new Set(), seenWords = new Set();
  const valid = [];
  for (const source of data) {
    const row = canonicalLcWord(source);
    if (row.category !== 'الحيوانات' || !duelQuestion(row, settings.optionsCount)) continue;
    const id = String(row.id);
    const word = String(row.word).replace('_', row.missing_letter).normalize('NFC').replace(/[\u064B-\u065F\u0670\u0640\s]/g, '');
    if (seenIds.has(id) || seenWords.has(word)) continue;
    seenIds.add(id);
    seenWords.add(word);
    valid.push(row);
  }
  if (valid.length < settings.questionCount) {
    throw failure(`نحتاج إلى ${settings.questionCount} كلمات حيوانات جاهزة لهذا التحدي. اطلب من المعلم إكمالها ثم عد للعب.`, 409);
  }
  // Official rooms always snapshot real edited database words and options.
  // In particular, the single-player API's fallback list cannot create a duel.
  return shuffled(valid).slice(0, settings.questionCount);
}

export async function createDuelRoom(admin, actor, settings, now = Date.now()) {
  const questions = await animalQuestions(admin, settings);
  const createdAt = new Date(now).toISOString();
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = randomUUID(), code = String(randomInt(100000, 1000000));
    const state = createDuelState({ id, code, host: actor.participant, questions, settings, now });
    state.preview = Boolean(actor.staff);
    const { data, error } = await admin.from(TABLE).insert({
      id, code, owner_id: actor.user.id, state, version: 0,
      created_at: createdAt, updated_at: createdAt, expires_at: new Date(now + ROOM_LIFETIME_MS).toISOString(),
    }).select(ROOM_FIELDS).single();
    if (error?.code === '23505') continue;
    if (error || !data) throw unavailable();
    return { room: publicRoom(data, actor.participant.id, now) };
  }
  throw failure('الأصدقاء يفتحون تحديات كثيرة الآن. جرّب إنشاء تحديك مرة أخرى.', 409);
}

async function readRoom(admin, code) {
  const { data, error } = await admin.from(TABLE).select(ROOM_FIELDS).eq('code', code).maybeSingle();
  if (error) throw unavailable();
  return data;
}

function publicRoom(row, actorId, now) {
  const state = publicDuelState(row.state, actorId, now);
  if (!state) throw failure('لم نجد تحديًا لك بهذا الرمز. تحقّق منه مع صديقك.', 404);
  return { ...state, id: row.id, code: row.code, meId: actorId, version: row.version };
}

async function compareAndSwap(admin, row, state, now) {
  const { data, error } = await admin.from(TABLE).update({
    state, version: row.version + 1, updated_at: new Date(now).toISOString(),
  }).eq('id', row.id).eq('version', row.version).select(ROOM_FIELDS).maybeSingle();
  if (error) throw unavailable();
  return data;
}

export function duelCommand(body) {
  if (!body || !['join', 'ready', 'answer', 'next', 'leave', 'sync', 'result'].includes(body.action)) {
    throw failure('اختر خطوة من التحدي ثم حاول مرة أخرى.', 400);
  }
  if (!duelRoomCode(body.code)) throw failure('اكتب رمز التحدي المكوّن من 6 أرقام.', 400);
  const command = { type: body.action === 'sync' || body.action === 'result' ? 'heartbeat' : body.action };
  if (body.action === 'ready') command.questionIndex = -1;
  if (body.action === 'answer' || body.action === 'next') {
    if (!Number.isInteger(body.questionIndex) || body.questionIndex < 0 || body.questionIndex > 9) {
      throw failure('تغيّرت الكلمة. انتظر لحظة ثم جرّب مرة أخرى.', 400);
    }
    command.questionIndex = body.questionIndex;
  }
  if (body.action === 'answer') {
    if (typeof body.eventId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(body.eventId) ||
      typeof body.letter !== 'string' || !/^[\u0621-\u064A\u0671][\u064B-\u065F\u0670]*$/.test(body.letter) || body.letter.length > 8) {
      throw failure('اختر حرفًا من الحروف المعروضة.', 400);
    }
    command.eventId = body.eventId;
    command.letter = body.letter;
  }
  return command;
}

export async function updateDuelRoom(admin, actor, body, now = Date.now()) {
  const command = duelCommand(body);
  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    const row = await readRoom(admin, body.code);
    // A code is an invitation to join, never permission to inspect a room.
    if (!row || (body.action !== 'join' && !member(row.state, actor.participant.id))) {
      throw failure('لم نجد تحديًا لك بهذا الرمز. تحقّق منه مع صديقك.', 404);
    }
    if (row.state.status !== 'finished' && Date.parse(row.expires_at) <= now) {
      throw failure('انتهى وقت هذا الرمز. أنشئ تحديًا جديدًا مع صديقك.', 410);
    }
    if (body.action === 'join' && member(row.state, actor.participant.id)) {
      throw failure('أنت داخل هذا التحدي بالفعل. شارك الرمز مع صديق آخر.', 409);
    }
    let state = row.state, changed = false;
    if (body.action !== 'join' && command.type !== 'heartbeat') {
      const heartbeat = applyDuelAction(state, actor.participant.id, { type: 'heartbeat' }, now);
      state = heartbeat.state;
      changed = heartbeat.changed;
    }
    const result = applyDuelAction(state, actor.participant.id,
      body.action === 'join' ? { ...command, participant: actor.participant } : command, now);
    state = result.state;
    changed = changed || result.changed;
    if (body.action === 'join' && actor.staff && !result.error && !state.preview) {
      state = { ...state, preview: true };
      changed = true;
    }
    const stored = changed ? await compareAndSwap(admin, row, state, now) : row;
    if (!stored) continue;
    if (result.error) throw failure(ACTION_MESSAGES[result.error] || 'لم تكتمل هذه الخطوة. انتظر لحظة ثم جرّب مرة أخرى.', 409);
    if (body.action === 'join' && !member(stored.state, actor.participant.id)) throw failure(ACTION_MESSAGES.room_closed, 409);
    const output = { room: publicRoom(stored, actor.participant.id, now) };
    if (body.action === 'result') {
      const award = await finishDuelRoom(admin, stored, actor);
      return { ...output, award, awarded: award.state === 'done' ? award.amount : 0 };
    }
    return output;
  }
  throw failure('تصل إجاباتكما معًا! انتظر لحظة ثم حاول مرة أخرى.', 409);
}

export async function finishDuelRoom(admin, row, actor) {
  const participant = row.state.participants?.find(player => player.id === actor.participant.id);
  if (!participant || row.state.status !== 'finished') {
    throw failure('ستظهر مكافأتك بعد إكمال التحدي مع صديقك.', 409);
  }
  if (actor.staff || row.state.preview) return { state: 'done', preview: true, amount: 0 };
  const amount = Math.min(150, row.state.questions.length * 15, Math.max(0, Math.trunc(participant.score || 0)));
  if (!amount) return { state: 'done', amount: 0 };
  const effect = `verified:letter-catcher-duel:${row.id}:${actor.participant.id}`;
  const result = await deliverVerifiedEffect(admin, effect, actor.user.id,
    () => awardVerifiedPoints(admin, actor.participant.id, `letter_catcher_duel:${row.id}`, amount),
    { roomId: row.id, playerId: actor.participant.id, amount });
  return { state: result.state, amount: result.state === 'done' ? amount : 0, ...(typeof result.points === 'number' ? { points: result.points } : {}) };
}

export async function resetOpenDuels(admin, now = Date.now()) {
  const { data, error } = await admin.from(TABLE).select(ROOM_FIELDS).in('state->>status', OPEN_STATUSES).order('created_at').limit(100);
  if (error || !Array.isArray(data)) throw unavailable();
  let resetCount = 0, retryNeeded = false;
  for (const row of data) {
    let current = row, reset = false;
    for (let retry = 0; retry < MAX_RETRIES && current && OPEN_STATUSES.includes(current.state.status); retry++) {
      const state = { ...current.state, status: 'cancelled', cancelReason: 'staff-reset', updatedAt: now, revision: (current.state.revision || 0) + 1 };
      if (await compareAndSwap(admin, current, state, now)) { resetCount++; reset = true; break; }
      current = await readRoom(admin, current.code);
    }
    if (!reset && current && OPEN_STATUSES.includes(current.state.status)) retryNeeded = true;
  }
  return { resetCount, remaining: retryNeeded || data.length === 100 };
}
