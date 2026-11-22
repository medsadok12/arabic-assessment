import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playAnimalFahimCelebration } from './letter-catcher-animal-celebration';

function media() {
  const audio = new EventTarget();
  audio.paused = true;
  audio.ended = false;
  audio.muted = true;
  audio.currentTime = 2;
  audio.play = vi.fn(() => new Promise(() => {}));
  audio.pause = vi.fn(() => { audio.paused = true; });
  audio.emit = name => {
    if (name === 'playing') audio.paused = false;
    if (name === 'ended') { audio.ended = true; audio.paused = true; }
    audio.dispatchEvent(new Event(name));
  };
  return audio;
}
const callbacks = () => ({ onReady: vi.fn(), onFade: vi.fn(), onFinish: vi.fn() });
const blocked = () => Object.assign(new Error('Blocked'), { name: 'NotAllowedError' });
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('playAnimalFahimCelebration', () => {
  it.each(['missing', 'pending', 'blocked', 'throwing'])('shows immediately with %s audio and keeps the full silent duration', async reason => {
    const audio = reason === 'missing' ? null : media(), cb = callbacks();
    if (reason === 'blocked') audio.play.mockRejectedValueOnce(blocked());
    if (reason === 'throwing') audio.play.mockImplementationOnce(() => { throw blocked(); });
    playAnimalFahimCelebration(audio, cb);
    expect(cb.onReady).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    vi.advanceTimersByTime(2999);
    expect(cb.onFade).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb.onFade).toHaveBeenCalledTimes(1);
    expect(cb.onFinish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    if (audio) expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it('lets an active recording finish before fading and finishes only once', () => {
    const audio = media(), cb = callbacks();
    playAnimalFahimCelebration(audio, cb);
    expect(audio.muted).toBe(false);
    expect(audio.currentTime).toBe(0);
    audio.emit('playing');
    vi.advanceTimersByTime(3100);
    expect(cb.onFade).not.toHaveBeenCalled();
    audio.emit('ended'); audio.emit('ended');
    expect(cb.onFade).toHaveBeenCalledTimes(1);
    expect(audio.paused).toBe(true);
    vi.advanceTimersByTime(399);
    expect(cb.onFinish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    audio.emit('ended');
    vi.advanceTimersByTime(5000);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('counts a stuck-audio watchdog from actual playing and does not restart it on repeated events', () => {
    const audio = media(), cb = callbacks();
    playAnimalFahimCelebration(audio, cb);
    vi.advanceTimersByTime(2500);
    audio.emit('playing');
    vi.advanceTimersByTime(1000);
    audio.emit('playing');
    vi.advanceTimersByTime(3499);
    expect(cb.onFade).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb.onFade).toHaveBeenCalledTimes(1);
    expect(audio.paused).toBe(true);
    vi.advanceTimersByTime(400);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('handles an unlocked play promise with no additional playing event', async () => {
    const audio = media(), cb = callbacks();
    audio.play.mockImplementationOnce(() => { audio.paused = false; return Promise.resolve(); });
    playAnimalFahimCelebration(audio, cb);
    await Promise.resolve();
    vi.advanceTimersByTime(3000);
    expect(cb.onFade).not.toHaveBeenCalled();
    audio.emit('ended');
    vi.advanceTimersByTime(400);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
  });

  it('still attempts sound when seeking before metadata is unavailable', () => {
    const audio = media(), cb = callbacks();
    Object.defineProperty(audio, 'currentTime', { set: () => { throw new Error('No metadata'); } });
    const cancel = playAnimalFahimCelebration(audio, cb);
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(cb.onReady).toHaveBeenCalledTimes(1);
    cancel();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not show or play an already-obsolete run', () => {
    const audio = media(), cb = callbacks();
    playAnimalFahimCelebration(audio, { ...cb, isCurrent: () => false });
    expect(cb.onReady).not.toHaveBeenCalled();
    expect(audio.play).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the sprite through its ordinary duration when recording errors partway through', () => {
    const audio = media(), cb = callbacks();
    playAnimalFahimCelebration(audio, cb);
    audio.emit('playing');
    vi.advanceTimersByTime(1000);
    audio.emit('error');
    vi.advanceTimersByTime(1999);
    expect(cb.onFade).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb.onFade).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(400);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('pauses playing that arrives after fallback fade without reviving the mascot', async () => {
    const audio = media(), cb = callbacks();
    let resolvePlay;
    audio.play.mockImplementationOnce(() => new Promise(resolve => { resolvePlay = resolve; }));
    playAnimalFahimCelebration(audio, cb);
    vi.advanceTimersByTime(3000);
    audio.emit('playing');
    expect(audio.paused).toBe(true);
    audio.paused = false;
    resolvePlay();
    await Promise.resolve();
    expect(audio.paused).toBe(true);
    expect(cb.onReady).toHaveBeenCalledTimes(1);
    expect(cb.onFade).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(400);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not revive a rejected recording if a stray playing event follows', async () => {
    const audio = media(), cb = callbacks();
    audio.play.mockRejectedValueOnce(blocked());
    playAnimalFahimCelebration(audio, cb);
    await Promise.resolve();
    vi.advanceTimersByTime(1000);
    audio.emit('playing');
    expect(audio.paused).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(cb.onFade).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(400);
    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['resolve', 'reject'])('ignores a play promise that %ss after reset', async result => {
    const audio = media(), cb = callbacks();
    let resolvePlay, rejectPlay;
    audio.play.mockImplementationOnce(() => new Promise((resolve, reject) => { resolvePlay = resolve; rejectPlay = reject; }));
    const cancel = playAnimalFahimCelebration(audio, cb);
    cancel(); cancel();
    audio.paused = false;
    if (result === 'resolve') resolvePlay();
    else rejectPlay(blocked());
    await Promise.resolve();
    if (result === 'resolve') expect(audio.paused).toBe(true);
    audio.emit('ended');
    vi.advanceTimersByTime(10000);
    expect(cb.onFade).not.toHaveBeenCalled();
    expect(cb.onFinish).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not let old cancellation or a late play result pause a newer owner', async () => {
    const audio = media(), old = callbacks(), next = callbacks();
    let resolveOld;
    audio.play.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const cancelOld = playAnimalFahimCelebration(audio, old);
    const cancelNext = playAnimalFahimCelebration(audio, next);
    audio.emit('playing');
    const pauses = audio.pause.mock.calls.length;
    cancelOld(); resolveOld();
    await Promise.resolve();
    expect(audio.pause).toHaveBeenCalledTimes(pauses);
    expect(audio.paused).toBe(false);
    expect(old.onFade).not.toHaveBeenCalled();
    expect(old.onFinish).not.toHaveBeenCalled();
    audio.emit('ended');
    vi.advanceTimersByTime(400);
    expect(next.onFinish).toHaveBeenCalledTimes(1);
    cancelNext();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores an old rejection after a new run starts on the same audio', async () => {
    const audio = media(), old = callbacks(), next = callbacks();
    let rejectOld;
    audio.play.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectOld = reject; }));
    playAnimalFahimCelebration(audio, old);
    const cancelNext = playAnimalFahimCelebration(audio, next);
    audio.emit('playing');
    const pauses = audio.pause.mock.calls.length;
    rejectOld(blocked());
    await Promise.resolve();
    expect(audio.pause).toHaveBeenCalledTimes(pauses);
    expect(audio.paused).toBe(false);
    expect(old.onFade).not.toHaveBeenCalled();
    expect(old.onFinish).not.toHaveBeenCalled();
    cancelNext();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels an obsolete run before late playback can start its watchdog', async () => {
    const audio = media(), cb = callbacks();
    let current = true, resolvePlay;
    audio.play.mockImplementationOnce(() => new Promise(resolve => { resolvePlay = resolve; }));
    playAnimalFahimCelebration(audio, { ...cb, isCurrent: () => current });
    current = false;
    audio.paused = false;
    resolvePlay();
    await Promise.resolve();
    expect(audio.paused).toBe(true);
    vi.advanceTimersByTime(10000);
    expect(cb.onFade).not.toHaveBeenCalled();
    expect(cb.onFinish).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
