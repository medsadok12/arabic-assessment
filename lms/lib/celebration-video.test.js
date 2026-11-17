import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playCelebrationVideo } from './celebration-video';

function media({ frameApi = true } = {}) {
  const video = new EventTarget();
  video.muted = true;
  video.paused = true;
  video.ended = false;
  video.seeking = false;
  video.readyState = 2;
  video.play = vi.fn(() => { video.paused = false; return Promise.resolve(); });
  video.pause = vi.fn(() => { video.paused = true; });
  let frame;
  if (frameApi) {
    video.requestVideoFrameCallback = vi.fn(callback => { frame = callback; return 1; });
    video.cancelVideoFrameCallback = vi.fn(() => { frame = null; });
  }
  video.emit = name => {
    if (name === 'playing') video.paused = false;
    if (name === 'ended') video.ended = true;
    video.dispatchEvent(new Event(name));
  };
  video.frame = () => { const callback = frame; frame = null; callback?.(); };
  return video;
}
const callbacks = () => ({ onReady: vi.fn(), onFade: vi.fn(), onFinish: vi.fn() });
const blocked = () => Object.assign(new Error('Blocked'), { name: 'NotAllowedError' });
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('playCelebrationVideo', () => {
  it('waits for a decoded frame, then provides the full celebration duration', () => {
    const video = media(), cb = callbacks();
    video.readyState = 1;
    playCelebrationVideo(video, cb);
    video.emit('playing');
    vi.advanceTimersByTime(2000);
    expect(cb.onReady).not.toHaveBeenCalled();
    expect(cb.onFade).not.toHaveBeenCalled();
    video.readyState = 2;
    video.frame();
    expect(cb.onReady).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2599);
    expect(cb.onFade).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb.onFade).toHaveBeenCalledTimes(1);
    expect(cb.onFinish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(video.pause).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses playing for browsers without video frame callbacks', () => {
    const video = media({ frameApi: false }), cb = callbacks();
    playCelebrationVideo(video, cb);
    video.emit('playing'); video.emit('playing');
    expect(cb.onReady).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3000);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
  });

  it('requests a frame when an already-playing video resolves without another playing event', async () => {
    const video = media(), cb = callbacks();
    video.paused = false;
    playCelebrationVideo(video, cb);
    await Promise.resolve();
    expect(video.requestVideoFrameCallback).toHaveBeenCalledTimes(1);
    expect(cb.onReady).not.toHaveBeenCalled();
    video.frame();
    expect(cb.onReady).toHaveBeenCalledTimes(1);
    video.emit('ended');
  });

  it('uses the decoded current frame if a hidden video gets no frame callback', () => {
    const video = media(), cb = callbacks();
    playCelebrationVideo(video, cb);
    video.emit('playing');
    vi.advanceTimersByTime(199);
    expect(cb.onReady).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb.onReady).toHaveBeenCalledTimes(1);
    expect(video.cancelVideoFrameCallback).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3000);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['paused', 'ended', 'seeking', 'unloaded'])('does not reveal a %s video through the readiness fallback', state => {
    const video = media(), cb = callbacks();
    playCelebrationVideo(video, cb);
    video.emit('playing');
    if (state === 'unloaded') video.readyState = 1;
    else video[state] = true;
    vi.advanceTimersByTime(200);
    expect(cb.onReady).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4800);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores a late resolved play promise after cancellation', async () => {
    const video = media(), cb = callbacks();
    let resolvePlay;
    video.play.mockImplementationOnce(() => new Promise(resolve => { resolvePlay = resolve; }));
    const cancel = playCelebrationVideo(video, cb);
    cancel();
    video.paused = false;
    resolvePlay();
    await Promise.resolve();
    expect(video.requestVideoFrameCallback).not.toHaveBeenCalled();
    expect(cb.onReady).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([true, false])('recovers when a later playing event has decoded data (frame API: %s)', frameApi => {
    const video = media({ frameApi }), cb = callbacks();
    video.readyState = 1;
    playCelebrationVideo(video, cb);
    video.emit('playing');
    vi.advanceTimersByTime(200);
    expect(cb.onReady).not.toHaveBeenCalled();
    video.readyState = 2;
    video.emit('playing');
    vi.advanceTimersByTime(200);
    expect(cb.onReady).toHaveBeenCalledTimes(1);
    if (frameApi) expect(video.requestVideoFrameCallback).toHaveBeenCalledTimes(1);
    video.emit('ended');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retries muted only for an autoplay policy rejection', async () => {
    const video = media(), cb = callbacks();
    video.play.mockRejectedValueOnce(blocked());
    playCelebrationVideo(video, cb);
    expect(video.muted).toBe(false);
    await Promise.resolve();
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(video.muted).toBe(true);
    video.emit('playing'); video.frame();
    expect(cb.onReady).toHaveBeenCalledTimes(1);
    video.emit('ended');
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
  });

  it('ignores a late rejection after cancellation and a newer playback starts', async () => {
    const video = media(), old = callbacks(), next = callbacks();
    let rejectOld;
    video.play.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectOld = reject; }));
    const cancel = playCelebrationVideo(video, old);
    cancel();
    playCelebrationVideo(video, next);
    rejectOld(blocked());
    await Promise.resolve();
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(video.muted).toBe(false);
    expect(old.onFinish).not.toHaveBeenCalled();
    video.emit('playing'); video.frame();
    expect(next.onReady).toHaveBeenCalledTimes(1);
  });

  it('supersedes an old run without allowing its cancel to pause the new run', () => {
    const video = media(), old = callbacks(), next = callbacks();
    const cancelOld = playCelebrationVideo(video, old);
    video.emit('playing');
    const cancelNext = playCelebrationVideo(video, next);
    expect(video.cancelVideoFrameCallback).toHaveBeenCalledTimes(1);
    expect(video.pause).toHaveBeenCalledTimes(1);
    cancelOld();
    expect(video.pause).toHaveBeenCalledTimes(1);
    video.emit('playing'); video.frame();
    expect(old.onReady).not.toHaveBeenCalled();
    expect(next.onReady).toHaveBeenCalledTimes(1);
    cancelNext();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['error', 'timeout'])('finishes safely on %s before readiness', reason => {
    const video = media(), cb = callbacks();
    playCelebrationVideo(video, cb);
    if (reason === 'error') video.emit('error');
    else vi.advanceTimersByTime(5000);
    expect(cb.onReady).not.toHaveBeenCalled();
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    video.emit('playing'); video.frame();
    vi.advanceTimersByTime(5000);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ends once and removes all pending fade/finish callbacks', () => {
    const video = media(), cb = callbacks();
    playCelebrationVideo(video, cb);
    video.emit('playing'); video.frame();
    vi.advanceTimersByTime(1000);
    video.emit('ended'); video.emit('ended');
    vi.advanceTimersByTime(5000);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(cb.onFade).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not revive an obsolete run when autoplay fails', async () => {
    const video = media(), cb = callbacks();
    let valid = true, rejectPlay;
    video.play.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectPlay = reject; }));
    const cancel = playCelebrationVideo(video, { ...cb, isCurrent: () => valid });
    valid = false;
    rejectPlay(blocked());
    await Promise.resolve();
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(cb.onFinish).not.toHaveBeenCalled();
    cancel();
    expect(vi.getTimerCount()).toBe(0);
  });
});
