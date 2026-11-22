import { describe, expect, it } from 'vitest';
import {
  applyDuelAction, applyDuelCommand, createDuelState, duelDefaults, duelQuestion,
  normalizeDuelSettings, publicDuelState, tickDuel, validateDuelSettings,
} from './letter-catcher-duel';

const host = { id: 'child-a', name: 'علي', avatar_url: '/a.png' };
const guest = { id: 'child-b', name: 'فاطمة', avatar_url: '/b.png' };
const questions = () => Array.from({ length: 5 }, (_, index) => ({
  id: `animal-${index}`, category: 'الحيوانات', word: 'قِ_ٌّ', missing_letter: 'ط',
  options: ['ط', 'ب', 'ت', 'ق'], emoji: '🐱', image_url: '/opaque-picture.png', audio_url: '/opaque-speech.mp3',
}));
const create = (extra = {}) => createDuelState({ id: 'room-1', code: '123456', host, questions: questions(), settings: { questionCount: 5 }, now: 0, ...extra });
const act = (state, id, type, now, extra = {}) => applyDuelAction(state, id, { type, ...extra }, now);
const command = (state, id, type, now, extra = {}) => act(state, id, type, now, extra).state;
const answer = (state, id, now, letter = 'ط', eventId = `${id}-${state.questionIndex}-${now}`) => act(state, id, 'answer', now, { questionIndex: state.questionIndex, letter, eventId });

function joined() {
  return command(create(), guest.id, 'join', 0, { participant: guest });
}

function playing() {
  let state = joined();
  state = command(state, host.id, 'ready', 0, { questionIndex: -1 });
  state = command(state, guest.id, 'ready', 0, { questionIndex: -1 });
  return tickDuel(state, 3000).state;
}

function heartbeatBoth(state, now) {
  return command(command(state, host.id, 'heartbeat', now), guest.id, 'heartbeat', now);
}

function freeze(value) {
  Object.values(value || {}).forEach(item => { if (item && typeof item === 'object') freeze(item); });
  return Object.freeze(value);
}

describe('duel configuration and immutable animal snapshots', () => {
  it('uses a disabled, separately controlled animal MVP with fixed three options', () => {
    expect(normalizeDuelSettings(null)).toEqual(duelDefaults);
    expect(normalizeDuelSettings({ enabled: true, questionCount: 5, optionsCount: 8, soundEnabled: false, motionEnabled: false, encouragementEnabled: false })).toMatchObject({
      enabled: true, questionCount: 5, optionsCount: 3, soundEnabled: false, motionEnabled: false, encouragementEnabled: false,
    });
    expect(validateDuelSettings({ questionCount: 5, title: '  تحدي  ' })).toMatchObject({ questionCount: 5, title: 'تحدي', subtitle: duelDefaults.subtitle });
    expect(validateDuelSettings({})).toEqual(duelDefaults);
  });

  it.each([
    null, [], { enabled: 'true' }, { questionCount: 4 }, { questionCount: 11 }, { questionCount: 5.5 },
    { optionsCount: 4 }, { questionCount: [5] }, { optionsCount: [3] }, { questionCount: { valueOf: () => 5 } },
    { title: '' }, { title: ' '.repeat(4) }, { title: 'أ'.repeat(81) },
    { subtitle: 'أ'.repeat(161) }, { soundEnabled: 1 }, { motionEnabled: 'false' }, { encouragementEnabled: null },
  ])('rejects invalid saved configuration: %j', raw => {
    expect(validateDuelSettings(raw)).toBeNull();
  });

  it('retains canonical pronunciation and applies open dammatan only in display strings', () => {
    const row = questions()[0];
    const snapshot = duelQuestion(row);
    expect(snapshot).toMatchObject({ word: 'قِ_ٌّ', fullWord: 'قِطٌّ', missing_letter: 'ط', displayWord: 'قِطّ\u08f1', frame: { before: 'قِ\u200d', after: '' } });
    expect(snapshot.options).toHaveLength(3);
    expect(new Set(snapshot.options).size).toBe(3);
    expect(snapshot.options).toContain('ط');
    expect(row.word).toBe('قِ_ٌّ');
    expect(duelQuestion({ ...row, category: 'الفواكه' })).toBeNull();
    expect(duelQuestion({ ...row, missing_letter: 'م', options: ['م', 'ب', 'ت'] })).not.toBeNull(); // The explicit marker locates the configured answer.
    expect(duelQuestion({ ...row, word: 'قِطٌّ', missing_letter: 'م' })).toBeNull();
    expect(duelQuestion({ ...row, missing_letter: 'طب' })).toBeNull();
    expect(duelQuestion({ ...row, options: undefined })).toBeNull();
    expect(duelQuestion({ ...row, options: ['ب', 'ت', 'ق'] })).toBeNull();
    expect(duelQuestion({ ...row, options: ['ط', 'ط', 'ب'] })).toBeNull();
    expect(duelQuestion({ ...row, word: 'بَطَّةٌ', missing_letter: 'ب', options: ['ب', 'ت', 'ث'] }).frame.after).toBe('\u200dطَّةٌ');
  });

  it('requires enough distinct valid animal records and snapshots caller input', () => {
    const rows = questions();
    const settings = { questionCount: 5, title: 'تحدي أول' };
    const state = create({ questions: rows, settings });
    rows[0].word = 'changed';
    rows[0].options.push('غ');
    settings.title = 'changed';
    expect(state.questions[0].word).toBe('قِ_ٌّ');
    expect(state.settings.title).toBe('تحدي أول');
    expect(() => create({ questions: questions().slice(0, 4) })).toThrow('invalid_questions');
    expect(() => create({ questions: questions().map(row => ({ ...row, id: 'same' })) })).toThrow('duplicate_questions');
    expect(() => create({ questions: questions().map(row => ({ ...row, category: 'الفواكه' })) })).toThrow('invalid_questions');
    expect(() => create({ now: undefined })).toThrow('invalid_server_time');
  });
});

