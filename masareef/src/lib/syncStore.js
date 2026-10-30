import { STORE } from './storage.js';

// حالة الدفتر على هذا الجهاز:
// - كل تعديل يظهر فوراً (تحديث متفائل) ويُحفظ محلياً في طابور.
// - الطابور يُرسَل للخادم بالترتيب؛ عند انقطاع الإنترنت يبقى محفوظاً ويُعاد إرساله لاحقاً.
// - التحميل من الخادم يُطبَّق عليه ما بقي في الطابور حتى لا تختفي تعديلات لم تُرسَل بعد.

export function applyOps(snapshot, ops) {
  let { space, items } = snapshot;
  for (const op of ops) {
    if (op.kind === 'upsert') {
      items = items.some(item => item.id === op.item.id)
        ? items.map(item => (item.id === op.item.id ? op.item : item))
        : [...items, op.item];
    } else if (op.kind === 'delete') {
      items = items.filter(item => item.id !== op.id);
    } else if (op.kind === 'space') {
      space = { ...space, ...op.space };
    }
  }
  return { space, items };
}

export class SyncStore {
  #listeners = new Set();
  #queue;
  #state;
  #flushing = null;
  #refreshing = null;
  #version = 0;

  constructor({ key, api, storage, now = () => new Date() }) {
    this.key = key;
    this.api = api;
    this.storage = storage;
    this.now = now;

    const cache = storage.read(STORE.cache);
    const cached = cache?.key === key ? cache : null;
    this.#queue = storage.read(STORE.queue, []).filter(op => op.key === key);
    this.#state = {
      space: cached?.space ?? null,
      items: cached?.items ?? [],
      status: cached ? (this.#queue.length ? 'saving' : 'synced') : 'loading',
      pending: this.#queue.length,
      error: null,
    };
  }

  subscribe = listener => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getState = () => this.#state;

  #set(patch) {
    this.#state = { ...this.#state, ...patch };
    this.#listeners.forEach(listener => listener());
  }

  #persist() {
    this.storage.write(STORE.cache, { key: this.key, space: this.#state.space, items: this.#state.items });
    const others = this.storage.read(STORE.queue, []).filter(op => op.key !== this.key);
    this.storage.write(STORE.queue, [...others, ...this.#queue]);
  }

  #enqueue(op) {
    this.#version += 1;
    this.#queue.push({ ...op, key: this.key });
    this.#set({ ...applyOps(this.#state, [op]), pending: this.#queue.length, status: 'saving' });
    this.#persist();
    this.flush();
  }

  saveItem(item) {
    const stamp = this.now().toISOString();
    const existing = this.#state.items.find(i => i.id === item.id);
    this.#enqueue({
      kind: 'upsert',
      item: { ...item, created_at: existing?.created_at ?? item.created_at ?? stamp, updated_at: stamp },
    });
  }

  removeItem(id) {
    const removed = this.#state.items.find(item => item.id === id) ?? null;
    if (removed) this.#enqueue({ kind: 'delete', id });
    return removed;
  }

  saveSpace(patch) {
    this.#enqueue({ kind: 'space', space: { ...this.#state.space, ...patch } });
  }

  clearError() {
    if (this.#state.error) this.#set({ error: null });
  }

  #send(op) {
    if (op.kind === 'upsert') return this.api.upsertItem(this.key, op.item);
    if (op.kind === 'delete') return this.api.deleteItem(this.key, op.id);
    return this.api.saveSpace(this.key, op.space);
  }

  // يعيد true إن فرغ الطابور، و false إن بقي فيه ما ينتظر عودة الاتصال
  flush() {
    if (this.#flushing) return this.#flushing;
    this.#flushing = (async () => {
      let sent = false;
      let rejected = false;
      while (this.#queue.length) {
        const op = this.#queue[0];
        try {
          await this.#send(op);
          sent = true;
        } catch (err) {
          if (err.transient) {
            this.#set({ status: 'offline' });
            return false;
          }
          // رفضه الخادم نهائياً (بيانات غير صالحة): نتخلى عنه ونعيد الحالة من الخادم
          rejected = true;
        }
        this.#queue.shift();
        this.#persist();
        this.#set({ pending: this.#queue.length });
      }
      if (sent) this.api.notifyPartner(this.key);
      if (rejected) {
        this.#set({ error: 'تعذّر حفظ أحد التعديلات، أعدنا الدفتر إلى آخر نسخة محفوظة.' });
        this.#version += 1;
        setTimeout(() => this.refresh(), 0);
      }
      this.#set({ status: 'synced' });
      return true;
    })().finally(() => { this.#flushing = null; });
    return this.#flushing;
  }

  refresh() {
    if (this.#refreshing) return this.#refreshing;
    this.#refreshing = (async () => {
      if (!(await this.flush())) return;
      const version = this.#version;
      try {
        const [space, items] = await Promise.all([this.api.fetchSpace(this.key), this.api.fetchItems(this.key)]);
        if (!space) {
          this.#set({ status: 'missing' });
          return;
        }
        // عُدِّل شيء محلياً أثناء التحميل: النتيجة قديمة، نعيد التحميل بعد الإرسال
        if (version !== this.#version) {
          setTimeout(() => this.refresh(), 0);
          return;
        }
        this.#set({ ...applyOps({ space, items }, this.#queue), status: this.#queue.length ? 'saving' : 'synced' });
        this.#persist();
      } catch (err) {
        this.#set({ status: err.transient ? 'offline' : 'error' });
      }
    })().finally(() => { this.#refreshing = null; });
    return this.#refreshing;
  }
}
