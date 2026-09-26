const CACHE = 'aarem-v3';

const PRECACHE = [
  '/',
  '/auth/login',
  '/manifest.json',
  '/logo.svg',
];

// ── Install: pre-cache shell ────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ─────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch strategy ──────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // API + Supabase: network only (no caching)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return;

  // Navigation (HTML pages): NETWORK ONLY — الصفحات لا تُخزَّن أبداً في كاش الـSW.
  // فقط عند انقطاع الإنترنت فعلياً نعرض الهيكل المخزَّن مسبقاً كي لا تظهر شاشة خطأ.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets (hashed, immutable): cache-first → network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// ── skipWaiting message (triggered by update banner) ────────────────────────
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