describe('verified membership, shared countdown, and stale command control', () => {
  it('rejects a second browser with the same effective child and mismatched identity', () => {
    const state = create();
    expect(act(state, host.id, 'join', 0, { participant: host })).toMatchObject({ changed: false, error: 'same_participant' });
    expect(act(state, 'outsider', 'join', 0, { participant: guest })).toMatchObject({ changed: false, error: 'identity_mismatch' });
    expect(act(state, 'outsider', 'heartbeat', 1000)).toMatchObject({ changed: false, error: 'not_participant' });
    expect(publicDuelState(state, 'outsider', 1000)).toBeNull();
    const full = joined();
    expect(act(full, 'third', 'join', 0, { participant: { id: 'third' } }).error).toBe('room_full');
  });

  it('requires both ready and uses exactly one shared 3-second start and 20-second deadline', () => {
    let state = joined();
    state = command(state, host.id, 'ready', 100, { questionIndex: -1 });
    expect(state.status).toBe('waiting');
    expect(command(state, host.id, 'ready', 100, { questionIndex: -1 })).toBe(state);
    state = command(state, guest.id, 'ready', 200, { questionIndex: -1 });
    expect(state).toMatchObject({ status: 'countdown', questionIndex: 0, countdownUntil: 3200, round: { startedAt: 3200, deadline: 23200 } });
    expect(answer(state, host.id, 3199).error).toBe('not_playing');
    state = tickDuel(state, 3200).state;
    expect(state.status).toBe('playing');
    expect(publicDuelState(state, host.id, 3200)).toMatchObject({ startsAt: 3200, deadlineAt: 23200, remainingMs: 20000 });
  });

  it('requires fresh lobby readiness after a child has been absent', () => {
    let state = command(joined(), guest.id, 'ready', 0, { questionIndex: -1 });
    state = command(state, host.id, 'ready', 20000, { questionIndex: -1 });
    expect(state.status).toBe('waiting');
    expect(state.participants.find(player => player.id === guest.id).ready).toBe(false);
    state = command(state, guest.id, 'ready', 21000, { questionIndex: -1 });
    expect(state).toMatchObject({ status: 'countdown', countdownUntil: 24000 });
  });

  it('rejects stale question actions and applies serialized simultaneous next readiness once', () => {
    let state = answer(playing(), host.id, 4000).state;
    state = answer(state, guest.id, 4100).state;
    expect(state.status).toBe('review');
    expect(act(state, host.id, 'next', 4200, { questionIndex: -1 }).error).toBe('stale_question');
    state = command(state, host.id, 'next', 4200, { questionIndex: 0 });
    expect(command(state, host.id, 'next', 4200, { questionIndex: 0 })).toBe(state);
    state = command(state, guest.id, 'next', 4200, { questionIndex: 0 });
    expect(state).toMatchObject({ status: 'countdown', questionIndex: 1, countdownUntil: 7200 });
    const duplicate = act(state, guest.id, 'next', 4200, { questionIndex: 0 });
    expect(duplicate).toMatchObject({ changed: false, error: 'stale_question' });
    expect(duplicate.state.questionIndex).toBe(1);
    expect(act(state, host.id, 'answer', 7300, { questionIndex: 0, eventId: 'stale', letter: 'ط' }).error).toBe('stale_question');
  });

  it('never mutates a previous reducer state or private snapshots', () => {
    const state = freeze(playing());
    const serialized = JSON.stringify(state);
    const changed = answer(state, host.id, 4000).state;
    expect(changed).not.toBe(state);
    expect(JSON.stringify(state)).toBe(serialized);
    expect(changed.questions).toEqual(state.questions);
    expect(changed.revision).toBe(state.revision + 1);
    expect(JSON.parse(JSON.stringify(changed))).toEqual(changed);
  });
});

