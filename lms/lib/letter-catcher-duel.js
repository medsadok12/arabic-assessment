import { letterCatcherWordFrame, usesAnimalWordFrame, withSeparatedDammatan } from './letter-catcher-word-frame';

/* Server-only, JSON-serializable duel reducer. The API must verify the effective
 * child identity before passing actorId; no client clock or score is accepted.
 * Commands: join({participant:{id,name,avatar_url}}), ready({questionIndex:-1}),
 * answer({questionIndex,eventId,letter}), next({questionIndex}), heartbeat, tick,
 * leave/cancel. applyDuelCommand also accepts playerId in the command envelope.
 * Public contract (shared with the route and client):
 * {id,code,status,serverNow,revision,updatedAt,questionIndex,totalQuestions,
 * startsAt,deadlineAt,countdownUntil,remainingMs,settings,meId,cancelReason,
 * players:[{id,name,avatar_url,score,ready,done,connected,isSelf}],
 * ownAnswer:{done,right,tried,attempts,letter,cooldownUntil,award},roundAwards,
 * currentQuestion:{id,index,options,image_url,emoji,frame:{before,after},
 *   review?:{word,displayWord,audio_url,correctLetter}}}.
 * Other answers, private questions and event receipts never enter this payload.
 * player.ready means lobby readiness in waiting and next readiness in review.
 */

export const duelDefaults = Object.freeze({
  enabled: false,
  title: 'تحدي صديق',
  subtitle: 'العب مع صديقك واجمع النجوم',
  questionCount: 10,
  optionsCount: 3,
  soundEnabled: true,
  motionEnabled: true,
  encouragementEnabled: true,
});

const QUESTION_MS = 20_000;
const COUNTDOWN_MS = 3_000;
const COOLDOWN_MS = 700;
const TIE_MS = 500;
const DISCONNECT_MS = 10_000;
const RECONNECT_MS = 30_000;
const WAITING_TTL_MS = 30 * 60_000;
const MATCH_TTL_MS = 60 * 60_000;
const TERMINAL = new Set(['finished', 'cancelled']);
const clone = value => JSON.parse(JSON.stringify(value));
const letterKey = value => String(value ?? '').normalize('NFC').replace(/[\p{M}\u0640\u200c\u200d\s]/gu, '');
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const finiteTime = now => typeof now === 'number' && Number.isFinite(now) && now >= 0;
const safeString = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const numericSetting = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
  && Number.isFinite(Number(value));

export function normalizeDuelSettings(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const normalized = { ...duelDefaults };
  for (const key of ['enabled', 'soundEnabled', 'motionEnabled', 'encouragementEnabled']) {
    if (typeof source[key] === 'boolean') normalized[key] = source[key];
  }
  for (const [key, max] of [['title', 80], ['subtitle', 160]]) {
    const text = safeString(source[key], max);
    if (text) normalized[key] = text;
  }
  const count = Number(source.questionCount);
  if (numericSetting(source.questionCount) && Number.isInteger(count) && count >= 5 && count <= 10) normalized.questionCount = count;
  return normalized;
}

export function validateDuelSettings(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) errors.push('invalid_settings');
  for (const key of ['enabled', 'soundEnabled', 'motionEnabled', 'encouragementEnabled']) {
    if (hasOwn(source, key) && typeof source[key] !== 'boolean') errors.push(`invalid_${key}`);
  }
  for (const [key, max] of [['title', 80], ['subtitle', 160]]) {
    if (hasOwn(source, key) && (typeof source[key] !== 'string' || !source[key].trim() || source[key].trim().length > max)) errors.push(`invalid_${key}`);
  }
  if (hasOwn(source, 'questionCount') && (!numericSetting(source.questionCount) || !Number.isInteger(Number(source.questionCount)) || Number(source.questionCount) < 5 || Number(source.questionCount) > 10)) errors.push('invalid_questionCount');
  if (hasOwn(source, 'optionsCount') && (!numericSetting(source.optionsCount) || Number(source.optionsCount) !== 3)) errors.push('invalid_optionsCount');
  return errors.length ? null : normalizeDuelSettings(source);
}

