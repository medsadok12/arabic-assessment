// Keep the current/nearby pictures decoded without retaining the whole word bank.
const MAX_IMAGES = 6;
const imageCache = new Map();

/**
 * Resolve true once the image is loaded and decoded; never reject or wait forever.
 * Concurrent calls share a URL's first request (including its timeout).
 */
export function preloadLetterCatcherImage(url, { timeoutMs = 5000 } = {}) {
  if (typeof url !== 'string' || !url.trim() || typeof Image === 'undefined') {
    return Promise.resolve(false);
  }
  const key = url.trim();
  const cached = imageCache.get(key);
  if (cached) {
    imageCache.delete(key);
    imageCache.set(key, cached);
    return cached.promise;
  }

  let image;
  try { image = new Image(); } catch { return Promise.resolve(false); }
  let settled = false, decoding = false, timer, resolve;
  const entry = { image, promise: new Promise(done => { resolve = done; }), discard: null };
  const release = () => {
    if (!entry.image) return;
    entry.image.onload = null;
    entry.image.onerror = null;
    entry.image.removeAttribute('src');
    entry.image = null;
  };
  const finish = ready => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    image.onload = null;
    image.onerror = null;
    if (!ready) {
      if (imageCache.get(key) === entry) imageCache.delete(key);
      release();
    }
    resolve(ready);
  };
  entry.discard = () => { finish(false); release(); };
  image.onload = () => {
    if (settled || decoding) return;
    if (!image.naturalWidth) { finish(false); return; }
    decoding = true;
    if (typeof image.decode !== 'function') { finish(true); return; }
    try { Promise.resolve(image.decode()).then(() => finish(true), () => finish(false)); }
    catch { finish(false); }
  };
  image.onerror = () => finish(false);
  image.decoding = 'async';
  imageCache.set(key, entry);
  while (imageCache.size > MAX_IMAGES) {
    const oldest = imageCache.keys().next().value;
    const evicted = imageCache.get(oldest);
    imageCache.delete(oldest);
    evicted.discard();
  }
  timer = setTimeout(() => finish(false), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000);
  try {
    image.src = key;
    // A browser-cached image can be complete before a load event is observed.
    if (image.complete && image.naturalWidth > 0) image.onload?.();
  } catch { finish(false); }
  return entry.promise;
}

/** Warm only the next two queue entries, never the whole round. */
export function warmLetterCatcherImages(queue, currentIndex) {
  if (!Array.isArray(queue)) return Promise.resolve([]);
  const start = Math.max(0, Math.trunc(Number(currentIndex) || 0) + 1);
  return Promise.all(queue.slice(start, start + 2).map(word => preloadLetterCatcherImage(word?.image_url)));
}