describe('server authoritative scoring, retries and idempotent answers', () => {
  it('rebases either serialized order of concurrent answers to the same once-only result', () => {
    for (const order of [[host.id, guest.id], [guest.id, host.id]]) {
      const initial = playing();
      let state = answer(initial, order[0], 4000, 'ط', `${order[0]}-concurrent`).state;
      state = answer(state, order[1], 4000, 'ط', `${order[1]}-concurrent`).state;
      expect(state.round.awards).toEqual({ [host.id]: 15, [guest.id]: 15 });
      expect(state.participants.map(player => player.score)).toEqual([15, 15]);
      expect(state.revision).toBe(initial.revision + 2);
      expect(state.history).toHaveLength(1);
      const retry = answer(state, order[0], 4000, 'ب', `${order[0]}-concurrent`);
      expect(retry).toMatchObject({ changed: false, duplicate: true, right: true });
      expect(retry.state.participants.map(player => player.score)).toEqual([15, 15]);
    }
  });

  it.each([[500, 15], [501, 10], [2000, 10]])('settles the second first-attempt answer after %i ms for %i points', (gap, secondAward) => {
    let state = playing();
    state = answer(state, host.id, 4000).state;
    expect(state.participants.map(player => player.score)).toEqual([0, 0]);
    state = answer(state, guest.id, 4000 + gap).state;
    expect(state.status).toBe('review');
    expect(state.round.awards).toEqual({ [host.id]: 15, [guest.id]: secondAward });
    expect(state.participants.map(player => player.score)).toEqual([15, secondAward]);
    const repeated = answer(state, guest.id, 4000 + gap);
    expect(repeated).toMatchObject({ changed: false, duplicate: true, right: true });
    expect(repeated.state.history).toHaveLength(1);
  });

  it('deduplicates wrong events, enforces the server cooldown and gives 5 after a retry', () => {
    let state = playing();
    const wrong = answer(state, host.id, 4000, 'ب', 'one-event');
    state = wrong.state;
    expect(wrong.right).toBe(false);
    expect(state.participants[0].score).toBe(0);
    expect(answer(state, host.id, 4100, 'ط', 'one-event')).toMatchObject({ changed: false, duplicate: true, right: false });
    expect(answer(state, host.id, 4699, 'ط', 'retry').error).toBe('answer_cooldown');
    state = answer(state, host.id, 4700, 'ط', 'retry').state;
    state = answer(state, guest.id, 4800).state;
    expect(state.round.awards).toEqual({ [host.id]: 5, [guest.id]: 15 });
    expect(state.round.answers[host.id].attempts).toBe(2);
    expect(publicDuelState(state, host.id, 4800).ownAnswer).toMatchObject({ done: true, right: true, tried: ['ب', 'ط'], attempts: 2, award: 5 });
  });

  it('requires a bounded event ID and a real option, ignoring client points and timestamps', () => {
    const state = playing();
    expect(answer(state, host.id, 4000, 'ط', '').error).toBe('invalid_event_id');
    expect(answer(state, host.id, 4000, 'ط', 'x'.repeat(129)).error).toBe('invalid_event_id');
    expect(answer(state, host.id, 4000, 'غ').error).toBe('invalid_option');
    const result = act(state, host.id, 'answer', 4000, { questionIndex: 0, eventId: 'valid', letter: 'ط', score: 999, answeredAt: 0 });
    expect(result.state.round.answers[host.id].answeredAt).toBe(4000);
    expect(result.state.participants[0].score).toBe(0);
  });

  it('settles a shared deadline once and refuses answers at the deadline', () => {
    let state = answer(playing(), host.id, 4000).state;
    state = heartbeatBoth(state, 9000);
    state = heartbeatBoth(state, 18000);
    const late = answer(state, guest.id, 23000);
    expect(late.state.status).toBe('review');
    expect(late.error).toBe('not_playing');
    expect(late.state.round.awards).toEqual({ [host.id]: 15, [guest.id]: 0 });
    const again = tickDuel(late.state, 23001);
    expect(again.state.participants.map(player => player.score)).toEqual([15, 0]);
    expect(again.state.history).toHaveLength(1);
  });

  it('settles a missed deadline before a later disconnection', () => {
    let state = playing();
    state = heartbeatBoth(state, 9000);
    state = heartbeatBoth(state, 18000);
    state = tickDuel(state, 29000).state;
    expect(state.status).toBe('paused');
    expect(state.pause.from).toBe('review');
    expect(state.round.settledAt).toBe(23000);
    expect(state.history).toHaveLength(1);
  });
});

