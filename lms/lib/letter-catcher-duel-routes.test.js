import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const PARENT = '10000000-0000-4000-8000-000000000001';
const A = '20000000-0000-4000-8000-000000000001';
const B = '20000000-0000-4000-8000-000000000002';
const C = '20000000-0000-4000-8000-000000000003';
const db = vi.hoisted(() => ({ tables: {}, user: null, fail: null, conflicts: 0, rateAllowed: true, attempts: [], identities: [] }));

vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: db.user } }) } }) }));
vi.mock('./active-child', () => ({ resolveActiveIdentity: async (user, _admin, request) => {
  const child = new URL(request.url).searchParams.get('child');
  db.identities.push(child);
  return child && child !== 'self' ? { effectiveUserId: child, viewingChild: { id: child, full_name: child.endsWith('1') ? 'سارة محمد' : 'يوسف محمد' } } : { effectiveUserId: user.id, viewingChild: null };
} }));
vi.mock('./supabase-admin', () => {
  const field = (row, key) => key === 'state->>status' ? row.state.status : row[key];
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.operation = 'read'; this.one = false; }
    select() { return this; }
    eq(key, value) { this.filters.push(row => field(row, key) === value); return this; }
    in(key, values) { this.filters.push(row => values.includes(field(row, key))); return this; }
    order(key) { this.sort = key; return this; }
    limit(count) { this.max = count; return this; }
    maybeSingle() { this.one = true; return this; }
    single() { this.one = true; return this; }
    insert(payload) { this.operation = 'insert'; this.payload = payload; return this; }
    update(payload) { this.operation = 'update'; this.payload = payload; return this; }
    then(resolve, reject) {
      return Promise.resolve().then(() => {
        if (db.fail === `${this.table}:${this.operation}`) return { data: null, error: { code: 'TEST_FAILURE' } };
        const rows = db.tables[this.table] ||= [];
        let matches = rows.filter(row => this.filters.every(filter => filter(row)));
        if (this.operation === 'insert') {
          const keys = this.table === 'game_settings' ? ['game_id'] : this.table === 'user_points' ? ['user_id'] : this.table === 'letter_catcher_duels' ? ['id', 'code'] : [];
          if (keys.some(key => rows.some(row => row[key] === this.payload[key]))) return { data: null, error: { code: '23505' } };
          const row = { id: randomUUID(), ...structuredClone(this.payload) };
          rows.push(row); matches = [row];
        } else if (this.operation === 'update') {
          db.attempts.push({ table: this.table, filters: this.filters.length });
          if (this.table === 'letter_catcher_duels' && db.conflicts > 0) { db.conflicts--; return { data: null, error: null }; }
          matches.forEach(row => Object.assign(row, structuredClone(this.payload)));
        } else {
          if (this.sort) matches.sort((a, b) => String(a[this.sort]).localeCompare(String(b[this.sort])));
          if (this.max) matches = matches.slice(0, this.max);
        }
        return { data: structuredClone(this.one ? matches[0] || null : matches), error: null };
      }).then(resolve, reject);
    }
  }
  return { createAdminClient: () => ({ from: table => new Query(table), rpc: async () => ({ data: db.rateAllowed }) }) };
});

