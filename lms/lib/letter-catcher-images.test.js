import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let images, preloadLetterCatcherImage, warmLetterCatcherImages;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  images = [];
  vi.stubGlobal('Image', class {
    constructor() {
      this.complete = false;
      this.naturalWidth = 0;
      this.decode = vi.fn(() => Promise.resolve());
      this.removeAttribute = vi.fn(name => { if (name === 'src') this.src = ''; });
      images.push(this);
    }
    load() { this.complete = true; this.naturalWidth = 300; this.onload?.(); }
    fail() { this.onerror?.(); }
  });
  ({ preloadLetterCatcherImage, warmLetterCatcherImages } = await import('./letter-catcher-images'));
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('preloadLetterCatcherImage', () => {
  it('shares one request and waits for decoding before resolving readiness', async () => {
    const first = preloadLetterCatcherImage('/camel.png');
    const second = preloadLetterCatcherImage('/camel.png');
    const decode = deferred(), resolved = vi.fn();
    images[0].decode.mockReturnValue(decode.promise);
    first.then(resolved);
    expect(second).toBe(first);
    expect(images).toHaveLength(1);
    images[0].load();
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();
    decode.resolve();
    await expect(first).resolves.toBe(true);
    expect(preloadLetterCatcherImage('/camel.png')).toBe(first);
    expect(images[0].onload).toBeNull();
    expect(images[0].onerror).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('supports browsers without decode', async () => {
    const ready = preloadLetterCatcherImage('/bull.png');
    images[0].decode = undefined;
    images[0].load();
    await expect(ready).resolves.toBe(true);
  });

  it('handles an image already complete when src is assigned', async () => {
    const RealMock = Image;
    vi.stubGlobal('Image', class extends RealMock {
      set src(value) { this.url = value; this.complete = true; this.naturalWidth = 300; }
    });
    await expect(preloadLetterCatcherImage('/cached.png')).resolves.toBe(true);
    expect(images[0].decode).toHaveBeenCalledTimes(1);
  });

  it.each(['load error', 'decode rejection', 'decode throw'])('returns false and permits a retry after %s', async failure => {
    const ready = preloadLetterCatcherImage('/retry.png');
    if (failure === 'load error') images[0].fail();
    else {
      images[0].decode.mockImplementation(() => {
        if (failure === 'decode throw') throw new Error('Decode failed');
        return Promise.reject(new Error('Decode failed'));
      });
      images[0].load();
    }
    await expect(ready).resolves.toBe(false);
    expect(images[0].removeAttribute).toHaveBeenCalledWith('src');
    const retry = preloadLetterCatcherImage('/retry.png');
    expect(images).toHaveLength(2);
    images[1].load();
    await expect(retry).resolves.toBe(true);
  });

  it.each(['resolve', 'reject'])('ignores a late decode %s after timeout and a new retry', async completion => {
    const old = preloadLetterCatcherImage('/slow.png', { timeoutMs: 200 });
    const decode = deferred();
    images[0].decode.mockReturnValue(decode.promise);
    images[0].load();
    vi.advanceTimersByTime(200);
    await expect(old).resolves.toBe(false);
    const retry = preloadLetterCatcherImage('/slow.png');
    decode[completion](completion === 'reject' ? new Error('Late') : undefined);
    await Promise.resolve();
    expect(preloadLetterCatcherImage('/slow.png')).toBe(retry);
    images[1].load();
    await expect(retry).resolves.toBe(true);
  });

  it('bounds pending images and ignores callbacks from an evicted request', async () => {
    const oldest = preloadLetterCatcherImage('/0.png');
    const oldLoad = images[0].onload;
    for (let i = 1; i <= 6; i++) preloadLetterCatcherImage(`/${i}.png`);
    await expect(oldest).resolves.toBe(false);
    expect(images[0].onload).toBeNull();
    expect(images[0].onerror).toBeNull();
    expect(images[0].removeAttribute).toHaveBeenCalledWith('src');
    expect(vi.getTimerCount()).toBe(6);
    oldLoad();
    expect(images[0].decode).not.toHaveBeenCalled();
    const retry = preloadLetterCatcherImage('/0.png');
    expect(images).toHaveLength(8);
    images[7].load();
    await expect(retry).resolves.toBe(true);
  });

  it('keeps recent decoded images and releases the least recently used one', async () => {
    for (let i = 0; i < 6; i++) {
      const ready = preloadLetterCatcherImage(`/${i}.png`);
      images[i].load();
      await ready;
    }
    const recent = preloadLetterCatcherImage('/0.png');
    const seventh = preloadLetterCatcherImage('/6.png');
    expect(images[0].removeAttribute).not.toHaveBeenCalled();
    expect(images[1].removeAttribute).toHaveBeenCalledWith('src');
    expect(preloadLetterCatcherImage('/0.png')).toBe(recent);
    images[6].load();
    await expect(seventh).resolves.toBe(true);
  });

  it('times out a request that never loads', async () => {
    const ready = preloadLetterCatcherImage('/offline.png');
    vi.advanceTimersByTime(5000);
    await expect(ready).resolves.toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('safely skips empty URLs and server rendering', async () => {
    await expect(preloadLetterCatcherImage(null)).resolves.toBe(false);
    await expect(preloadLetterCatcherImage('  ')).resolves.toBe(false);
    expect(images).toHaveLength(0);
    vi.stubGlobal('Image', undefined);
    await expect(preloadLetterCatcherImage('/server.png')).resolves.toBe(false);
  });
});

describe('warmLetterCatcherImages', () => {
  it('warms only the next two entries and skips absent image URLs', async () => {
    const queue = Array.from({ length: 271 }, (_, i) => ({ image_url: `/${i}.png` }));
    queue[11].image_url = '';
    const warmed = warmLetterCatcherImages(queue, 10);
    expect(images.map(image => image.src)).toEqual(['/12.png']);
    images[0].load();
    await expect(warmed).resolves.toEqual([false, true]);
    await expect(warmLetterCatcherImages(queue, 270)).resolves.toEqual([]);
  });
});
