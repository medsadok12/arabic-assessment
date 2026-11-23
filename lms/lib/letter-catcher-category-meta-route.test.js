import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ rows: [], error: null, throws: false, reads: vi.fn(), auth: vi.fn() }));

vi.mock('./supabase-admin', () => ({
  createAdminClient: () => ({
    from: table => ({
      select: async fields => {
        db.reads(table, fields);
        if (db.throws) throw new Error('private database diagnostic');
        return { data: structuredClone(db.rows), error: db.error };
      },
    }),
  }),
}));
vi.mock('./supabase-server', () => ({
  createClient: () => ({ auth: { getUser: db.auth } }),
}));

const api = await import('../app/api/games/letter-catcher/categories/route');
const getCategories = async () => {
  const response = await api.GET();
  return { status: response.status, cacheControl: response.headers.get('cache-control'), body: await response.json() };
};

beforeEach(() => {
  db.rows = [];
  db.error = null;
  db.throws = false;
  db.reads.mockClear();
  db.auth.mockClear();
});

describe('Letter Catcher live category metadata', () => {
  it('normalizes legacy category aliases and returns uncached public metadata', async () => {
    db.rows = [
      { name: 'الطقس', emoji: '☀️', image_url: '/weather.png' },
      { name: 'الحيوانات', emoji: '🦁', image_url: '/savanna.png' },
    ];
    const result = await getCategories();
    expect(api.dynamic).toBe('force-dynamic');
    expect(result.status).toBe(200);
    expect(result.cacheControl).toBe('no-store, max-age=0');
    expect(result.body.categories).toEqual([
      { name: 'الحيوانات', emoji: '🦁', image_url: '/savanna.png' },
      { name: 'الجوّ والفصول', emoji: '☀️', image_url: '/weather.png' },
    ]);
    expect(db.reads).toHaveBeenCalledWith('lc_category_meta', '*');
    expect(db.auth).not.toHaveBeenCalled();
  });

  it('reads an edited teacher image URL on the next request', async () => {
    db.rows = [{ name: 'الحيوانات', emoji: '🦁', image_url: '/old-animal-island.png' }];
    const before = await getCategories();
    db.rows[0].image_url = '/updated-savanna-island.png';
    const after = await getCategories();
    expect(before.body.categories[0].image_url).toBe('/old-animal-island.png');
    expect(after.body.categories[0].image_url).toBe('/updated-savanna-island.png');
    expect(before.cacheControl).toBe('no-store, max-age=0');
    expect(after.cacheControl).toBe('no-store, max-age=0');
    expect(db.reads).toHaveBeenCalledTimes(2);
  });

  it('returns a friendly uncached empty list for query errors and unexpected failures', async () => {
    db.rows = [{ name: 'الحيوانات', image_url: '/stale.png' }];
    db.error = { message: 'private database diagnostic' };
    const queryFailure = await getCategories();
    db.error = null;
    db.throws = true;
    const unexpectedFailure = await getCategories();
    for (const result of [queryFailure, unexpectedFailure]) {
      expect(result).toEqual({ status: 200, cacheControl: 'no-store, max-age=0', body: { categories: [] } });
    }
  });
});