describe('private question projection', () => {
  it('exposes only the shared frame and options, own feedback and the other completion flag', () => {
    let state = playing();
    state = answer(state, host.id, 4000, 'ب').state;
    state = answer(state, host.id, 4700).state;
    const guestView = publicDuelState(state, guest.id, 4800);
    expect(guestView.currentQuestion).toEqual({
      id: 'animal-0', index: 0, options: state.questions[0].options,
      image_url: '/opaque-picture.png', emoji: '🐱', frame: { before: 'قِ\u200d', after: '' },
    });
    expect(guestView.ownAnswer).toMatchObject({ done: false, right: null, tried: [], letter: null, award: null });
    expect(guestView.players.find(player => player.id === host.id)).toMatchObject({ done: true, score: 0 });
    expect(guestView.roundAwards).toBeNull();
    for (const forbidden of ['missing_letter', 'fullWord', 'displayWord', 'correctLetter', 'audio_url', 'events', 'answeredAt', 'answers']) {
      expect(JSON.stringify(guestView)).not.toContain(`"${forbidden}"`);
    }
    expect(JSON.stringify(guestView)).not.toContain('قِطٌّ');
    expect(JSON.stringify(guestView)).not.toContain('/opaque-speech.mp3');
    expect(guestView.currentQuestion.frame).not.toHaveProperty('text');
    expect(guestView.players[0]).not.toHaveProperty('right');
    guestView.currentQuestion.options.push('غ');
    expect(state.questions[0].options).toHaveLength(3);
  });

  it('reveals the canonical completed word only after settling and honors disabled sound', () => {
    let state = answer(playing(), host.id, 4000).state;
    state = answer(state, guest.id, 4100).state;
    expect(publicDuelState(state, guest.id, 4100).currentQuestion.review).toEqual({
      word: 'قِطٌّ', displayWord: 'قِطّ\u08f1', correctLetter: 'ط', audio_url: '/opaque-speech.mp3',
    });
    state.settings.soundEnabled = false;
    expect(publicDuelState(state, host.id, 4100).currentQuestion.review.audio_url).toBeNull();
    expect(state.questions[0].audio_url).toBe('/opaque-speech.mp3');
  });
});