const api = await import('../app/api/games/letter-catcher/duel/route');
const words = () => ['قِطٌّ', 'كَلْبٌ', 'أَسَدٌ', 'فيلٌ', 'نَمِرٌ', 'جَمَلٌ', 'ذِئْبٌ', 'بَقَرَةٌ', 'حِمارٌ', 'ثَعْلَبٌ'].map((word, index) => {
  const correct = [...word][0];
  return { id: `animal-${index}`, word, missing_letter: correct, options: [...new Set([correct, 'س', 'ش', 'ز'])], category: 'الحيوانات', topic: 'الحيوانات', emoji: '🐾', image_url: `/animal-${index}.png`, audio_url: `/animal-${index}.mp3` };
});
const call = async (body, child = A) => {
  const response = await api.POST(new Request(`https://www.aarem.net/api/games/letter-catcher/duel?child=${child}`, { method: 'POST', body: JSON.stringify(body) }));
  return { status: response.status, body: await response.json(), headers: response.headers };
};
const poll = async (code, child = A) => {
  const response = await api.GET(new Request(`https://www.aarem.net/api/games/letter-catcher/duel?code=${code}&child=${child}`));
  return { status: response.status, body: await response.json() };
};
const stored = code => db.tables.letter_catcher_duels.find(row => row.code === code);
const create = async (extra = {}) => {
  const response = await call({ action: 'create', ...extra });
  expect(response.status).toBe(200);
  return response.body.room;
};
const start = async () => {
  const room = await create();
  expect((await call({ action: 'join', code: room.code }, B)).status).toBe(200);
  const ready = await Promise.all([call({ action: 'ready', code: room.code }, A), call({ action: 'ready', code: room.code }, B)]);
  expect(ready.map(result => result.status)).toEqual([200, 200]);
  vi.setSystemTime(Date.now() + 3001);
  expect((await poll(room.code)).body.room.status).toBe('playing');
  return room.code;
};
const answer = (code, child, extra = {}) => {
  const row = stored(code);
  return call({ action: 'answer', code, questionIndex: row.state.questionIndex, eventId: randomUUID(), letter: row.state.questions[row.state.questionIndex].missing_letter, ...extra }, child);
};
const complete = async code => {
  for (let index = stored(code).state.questionIndex; index < stored(code).state.questions.length; index++) {
    const results = await Promise.all([answer(code, A), answer(code, B)]);
    expect(results.map(result => result.status)).toEqual([200, 200]);
    if (index < stored(code).state.questions.length - 1) {
      await Promise.all([call({ action: 'next', code, questionIndex: index }, A), call({ action: 'next', code, questionIndex: index }, B)]);
      vi.setSystemTime(Date.now() + 3001);
      await poll(code, A);
    }
  }
};

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-22T12:00:00Z'));
  db.user = { id: PARENT, app_metadata: { role: 'student' }, user_metadata: { full_name: 'اسم الوالد', role: 'super_admin' } };
  db.fail = null; db.conflicts = 0; db.rateAllowed = true; db.attempts = []; db.identities = [];
  db.tables = { game_settings: [{ game_id: 'letter-catcher', settings: { duel: { enabled: true, questionCount: 5 } } }], letter_catcher_words: words(), letter_catcher_duels: [], points_log: [], user_points: [{ user_id: A, total: 10 }, { user_id: B, total: 20 }] };
});
afterEach(() => vi.useRealTimers());

