// تخزين محلي آمن: لا ينهار التطبيق إن كان التخزين محجوباً (التصفح الخاص مثلاً)
export const STORE = {
  key:          'masareef.key',
  name:         'masareef.name',
  cache:        'masareef.cache',
  queue:        'masareef.queue',
  invitePrompt: 'masareef.invitePrompt',
};

export const browserStorage = {
  read(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* التخزين غير متاح */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* التخزين غير متاح */ }
  },
};

export function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    read: (key, fallback = null) => (data.has(key) ? JSON.parse(data.get(key)) : fallback),
    write: (key, value) => { data.set(key, JSON.stringify(value)); },
    remove: (key) => { data.delete(key); },
  };
}
