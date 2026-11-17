import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playLetterCatcherWord } from './letter-catcher-audio';

function media() {
  const audio = new EventTarget();
  audio.currentTime = 2; audio.muted = true; audio.loop = true;
  audio.paused = true; audio.ended = false;
  audio.play = vi.fn(() => { audio.paused = false; return Promise.resolve(); });
  audio.pause = vi.fn(() => { audio.paused = true; });
  audio.emit = name => {
    if (name === 'playing') audio.paused = false;
    if (name === 'ended') { audio.ended = true; audio.paused = true; }
    audio.dispatchEvent(new Event(name));
  };
  return audio;
}
function browser({ voices = [{ lang: 'ar-SA', name: 'Arabic' }] } = {}) {
  const synth = new EventTarget(), utterances = [];
  synth.speaking = false; synth.pending = false;
  synth.getVoices = vi.fn(() => voices);
  synth.speak = vi.fn(utterance => { utterances.push(utterance); synth.pending = true; });
  synth.cancel = vi.fn(() => { synth.speaking = synth.pending = false; });
  synth.begin = () => { synth.pending = false; synth.speaking = true; utterances.at(-1).onstart?.(); };
  synth.end = () => { synth.speaking = false; utterances.at(-1).onend?.(); };
  class Utterance { constructor(text) { this.text = text; } }
  const Audio = vi.fn(function () { return media(); });
  vi.stubGlobal('window', { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance, Audio });
  return { synth, utterances, Audio };
}
let cancel;
beforeEach(() => { vi.useFakeTimers(); cancel = null; });
afterEach(() => { cancel?.(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Letter Catcher word audio', () => {
  it('plays synchronously, unmutes and rewinds prepared audio, then finishes exactly once', async () => {
    const audio = media(), onStart = vi.fn(), onEnd = vi.fn();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', audio, onStart, onEnd });
    expect(audio.play).toHaveBeenCalledOnce();
    expect(audio.currentTime).toBe(0); expect(audio.muted).toBe(false); expect(audio.loop).toBe(false);
    audio.emit('playing'); await Promise.resolve();
    expect(onStart).toHaveBeenCalledOnce();
    audio.emit('ended'); audio.emit('ended'); audio.emit('error');
    expect(onEnd).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it('never applies the six-second startup timeout to a long recording', async () => {
    const { synth } = browser(), audio = media(), onEnd = vi.fn();
    cancel = playLetterCatcherWord({ text: 'كَلِمَةٌ طَوِيلَةٌ', audio, onEnd });
    await Promise.resolve();
    vi.advanceTimersByTime(60000);
    expect(audio.paused).toBe(false); expect(synth.speak).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
    audio.emit('ended'); expect(onEnd).toHaveBeenCalledOnce();
  });

  it('falls back once when both error and play rejection report the same failed recording', async () => {
    const { synth, utterances } = browser(), audio = media(), onEnd = vi.fn();
    audio.play.mockRejectedValueOnce(new Error('Unavailable'));
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', audio, onEnd });
    audio.emit('error'); await Promise.resolve();
    expect(synth.speak).toHaveBeenCalledOnce(); expect(synth.cancel).not.toHaveBeenCalled();
    expect(utterances[0]).toMatchObject({ text: 'فِيلٌ', lang: 'ar-SA', rate: .82 });
    synth.begin(); vi.advanceTimersByTime(20000);
    expect(onEnd).not.toHaveBeenCalled();
    synth.end(); expect(onEnd).toHaveBeenCalledOnce(); expect(synth.cancel).not.toHaveBeenCalled();
  });

  it('uses fallback after six seconds only if the recording never starts', () => {
    const { synth } = browser(), audio = media();
    audio.play.mockImplementation(() => new Promise(() => {}));
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', audio });
    vi.advanceTimersByTime(5999); expect(synth.speak).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(synth.speak).toHaveBeenCalledOnce(); expect(audio.paused).toBe(true);
  });

  it('recognizes advancing playback even if play/playing notifications are absent', () => {
    const { synth } = browser(), audio = media();
    audio.play.mockImplementation(() => new Promise(() => {}));
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', audio });
    audio.paused = false; audio.currentTime = 1;
    vi.advanceTimersByTime(20000);
    expect(synth.speak).not.toHaveBeenCalled(); expect(audio.paused).toBe(false);
  });

  it('does not start a second utterance from a late voiceschanged event', () => {
    const { synth } = browser({ voices: [] });
    cancel = playLetterCatcherWord({ text: 'فِيلٌ' });
    vi.advanceTimersByTime(500); expect(synth.speak).toHaveBeenCalledOnce();
    synth.dispatchEvent(new Event('voiceschanged')); vi.advanceTimersByTime(500);
    expect(synth.speak).toHaveBeenCalledOnce();
  });

  it('starts once when voices arrive before the delayed fallback', () => {
    const { synth } = browser({ voices: [] });
    cancel = playLetterCatcherWord({ text: 'فِيلٌ' });
    synth.getVoices.mockReturnValue([{ lang: 'ar-QA', name: 'Arabic' }]);
    synth.dispatchEvent(new Event('voiceschanged'));
    vi.advanceTimersByTime(500);
    synth.dispatchEvent(new Event('voiceschanged'));
    expect(synth.speak).toHaveBeenCalledOnce();
  });

  it('releases a fallback that never starts without an unlimited queue or duplicate completion', () => {
    const { synth, utterances } = browser(), onEnd = vi.fn();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', onEnd });
    const staleEnd = utterances[0].onend;
    vi.advanceTimersByTime(6000);
    expect(synth.cancel).toHaveBeenCalledOnce(); expect(onEnd).toHaveBeenCalledOnce();
    staleEnd(); expect(onEnd).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it('treats a synchronous play exception as one recording failure', () => {
    const { synth } = browser(), audio = media();
    audio.play.mockImplementation(() => { throw new Error('Unsupported source'); });
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', audio });
    audio.emit('error');
    expect(synth.speak).toHaveBeenCalledOnce();
  });

  it('cancels deferred voice startup without touching unrelated speech', () => {
    const { synth } = browser({ voices: [] }), onEnd = vi.fn();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', onEnd });
    cancel(); synth.dispatchEvent(new Event('voiceschanged')); vi.advanceTimersByTime(10000);
    expect(synth.speak).not.toHaveBeenCalled(); expect(synth.cancel).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });

  it('waits for existing external speech instead of cancelling it', () => {
    const { synth } = browser(); synth.speaking = true;
    cancel = playLetterCatcherWord({ text: 'فِيلٌ' });
    vi.advanceTimersByTime(300);
    expect(synth.speak).not.toHaveBeenCalled(); expect(synth.cancel).not.toHaveBeenCalled();
    synth.speaking = false; vi.advanceTimersByTime(100);
    expect(synth.speak).toHaveBeenCalledOnce(); expect(synth.cancel).not.toHaveBeenCalled();
  });

  it('cancels its active utterance and ignores saved stale completion handlers', () => {
    const { synth, utterances } = browser(), onEnd = vi.fn();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', onEnd });
    synth.begin(); const oldEnd = utterances[0].onend;
    cancel(); oldEnd(); vi.advanceTimersByTime(10000);
    expect(synth.cancel).toHaveBeenCalledOnce(); expect(onEnd).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores an old play rejection and old cancellation after a new word owns the audio', async () => {
    const { synth } = browser(), audio = media(), oldEnd = vi.fn(), nextEnd = vi.fn();
    let rejectOld;
    audio.play.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectOld = reject; }));
    const oldCancel = playLetterCatcherWord({ text: 'فِيلٌ', audio, onEnd: oldEnd });
    cancel = playLetterCatcherWord({ text: 'قِطٌّ', audio, onEnd: nextEnd });
    const pauses = audio.pause.mock.calls.length;
    oldCancel(); rejectOld(new Error('Late rejection')); await Promise.resolve();
    expect(audio.pause).toHaveBeenCalledTimes(pauses); expect(synth.speak).not.toHaveBeenCalled();
    audio.emit('ended'); expect(nextEnd).toHaveBeenCalledOnce(); expect(oldEnd).not.toHaveBeenCalled();
  });

  it('does not cancel external speech after our completed utterance', () => {
    const { synth } = browser();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ' }); synth.begin(); synth.end();
    synth.speaking = true; cancel();
    expect(synth.cancel).not.toHaveBeenCalled();
  });

  it('finishes safely when browser playback is unavailable without creating browser globals', () => {
    const onEnd = vi.fn();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', url: '/word.mp3', onEnd });
    expect(onEnd).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    cancel(); expect(onEnd).toHaveBeenCalledOnce();
  });
});