// This snapshot contains the canonical answer and must remain on the server.
// Stable row-based ordering avoids a correct-first option without randomness in
// the reducer. The API may shuffle rows/options once before room creation.
export function duelQuestion(row, optionsCount = 3) {
  if (!row || !usesAnimalWordFrame(row) || typeof row.word !== 'string') return null;
  const expected = letterKey(row.missing_letter);
  if ([...expected].length !== 1) return null;
  const frame = letterCatcherWordFrame(row);
  if (!frame.hasMissing || !frame.fullWord.trim() || frame.fullWord.includes('_')) return null;
  if (optionsCount !== 3) return null;
  const count = 3;
  const supplied = Array.isArray(row.options) ? [...new Set(row.options.map(letterKey).filter(letter => [...letter].length === 1))] : [];
  const candidates = supplied.filter(letter => letter !== expected);
  if (!supplied.includes(expected) || candidates.length < count - 1) return null;
  const options = [expected, ...candidates.slice(0, count - 1)];
  let hash = 0;
  for (const character of `${row.id ?? ''}:${frame.fullWord}`) hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  const offset = hash % options.length;
  const ordered = [...options.slice(offset), ...options.slice(0, offset)];
  return {
    id: safeString(String(row.id ?? ''), 128) || `animal-${hash}`,
    category: 'الحيوانات', word: row.word, missing_letter: String(row.missing_letter),
    fullWord: frame.fullWord, displayWord: withSeparatedDammatan(frame.displayWord),
    options: ordered,
    image_url: typeof row.image_url === 'string' ? row.image_url : null,
    audio_url: typeof row.audio_url === 'string' ? row.audio_url : null,
    emoji: typeof row.emoji === 'string' ? row.emoji : null,
    // Preserve canonical marks for accessible labels; the shared word-frame
    // component applies the native open-dammatan substitution when rendering.
    frame: { before: frame.before, after: frame.after },
  };
}

function participant(source, now) {
  const id = typeof source?.id === 'string' ? source.id : '';
  if (!id || id.length > 128 || ['__proto__', 'constructor', 'prototype'].includes(id)) throw new Error('invalid_participant');
  return {
    id, name: safeString(source.name, 80) || 'صديقي',
    avatar_url: typeof source.avatar_url === 'string' ? source.avatar_url : null,
    score: 0, ready: false, lastSeenAt: now,
  };
}

export function createDuelState({ id = null, code = null, host, creator, questions, settings, now }) {
  if (!finiteTime(now)) throw new Error('invalid_server_time');
  const normalized = normalizeDuelSettings(settings);
  const source = Array.isArray(questions) ? questions.slice(0, normalized.questionCount) : [];
  const snapshots = source.map(row => duelQuestion(row, normalized.optionsCount));
  if (snapshots.length !== normalized.questionCount || snapshots.some(row => !row)) throw new Error('invalid_questions');
  if (new Set(snapshots.map(row => row.id)).size !== snapshots.length) throw new Error('duplicate_questions');
  return {
    id, code, settings: normalized, participants: [participant(host || creator, now)],
    questions: snapshots, status: 'waiting', questionIndex: -1, round: null, history: [],
    createdAt: now, updatedAt: now, revision: 0, matchStartedAt: null,
    countdownUntil: null, pause: null, cancelReason: null,
  };
}

function blankAnswer() {
  return { attempts: 0, events: [], tried: [], selectedLetter: null, right: null, done: false, answeredAt: null, answeredElapsedMs: null, cooldownUntil: null };
}

function startQuestion(state, index, now) {
  state.questionIndex = index;
  state.status = 'countdown';
  state.countdownUntil = now + COUNTDOWN_MS;
  state.round = {
    index, startedAt: state.countdownUntil, deadline: state.countdownUntil + QUESTION_MS, elapsedBeforeStart: 0,
    answers: Object.fromEntries(state.participants.map(player => [player.id, blankAnswer()])),
    settledAt: null, awards: null,
  };
  state.participants.forEach(player => { player.ready = false; });
  if (state.matchStartedAt === null) state.matchStartedAt = now;
}

function settleRound(state, at) {
  const round = state.round;
  if (!round || round.settledAt !== null) return;
  const first = state.participants.map(player => ({ id: player.id, answer: round.answers[player.id] }))
    .filter(({ answer }) => answer.right && answer.attempts === 1)
    .sort((a, b) => a.answer.answeredElapsedMs - b.answer.answeredElapsedMs);
  const fastest = first[0]?.answer.answeredElapsedMs;
  const awards = {};
  for (const player of state.participants) {
    const answer = round.answers[player.id];
    const award = !answer.right ? 0 : answer.attempts > 1 ? 5 : answer.answeredElapsedMs - fastest <= TIE_MS ? 15 : 10;
    awards[player.id] = award;
    player.score += award;
    player.ready = false;
    if (!answer.done) { answer.done = true; answer.right = false; }
  }
  round.settledAt = at;
  round.awards = awards;
  state.history.push({ index: state.questionIndex, settledAt: at, awards: { ...awards } });
  state.status = state.questionIndex === state.questions.length - 1 ? 'finished' : 'review';
  state.countdownUntil = null;
  state.pause = null;
}

function cancel(state, reason) {
  state.status = 'cancelled';
  state.cancelReason = reason;
  state.countdownUntil = null;
  state.pause = null;
}