describe('Letter Catcher duel server and routes', () => {
  it('authenticates trusted roles and rejects guests, suspension and metadata role forgery', async () => {
    db.user = null; expect((await call({ action: 'create' })).status).toBe(401);
    db.user = { id: PARENT, app_metadata: { role: 'student', status: 'suspended' } }; expect((await call({ action: 'create' })).status).toBe(401);
    db.user = { id: PARENT, app_metadata: {}, user_metadata: { role: 'teacher' } }; expect((await call({ action: 'create' })).status).toBe(401);
    expect(db.tables.letter_catcher_duels).toHaveLength(0);
  });

  it('snapshots only real animal words, ignores forged creation inputs and keeps private answers off the wire', async () => {
    db.tables.letter_catcher_words.unshift({ ...words()[0], id: 'school-pretending', category: 'المدرسة', topic: 'الحيوانات' });
    const room = await create({ userId: C, code: '123456', questions: [{ word: 'اختراق' }], settings: { questionCount: 1 }, points: 99999 });
    expect(room.code).toMatch(/^[0-9]{6}$/);
    expect(room.totalQuestions).toBe(5);
    expect(room.currentQuestion).toBeNull();
    expect(room.players[0]).toMatchObject({ id: A, name: 'سارة', score: 0 });
    expect(stored(room.code).state.questions.every(question => question.category === 'الحيوانات')).toBe(true);
    expect(stored(room.code).state.questions.some(question => question.id === 'school-pretending')).toBe(false);
    expect(JSON.stringify(room)).not.toMatch(/missing_letter|fullWord|user_metadata|اسم الوالد|questions|correctLetter/);
    expect((await call({ action: 'create' })).headers.get('cache-control')).toContain('no-store');
  });

  it('refuses insufficient, duplicate or invalid edited words instead of falling back', async () => {
    db.tables.letter_catcher_words = words().slice(0, 4);
    expect((await call({ action: 'create' })).status).toBe(409);
    db.tables.letter_catcher_words.push({ ...words()[0], id: 'duplicate-word' });
    expect((await call({ action: 'create' })).status).toBe(409);
    db.tables.letter_catcher_words = words().map(word => ({ ...word, options: [] }));
    expect((await call({ action: 'create' })).status).toBe(409);
    expect(db.tables.letter_catcher_duels).toHaveLength(0);
  });

  it('separates siblings under the same parent and restricts reading and membership to two identities', async () => {
    const room = await create();
    expect((await call({ action: 'join', code: room.code }, A)).status).toBe(409);
    expect((await poll(room.code, B)).status).toBe(404);
    expect((await call({ action: 'join', code: room.code, playerId: A, name: 'مزور' }, B)).body.room.players[1]).toMatchObject({ id: B, name: 'يوسف' });
    expect((await call({ action: 'join', code: room.code }, C)).status).toBe(409);
    expect((await call({ action: 'ready', code: room.code, userId: A }, C)).status).toBe(404);
    expect((await poll(room.code, C)).status).toBe(404);
    expect(db.identities).toContain(A); expect(db.identities).toContain(B);
  });

  it('blocks new rooms and joins when disabled while keeping members able to read, leave and claim results', async () => {
    const room = await create();
    db.tables.game_settings[0].settings.duel.enabled = false;
    expect((await call({ action: 'create' })).status).toBe(403);
    expect((await call({ action: 'join', code: room.code }, B)).status).toBe(403);
    expect((await poll(room.code)).status).toBe(200);
    expect((await call({ action: 'leave', code: room.code })).body.room.status).toBe('cancelled');
    expect((await call({ action: 'result', code: room.code })).status).toBe(409);
    expect(db.tables.points_log).toHaveLength(0);
  });

  it('persists an expired waiting room without returning a room to the unsuccessful joiner', async () => {
    const room = await create();
    vi.setSystemTime(Date.now() + 31 * 60 * 1000);
    const result = await call({ action: 'join', code: room.code }, B);
    expect(result.status).toBe(409);
    expect(result.body).not.toHaveProperty('room');
    expect(stored(room.code).state.status).toBe('cancelled');
    expect(stored(room.code).state.participants).toHaveLength(1);
  });

  it('uses atomic compare-and-swap for simultaneous readiness and answers and never trusts supplied clocks or scores', async () => {
    const code = await start();
    const before = await poll(code, B);
    expect(before.body.room.currentQuestion).not.toHaveProperty('review');
    expect(before.body.room.currentQuestion).not.toHaveProperty('missing_letter');
    const eventId = randomUUID();
    const results = await Promise.all([answer(code, A, { eventId, now: 0, answeredAt: 0, score: 9999, award: 9999 }), answer(code, B)]);
    expect(results.map(result => result.status)).toEqual([200, 200]);
    expect(stored(code).state.participants.map(player => player.score)).toEqual([15, 15]);
    expect(stored(code).state.history).toHaveLength(1);
    expect((await answer(code, A, { eventId })).status).toBe(200);
    expect(stored(code).state.participants.map(player => player.score)).toEqual([15, 15]);
    expect(db.attempts.filter(attempt => attempt.table === 'letter_catcher_duels').every(attempt => attempt.filters === 2)).toBe(true);
  });

  it('caps conflict retries, persists no fabricated command, and returns friendly errors', async () => {
    const room = await create();
    db.conflicts = 6;
    const result = await call({ action: 'join', code: room.code }, B);
    expect(result.status).toBe(409);
    expect(stored(room.code).state.participants).toHaveLength(1);
    expect(db.attempts.filter(attempt => attempt.table === 'letter_catcher_duels')).toHaveLength(6);
    const invalid = await call({ action: 'answer', code: room.code, questionIndex: 0, eventId: randomUUID(), letter: 'حرف طويل' });
    expect(invalid.status).toBe(400);
    expect((await call({ action: 'ready', code: room.code })).body.error).not.toMatch(/not_ready|stale_question/);
  });

  it('awards only finished server scores once per effective child even under concurrent claims', async () => {
    const code = await start();
    expect((await call({ action: 'result', code })).status).toBe(409);
    await complete(code);
    expect(stored(code).state.status).toBe('finished');
    db.tables.game_settings[0].settings.duel.enabled = false;
    const responses = await Promise.all([call({ action: 'result', code, amount: 99999 }, A), call({ action: 'result', code }, A), call({ action: 'result', code }, B)]);
    expect(responses.map(result => result.status)).toEqual([200, 200, 200]);
    expect(db.tables.user_points).toEqual([{ user_id: A, total: 85, updated_at: expect.any(String) }, { user_id: B, total: 95, updated_at: expect.any(String) }]);
    expect(db.tables.points_log).toHaveLength(2);
    await call({ action: 'result', code }, A);
    expect(db.tables.points_log).toHaveLength(2);
    expect(db.tables.game_settings.filter(row => row.game_id.startsWith('verified:letter-catcher-duel:'))).toHaveLength(2);
    expect(db.tables.points_log.every(row => row.user_id !== PARENT)).toBe(true);
  });

  it('enforces account/IP rate limits without letting a client select a rate bucket', async () => {
    db.rateAllowed = false;
    expect((await call({ action: 'create' })).status).toBe(429);
    expect((await call({ action: 'join', code: '123456' })).status).toBe(429);
    expect((await poll('123456')).status).toBe(429);
    expect(db.tables.letter_catcher_duels).toHaveLength(0);
  });

  it('reports unfinished staff reset work after repeated concurrent room writes', async () => {
    const room = await create();
    db.user.app_metadata.role = 'teacher'; db.conflicts = 6;
    expect((await call({ action: 'reset' })).body).toEqual({ resetCount: 0, remaining: true });
    expect(stored(room.code).state.status).toBe('waiting');
    expect((await call({ action: 'reset' })).body).toEqual({ resetCount: 1, remaining: false });
  });

  it('lets staff soft-cancel open rooms only and preserves finished history and awards', async () => {
    const code = await start(); await complete(code);
    await call({ action: 'result', code });
    const finished = structuredClone(stored(code));
    const room = await create();
    expect((await call({ action: 'reset' })).status).toBe(403);
    db.user.app_metadata.role = 'teacher';
    expect((await call({ action: 'reset' })).body).toEqual({ resetCount: 1, remaining: false });
    expect(stored(room.code).state).toMatchObject({ status: 'cancelled', cancelReason: 'staff-reset' });
    expect(stored(code)).toEqual(finished);
    expect(db.tables.points_log).toHaveLength(1);
    const preview = await start(); await complete(preview);
    expect((await call({ action: 'result', code: preview })).body.award).toMatchObject({ preview: true, amount: 0 });
    expect(db.tables.points_log).toHaveLength(1);
  });

  it('fails closed when settings, source words or saved command storage cannot be read', async () => {
    db.fail = 'game_settings:read'; expect((await call({ action: 'create' })).status).toBe(503);
    db.fail = 'letter_catcher_words:read'; expect((await call({ action: 'create' })).status).toBe(503);
    db.fail = null; const room = await create();
    db.fail = 'letter_catcher_duels:update'; expect((await call({ action: 'join', code: room.code }, B)).status).toBe(503);
    expect(stored(room.code).state.participants).toHaveLength(1);
    expect(db.tables.points_log).toHaveLength(0);
  });

  it('creates a service-only additive migration with explicit restrictive client denial', () => {
    const sql = readFileSync(new URL('../supabase/letter_catcher_duels.sql', import.meta.url), 'utf8');
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/AS RESTRICTIVE FOR ALL TO anon, authenticated USING \(false\) WITH CHECK \(false\)/);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public.letter_catcher_duels FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/TO service_role/);
    expect(sql).not.toMatch(/SECURITY DEFINER|ALTER TABLE public\.challenge_rooms|UPDATE public\.letter_catcher_words|supabase_realtime/);
  });
});
