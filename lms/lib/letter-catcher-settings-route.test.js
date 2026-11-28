import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: null, stored: null, readError: null, writeError: null, calls: [], writes: [],
}));

vi.mock('./supabase-server', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock('./supabase-admin', () => ({
  createAdminClient: () => ({
    from(table) {
      state.calls.push(['from', table]);
      const query = {
        select(...args) { state.calls.push(['select', ...args]); return query; },
        eq(...args) { state.calls.push(['eq', ...args]); return query; },
        async maybeSingle() {
          state.calls.push(['maybeSingle']);
          return { data: state.stored === null ? null : { settings: state.stored }, error: state.readError };
        },
        async upsert(payload, options) {
          state.calls.push(['upsert', options]);
          state.writes.push(payload);
          return { error: state.writeError };
        },
      };
      return query;
    },
  }),
}));

const { PUT } = await import('../app/api/games/letter-catcher/settings/route.js');
const SOLO = { words_per_round: 15, stage_size: 5, options_count: 4, progress_motion: false, victory_sound: true, loading_welcome: true, loading_welcome_motion: true };
const DUEL = {
  enabled: false,
  title: 'تحدي صديق',
  subtitle: 'العب مع صديقك واجمع النجوم',
  questionCount: 10,
  optionsCount: 3,
  soundEnabled: true,
  motionEnabled: true,
  encouragementEnabled: true,
};
const save = async body => {
  const response = await PUT(new Request('https://www.aarem.net/api/games/letter-catcher/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json() };
};

beforeEach(() => {
  state.user = { id: 'teacher-1', app_metadata: { role: 'teacher' } };
  state.stored = null;
  state.readError = null;
  state.writeError = null;
  state.calls = [];
  state.writes = [];
});

describe('PUT /api/games/letter-catcher/settings', () => {
  it.each(['teacher', 'admin', 'super_admin'])('allows the trusted %s role to save duel settings', async role => {
    state.user.app_metadata.role = role;
    const settings = { ...SOLO, duel: { ...DUEL, enabled: true, questionCount: 5 } };
    const result = await save(settings);
    expect(result).toEqual({ status: 200, body: { settings } });
    expect(state.calls).not.toContainEqual(['select', 'settings']);
    expect(state.writes).toEqual([{
      game_id: 'letter-catcher', settings, updated_at: expect.any(String), updated_by: 'teacher-1',
    }]);
    expect(state.calls).toContainEqual(['upsert', { onConflict: 'game_id' }]);
  });

  it.each([
    null, { id: 'student', app_metadata: { role: 'student' } }, { id: 'spoof', user_metadata: { role: 'admin' } },
    { id: 'suspended', app_metadata: { role: 'teacher', status: 'suspended' } },
  ])('rejects an unauthorized identity without database access: %j', async user => {
    state.user = user;
    expect(await save({ ...SOLO, duel: DUEL })).toEqual({ status: 403, body: { error: 'غير مخول' } });
    expect(state.calls).toEqual([]);
  });

  it('preserves every existing duel value when an older client saves only solo settings', async () => {
    const duel = {
      ...DUEL, enabled: true, title: 'أصدقاء الحروف', subtitle: 'هيا نلعب معا', questionCount: 7,
      soundEnabled: false, motionEnabled: false, encouragementEnabled: false,
    };
    state.stored = { words_per_round: 5, options_count: 3, progress_motion: true, duel };
    expect(await save(SOLO)).toEqual({ status: 200, body: { settings: { ...SOLO, duel } } });
    expect(state.calls).toContainEqual(['select', 'settings']);
    expect(state.calls).toContainEqual(['eq', 'game_id', 'letter-catcher']);
    expect(state.writes[0].settings.duel).toEqual(duel);
  });

  it('preserves saved stage size when an old editor omits it, independently of duel settings', async () => {
    state.stored = { ...SOLO, stage_size: 15, duel: DUEL };
    const { stage_size, ...legacy } = { ...SOLO, duel: DUEL };
    expect(await save(legacy)).toEqual({ status: 200, body: { settings: { ...legacy, stage_size: 15 } } });
    expect(state.calls).toContainEqual(['select', 'settings']);
    expect(state.writes[0].settings.words_per_round).toBe(SOLO.words_per_round);
  });

  it('adds disabled duel defaults when the old stored settings have no duel section', async () => {
    state.stored = { words_per_round: 20, options_count: 5 };
    expect(await save(SOLO)).toEqual({ status: 200, body: { settings: { ...SOLO, duel: DUEL } } });
  });

  it('allows a fresh installation to save old settings with disabled duel defaults', async () => {
    expect(await save(SOLO)).toEqual({ status: 200, body: { settings: { ...SOLO, duel: DUEL } } });
  });

  it('preserves both saved welcome flags when an older editor omits them', async () => {
    const { loading_welcome, loading_welcome_motion, ...legacy } = { ...SOLO, duel: DUEL };
    state.stored = { ...SOLO, loading_welcome: false, loading_welcome_motion: false, duel: DUEL };
    expect(await save(legacy)).toEqual({ status: 200, body: { settings: state.stored } });
    expect(state.calls).toContainEqual(['select', 'settings']);
    expect(state.writes[0].settings).toEqual(state.stored);
  });

  it('preserves a disabled victory sound when an older editor saves unrelated settings', async () => {
    const { victory_sound, ...legacy } = { ...SOLO, duel: DUEL };
    state.stored = { ...legacy, victory_sound: false };
    expect(await save(legacy)).toEqual({ status: 200, body: { settings: state.stored } });
  });

  it.each(['loading_welcome', 'loading_welcome_motion'])('preserves omitted %s independently while updating the other flag', async omitted => {
    const supplied = omitted === 'loading_welcome' ? 'loading_welcome_motion' : 'loading_welcome';
    state.stored = { ...SOLO, [omitted]: false, [supplied]: true, duel: DUEL };
    const request = { ...SOLO, [supplied]: false, duel: DUEL };
    delete request[omitted];
    const expected = { ...SOLO, [omitted]: false, [supplied]: false, duel: DUEL };
    expect(await save(request)).toEqual({ status: 200, body: { settings: expected } });
    expect(state.writes[0].settings).toEqual(expected);
  });

  it('applies welcome defaults for an old installation without changing unrelated solo values', async () => {
    const { loading_welcome, loading_welcome_motion, ...legacy } = { ...SOLO, duel: DUEL };
    state.stored = { words_per_round: 5, options_count: 3 };
    expect(await save(legacy)).toEqual({ status: 200, body: { settings: { ...SOLO, duel: DUEL } } });
  });

  it('saves explicitly disabled welcome flags without resetting progress or duel effects', async () => {
    const settings = { ...SOLO, loading_welcome: false, loading_welcome_motion: false, duel: { ...DUEL, enabled: true, motionEnabled: false } };
    expect(await save(settings)).toEqual({ status: 200, body: { settings } });
    expect(state.calls).not.toContainEqual(['select', 'settings']);
    expect(state.writes[0].settings).toEqual(settings);
  });

  it('disables duel while preserving its text, question count, and optional effects', async () => {
    const duel = { ...DUEL, title: 'لعبتنا', subtitle: 'مع الأصدقاء', questionCount: 8, soundEnabled: false };
    expect(await save({ ...SOLO, duel })).toEqual({ status: 200, body: { settings: { ...SOLO, duel } } });
    expect(state.writes[0].settings.duel).toEqual(duel);
  });

  it.each([
    { words_per_round: 7 },
    { stage_size: 0 },
    { stage_size: 7 },
    { stage_size: [5] },
    { stage_size: null },
    { options_count: 9 },
    { progress_motion: 'false' },
    { victory_sound: 'false' },
    { loading_welcome: 'false' },
    { loading_welcome: 0 },
    { loading_welcome_motion: null },
    { loading_welcome_motion: [] },
    { duel: null },
    { duel: { ...DUEL, enabled: 'true' } },
    { duel: { ...DUEL, questionCount: 4 } },
    { duel: { ...DUEL, questionCount: 11 } },
    { duel: { ...DUEL, questionCount: 5.5 } },
    { duel: { ...DUEL, questionCount: [5] } },
    { duel: { ...DUEL, optionsCount: [3] } },
    { duel: { ...DUEL, optionsCount: 4 } },
    { duel: { ...DUEL, title: '' } },
    { duel: { ...DUEL, soundEnabled: 0 } },
    { duel: { ...DUEL, motionEnabled: null } },
    { duel: { ...DUEL, encouragementEnabled: 'false' } },
  ])('rejects invalid supplied settings before database access: %j', async invalid => {
    expect(await save({ ...SOLO, duel: DUEL, ...invalid })).toEqual({ status: 400, body: { error: 'قيم الإعدادات غير صالحة' } });
    expect(state.calls).toEqual([]);
    expect(state.writes).toEqual([]);
  });

  it('does not overwrite duel if the old-settings preservation read fails', async () => {
    state.readError = { message: 'private backend SELECT error', code: '42P01' };
    expect(await save(SOLO)).toEqual({ status: 500, body: { error: 'تعذر حفظ الإعدادات. حاول مرة أخرى.' } });
    expect(state.writes).toEqual([]);
  });

  it('returns an Arabic save error without exposing the backend failure', async () => {
    state.writeError = { message: 'private backend UPSERT error', code: '42501' };
    expect(await save({ ...SOLO, duel: DUEL })).toEqual({ status: 500, body: { error: 'تعذر حفظ الإعدادات. حاول مرة أخرى.' } });
  });
});