// Advance at the actual server transition time, even if the next poll arrives
// late. A deadline that preceded disconnection still settles the question.
function advance(state, now) {
  if (TERMINAL.has(state.status)) return;
  if (state.status === 'waiting') {
    if (now >= state.createdAt + WAITING_TTL_MS) cancel(state, 'waiting_expired');
    else state.participants.forEach(player => {
      if (now - player.lastSeenAt >= DISCONNECT_MS) player.ready = false;
    });
    return;
  }
  if (state.matchStartedAt !== null && now >= state.matchStartedAt + MATCH_TTL_MS) {
    cancel(state, 'match_expired');
    return;
  }
  if (state.status === 'paused') {
    if (now >= state.pause.expiresAt) cancel(state, 'reconnect_expired');
    return;
  }
  const absentAt = Math.min(...state.participants.map(player => player.lastSeenAt + DISCONNECT_MS));
  if (state.status === 'countdown' && now >= state.countdownUntil && state.countdownUntil <= absentAt) state.status = 'playing';
  if (state.status === 'playing' && now >= state.round.deadline && state.round.deadline <= absentAt) settleRound(state, state.round.deadline);
  if (TERMINAL.has(state.status)) return;
  if (now >= absentAt) {
    const from = state.status;
    if (from === 'playing') state.round.elapsedBeforeStart += Math.max(0, absentAt - state.round.startedAt);
    state.pause = {
      from, pausedAt: absentAt, expiresAt: absentAt + RECONNECT_MS,
      remainingMs: from === 'playing' ? Math.max(0, state.round.deadline - absentAt) : from === 'countdown' ? QUESTION_MS : null,
    };
    state.status = 'paused';
    state.countdownUntil = null;
    if (now >= state.pause.expiresAt) cancel(state, 'reconnect_expired');
  }
}

function resumeIfPresent(state, now) {
  if (state.status !== 'paused' || state.participants.some(player => now - player.lastSeenAt >= DISCONNECT_MS)) return;
  const pause = state.pause;
  state.pause = null;
  if (pause.from === 'review') { state.status = 'review'; return; }
  state.status = 'countdown';
  state.countdownUntil = now + COUNTDOWN_MS;
  state.round.startedAt = state.countdownUntil;
  state.round.deadline = state.countdownUntil + pause.remainingMs;
}

export function applyDuelAction(original, actorId, action, now) {
  const failure = error => ({ state: original, changed: false, error });
  if (!original || !finiteTime(now)) return failure('invalid_server_time');
  const type = action?.type;
  const originalPlayer = original.participants.find(player => player.id === actorId);
  const internalTick = type === 'tick' && actorId == null;
  if (!originalPlayer && !internalTick && type !== 'join') return failure('not_participant');
  if (type === 'join' && (typeof actorId !== 'string' || action.participant?.id !== actorId)) return failure('identity_mismatch');
  if (!['join', 'ready', 'answer', 'next', 'heartbeat', 'tick', 'leave', 'cancel'].includes(type)) return failure('invalid_action');
  if (TERMINAL.has(original.status)) return { state: original, changed: false, ...(type === 'join' ? { error: 'room_closed' } : {}) };
  // Production writes are serialized by compare-and-swap in the route. Never
  // allow an older server operation to move heartbeat/deadline state backwards.
  const at = Math.max(now, original.updatedAt);
  const state = clone(original);
  advance(state, at);
  let error;
  let right;
  let duplicate = false;
  const player = state.participants.find(item => item.id === actorId);

  if (TERMINAL.has(state.status) && type === 'join') error = 'room_closed';

  if (!TERMINAL.has(state.status)) {
    if (type === 'join') {
      if (player) error = 'same_participant';
      else if (state.status !== 'waiting' || state.participants.length >= 2) error = 'room_full';
      else {
        try { state.participants.push(participant(action.participant, at)); }
        catch { error = 'invalid_participant'; }
      }
    } else if (type === 'tick') {
      // Internal ticks deliberately do not refresh anybody's presence.
    } else if (type === 'heartbeat') {
      player.lastSeenAt = at;
      resumeIfPresent(state, at);
    } else if (type === 'leave' || type === 'cancel') {
      cancel(state, 'participant_left');
    } else {
      const requiredIndex = state.status === 'waiting' ? -1 : state.questionIndex;
      if (!Number.isInteger(action.questionIndex) || action.questionIndex !== requiredIndex) error = 'stale_question';
      else if (type === 'ready') {
        if (state.status !== 'waiting' || state.participants.length !== 2) error = 'not_ready';
        else {
          player.lastSeenAt = at;
          player.ready = true;
          if (state.participants.every(item => item.ready)) startQuestion(state, 0, at);
        }
      } else if (type === 'next') {
        if (state.status !== 'review') error = 'not_in_review';
        else {
          player.lastSeenAt = at;
          player.ready = true;
          if (state.participants.every(item => item.ready)) startQuestion(state, state.questionIndex + 1, at);
        }
      } else if (type === 'answer') {
        const answer = state.round?.answers[actorId];
        const eventId = typeof action.eventId === 'string' ? action.eventId.trim() : '';
        const receipt = answer?.events.find(event => event.id === eventId);
        if (!eventId || eventId.length > 128) error = 'invalid_event_id';
        else if (receipt) { right = receipt.right; duplicate = true; }
        else if (state.status !== 'playing') error = state.status === 'paused' ? 'room_paused' : 'not_playing';
        else if (answer.done) error = 'already_answered';
        else if (answer.cooldownUntil !== null && at < answer.cooldownUntil) error = 'answer_cooldown';
        else {
          const selected = letterKey(action.letter);
          const question = state.questions[state.questionIndex];
          if (!question.options.includes(selected)) error = 'invalid_option';
          else {
            right = selected === letterKey(question.missing_letter);
            answer.attempts += 1;
            answer.selectedLetter = selected;
            answer.right = right;
            answer.tried.push(selected);
            answer.events.push({ id: eventId, right });
            answer.cooldownUntil = right ? null : at + COOLDOWN_MS;
            if (right) {
              answer.done = true;
              answer.answeredAt = at;
              // Pauses and the shared resume countdown consume no question time
              // and cannot turn an otherwise simultaneous answer into second place.
              answer.answeredElapsedMs = state.round.elapsedBeforeStart + Math.max(0, at - state.round.startedAt);
            }
            player.lastSeenAt = at;
            if (state.participants.every(item => state.round.answers[item.id].done)) settleRound(state, at);
          }
        }
      }
    }
  }
  const changed = JSON.stringify(state) !== JSON.stringify(original);
  if (changed) {
    state.updatedAt = at;
    state.revision = (original.revision || 0) + 1;
  }
  return { state: changed ? state : original, changed, ...(error ? { error } : {}), ...(right !== undefined ? { right } : {}), ...(duplicate ? { duplicate: true } : {}) };
}