describe('presence, fair resume, expiration and terminal idempotency', () => {
  it('pauses at the absence boundary and preserves time through a new shared countdown', () => {
    let state = playing();
    state = command(state, host.id, 'heartbeat', 9000);
    state = tickDuel(state, 10000).state;
    expect(state).toMatchObject({ status: 'paused', pause: { from: 'playing', pausedAt: 10000, expiresAt: 40000, remainingMs: 13000 } });
    expect(answer(state, host.id, 11000).error).toBe('room_paused');
    state = command(state, host.id, 'heartbeat', 18000);
    expect(state.status).toBe('paused');
    state = command(state, guest.id, 'heartbeat', 20000);
    expect(state).toMatchObject({ status: 'countdown', countdownUntil: 23000, round: { startedAt: 23000, deadline: 36000 } });
    expect(answer(state, host.id, 22000).error).toBe('not_playing');
    expect(tickDuel(state, 23000).state.status).toBe('playing');
    expect(publicDuelState(state, host.id, 22000).remainingMs).toBe(13000);
  });

  it('keeps a partially answered question private and preserves its earlier accepted answer through resume', () => {
    let state = answer(playing(), host.id, 4000).state;
    state = command(state, host.id, 'heartbeat', 9000);
    state = tickDuel(state, 10000).state;
    expect(state.status).toBe('paused');
    expect(publicDuelState(state, guest.id, 10000).currentQuestion).not.toHaveProperty('review');
    state = command(state, host.id, 'heartbeat', 15000);
    state = command(state, guest.id, 'heartbeat', 16000);
    expect(state.round.answers[host.id]).toMatchObject({ done: true, answeredAt: 4000 });
    state = tickDuel(state, 19000).state;
    state = answer(state, guest.id, 20000).state;
    expect(state.round.awards).toEqual({ [host.id]: 15, [guest.id]: 10 });
  });

  it('excludes disconnection and the resume countdown from the 500ms tie window', () => {
    let state = answer(playing(), host.id, 9800).state;
    state = tickDuel(state, 10000).state;
    state = command(state, host.id, 'heartbeat', 15000);
    state = command(state, guest.id, 'heartbeat', 16000);
    state = tickDuel(state, 19000).state;
    state = answer(state, guest.id, 19300).state;
    expect(state.round.answers[host.id].answeredElapsedMs).toBe(6800);
    expect(state.round.answers[guest.id].answeredElapsedMs).toBe(7300);
    expect(state.round.awards).toEqual({ [host.id]: 15, [guest.id]: 15 });
  });

  it('does not silently forgive a long missing heartbeat when a client reconnects', () => {
    let state = playing();
    state = command(state, host.id, 'heartbeat', 9000);
    state = command(state, host.id, 'heartbeat', 15000);
    expect(state.status).toBe('paused');
    expect(state.pause.pausedAt).toBe(10000);
    state = command(state, guest.id, 'heartbeat', 16000);
    expect(state.status).toBe('countdown');
    expect(state.round.deadline).toBe(32000);
  });

  it('cancels after 30 seconds of reconnect grace without settling or deducting scores', () => {
    let state = playing();
    state = command(state, host.id, 'heartbeat', 9000);
    state = tickDuel(state, 40000).state;
    expect(state).toMatchObject({ status: 'cancelled', cancelReason: 'reconnect_expired' });
    expect(state.participants.map(player => player.score)).toEqual([0, 0]);
    expect(state.history).toEqual([]);
    expect(command(state, guest.id, 'heartbeat', 40001)).toBe(state);
    expect(publicDuelState(state, host.id, 40001).currentQuestion).not.toHaveProperty('review');
  });

  it('expires unstarted rooms and permits participant cancellation without a loss', () => {
    const expired = tickDuel(create(), 30 * 60000).state;
    expect(expired).toMatchObject({ status: 'cancelled', cancelReason: 'waiting_expired' });
    expect(tickDuel(expired, 31 * 60000)).toMatchObject({ changed: false });
    const lateJoin = act(create(), guest.id, 'join', 30 * 60000, { participant: guest });
    expect(lateJoin).toMatchObject({ changed: true, error: 'room_closed', state: { status: 'cancelled' } });
    expect(lateJoin.state.participants).toHaveLength(1);
    const cancelled = command(playing(), guest.id, 'leave', 4000);
    expect(cancelled).toMatchObject({ status: 'cancelled', cancelReason: 'participant_left' });
    expect(command(cancelled, host.id, 'cancel', 5000)).toBe(cancelled);
  });

  it('finishes only after all selected questions settle, caps earned totals and never re-awards', () => {
    let state = playing();
    let at = 4000;
    for (let index = 0; index < 5; index += 1) {
      state = answer(state, host.id, at).state;
      state = answer(state, guest.id, at + 100).state;
      expect(state.history).toHaveLength(index + 1);
      expect(state.status).toBe(index === 4 ? 'finished' : 'review');
      if (index < 4) {
        state = command(state, host.id, 'next', at + 200, { questionIndex: index });
        state = command(state, guest.id, 'next', at + 200, { questionIndex: index });
        at += 3300;
        state = tickDuel(state, at - 100).state;
      }
    }
    expect(state.participants.map(player => player.score)).toEqual([75, 75]);
    expect(publicDuelState(state, host.id, at + 100).ownAnswer.award).toBe(15);
    expect(tickDuel(state, at + 100000)).toMatchObject({ state, changed: false });
    expect(answer(state, host.id, at + 200).state).toBe(state);
    expect(command(state, host.id, 'next', at + 200, { questionIndex: 4 })).toBe(state);
  });

  it('supports the command envelope and rejects missing server time', () => {
    const state = create();
    const joinedState = applyDuelCommand(state, { type: 'join', playerId: guest.id, participant: guest }, 100).state;
    expect(joinedState.participants).toHaveLength(2);
    expect(act(joinedState, host.id, 'heartbeat', undefined)).toMatchObject({ changed: false, error: 'invalid_server_time' });
    expect(() => publicDuelState(joinedState, host.id, NaN)).toThrow('invalid_server_time');
  });
});
