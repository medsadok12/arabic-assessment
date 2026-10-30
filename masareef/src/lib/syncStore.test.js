import { describe, expect, it, vi } from 'vitest';
import { SyncStore } from './syncStore.js';
import { memoryStorage, STORE } from './storage.js';
import { ApiError } from './api.js';

const KEY = 'abcdefghjkmnpq23';
const SPACE = { title: 'تحضيرات زواجنا', currency: 'TND', wedding_date: '2027-06-20' };

// خادم وهمي في الذاكرة يحاكي الطلبات، مع إمكانية قطع الاتصال
function fakeServer({ items = [], space = SPACE } = {}) {
  const db = { space, items: new Map(items.map(i => [i.id, i])), online: true, calls: [] };
  const guard = name => {
    db.calls.push(name);
    if (!db.online) throw new ApiError('Failed to fetch', 0);
  };
  db.api = {
    fetchSpace: async () => { guard('fetchSpace'); return db.space; },
    fetchItems: async () => { guard('fetchItems'); return [...db.items.values()]; },
    saveSpace: async (_key, value) => { guard('saveSpace'); db.space = value; },
    upsertItem: async (_key, value) => {
      guard('upsertItem');
      if (value.price < 0) throw new ApiError('violates check constraint', 400);
      db.items.set(value.id, value);
    },
    deleteItem: async (_key, id) => { guard('deleteItem'); db.items.delete(id); },
    notifyPartner: vi.fn(),
  };
  return db;
}

const tick = () => new Promise(resolve => setTimeout(resolve, 5));
const hall = { id: 'a1', name: 'حجز القاعة', price: 8000, category: 'القاعة', status: 'soon', item_date: '2026-11-20' };

describe('SyncStore', () => {
  it('loads the notebook from the server', async () => {
    const server = fakeServer({ items: [hall] });
    const store = new SyncStore({ key: KEY, api: server.api, storage: memoryStorage() });
    expect(store.getState().status).toBe('loading');
    await store.refresh();
    expect(store.getState()).toMatchObject({ status: 'synced', space: SPACE, items: [hall] });
  });

  it('shows changes instantly and saves them to the server', async () => {
    const server = fakeServer();
    const storage = memoryStorage();
    const store = new SyncStore({ key: KEY, api: server.api, storage });
    const listener = vi.fn();
    store.subscribe(listener);

    store.saveItem(hall);
    expect(store.getState().items).toHaveLength(1);
    expect(store.getState().status).toBe('saving');
    expect(listener).toHaveBeenCalled();

    await store.flush();
    expect(server.items.get('a1')).toMatchObject({ name: 'حجز القاعة', price: 8000 });
    expect(store.getState()).toMatchObject({ status: 'synced', pending: 0 });
    expect(server.api.notifyPartner).toHaveBeenCalledWith(KEY);
    expect(storage.read(STORE.cache).items).toHaveLength(1);
  });

  it('keeps edits while offline and sends them when back online', async () => {
    const server = fakeServer({ items: [hall] });
    const storage = memoryStorage();
    const store = new SyncStore({ key: KEY, api: server.api, storage });
    await store.refresh();

    server.online = false;
    store.saveItem({ ...hall, status: 'bought' });
    store.saveItem({ id: 'b2', name: 'فستان', price: 1200, category: 'الملابس', status: 'soon', item_date: '2026-12-01' });
    await tick();
    expect(store.getState()).toMatchObject({ status: 'offline', pending: 2 });
    expect(store.getState().items.map(i => i.id)).toEqual(['a1', 'b2']);

    // إعادة فتح التطبيق دون اتصال: الطابور والنسخة المحلية محفوظان
    const reopened = new SyncStore({ key: KEY, api: server.api, storage });
    expect(reopened.getState()).toMatchObject({ pending: 2 });
    expect(reopened.getState().items.find(i => i.id === 'a1').status).toBe('bought');

    server.online = true;
    await reopened.refresh();
    expect(reopened.getState()).toMatchObject({ status: 'synced', pending: 0 });
    expect(server.items.get('a1').status).toBe('bought');
    expect(server.items.get('b2').name).toBe('فستان');
  });

  it('applies pending edits on top of fresh server data', async () => {
    const server = fakeServer({ items: [hall] });
    const store = new SyncStore({ key: KEY, api: server.api, storage: memoryStorage() });
    await store.refresh();

    server.online = false;
    store.removeItem('a1');
    await tick();
    // الشريك أضاف بنداً من جهازه
    server.items.set('c3', { ...hall, id: 'c3', name: 'ذهب' });
    server.online = true;
    await store.refresh();
    expect(store.getState().items.map(i => i.id)).toEqual(['c3']);
    expect(server.items.has('a1')).toBe(false);
  });

  it('drops a change the server rejects and restores the saved version', async () => {
    const server = fakeServer({ items: [hall] });
    const store = new SyncStore({ key: KEY, api: server.api, storage: memoryStorage() });
    await store.refresh();

    store.saveItem({ ...hall, price: -1 });
    expect(store.getState().items[0].price).toBe(-1);
    await store.flush();
    expect(store.getState().error).toMatch(/تعذّر حفظ/);
    await tick();
    await store.refresh();
    expect(store.getState().items[0].price).toBe(8000);
    store.clearError();
    expect(store.getState().error).toBeNull();
  });

  it('supports undo after delete', async () => {
    const server = fakeServer({ items: [hall] });
    const store = new SyncStore({ key: KEY, api: server.api, storage: memoryStorage() });
    await store.refresh();
    const removed = store.removeItem('a1');
    await store.flush();
    expect(server.items.size).toBe(0);
    store.saveItem(removed);
    await store.flush();
    expect(server.items.get('a1').name).toBe('حجز القاعة');
  });

  it('saves notebook settings', async () => {
    const server = fakeServer();
    const store = new SyncStore({ key: KEY, api: server.api, storage: memoryStorage() });
    await store.refresh();
    store.saveSpace({ currency: 'SAR' });
    expect(store.getState().space.currency).toBe('SAR');
    await store.flush();
    expect(server.space).toEqual({ ...SPACE, currency: 'SAR' });
  });

  it('reports a notebook that no longer exists', async () => {
    const server = fakeServer({ space: null });
    const store = new SyncStore({ key: KEY, api: server.api, storage: memoryStorage() });
    await store.refresh();
    expect(store.getState().status).toBe('missing');
  });

  it('ignores cached data from another notebook', () => {
    const storage = memoryStorage({ [STORE.cache]: { key: 'other-key', space: SPACE, items: [hall] } });
    const store = new SyncStore({ key: KEY, api: fakeServer().api, storage });
    expect(store.getState()).toMatchObject({ items: [], status: 'loading' });
  });
});