export function applyDuelCommand(state, command, now) {
  return applyDuelAction(state, command?.playerId ?? command?.actorId ?? null, command, now);
}

export function tickDuel(state, now) {
  return applyDuelAction(state, null, { type: 'tick' }, now);
}

export function publicDuelState(state, actorId, now) {
  if (!finiteTime(now)) throw new Error('invalid_server_time');
  if (!state.participants.some(player => player.id === actorId)) return null;
  const answer = state.round?.answers[actorId];
  const revealed = state.round?.settledAt !== null && state.round?.settledAt !== undefined;
  const row = state.questions[state.questionIndex];
  const currentQuestion = row ? {
    id: row.id, index: state.questionIndex, options: [...row.options], image_url: row.image_url,
    emoji: row.emoji, frame: { ...row.frame },
    ...(revealed ? { review: { word: row.fullWord, displayWord: row.displayWord, audio_url: state.settings.soundEnabled ? row.audio_url : null, correctLetter: letterKey(row.missing_letter) } } : {}),
  } : null;
  const remainingMs = state.status === 'paused' ? state.pause.remainingMs
    : state.status === 'countdown' ? Math.max(0, state.round.deadline - state.round.startedAt)
      : state.status === 'playing' ? Math.max(0, state.round.deadline - now) : null;
  return {
    id: state.id, code: state.code, status: state.status, serverNow: now,
    revision: state.revision, updatedAt: state.updatedAt, settings: { ...state.settings },
    questionIndex: state.questionIndex, totalQuestions: state.questions.length, meId: actorId,
    startsAt: state.round?.startedAt ?? null, deadlineAt: state.round?.deadline ?? null,
    countdownUntil: state.countdownUntil, remainingMs, cancelReason: state.cancelReason,
    players: state.participants.map(player => ({
      id: player.id, name: player.name, avatar_url: player.avatar_url, score: player.score,
      ready: player.ready, done: Boolean(state.round?.answers[player.id]?.done),
      connected: !TERMINAL.has(state.status) && now - player.lastSeenAt < DISCONNECT_MS, isSelf: player.id === actorId,
    })),
    currentQuestion,
    ownAnswer: {
      done: Boolean(answer?.done), right: answer?.right ?? null, tried: answer ? [...answer.tried] : [],
      attempts: answer?.attempts ?? 0, letter: answer?.selectedLetter ?? null,
      cooldownUntil: answer?.cooldownUntil ?? null, award: revealed ? state.round.awards[actorId] : null,
    },
    roundAwards: revealed ? { ...state.round.awards } : null,
  };
}
