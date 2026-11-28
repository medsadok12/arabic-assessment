import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LC_SUCCESS_SOUND, playLetterCatcherSuccess, playLetterCatcherWord } from './letter-catcher-audio';

function media() {
  const audio = new EventTarget();
  audio.getAttribute = key => audio[key];
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

describe('Letter Catcher correct-answer sound', () => {
  const word = { text: 'فِيلٌ', url: '/words/elephant.mp3' };

  it('starts Carnival immediately and then reads the word on the same unlocked player', () => {
    const audio = media(), sources = [];
    audio.play.mockImplementation(() => { sources.push(audio.src); return Promise.resolve(); });
    cancel = playLetterCatcherSuccess({ ...word, audio });
    expect(sources).toEqual([LC_SUCCESS_SOUND]);
    expect(audio.muted).toBe(false);
    expect(audio.loop).toBe(false);
    audio.emit('ended');
    expect(sources).toEqual([LC_SUCCESS_SOUND, word.url]);
    audio.emit('ended');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels the cue on Next and ignores a late error or play rejection', async () => {
    const audio = media();
    let reject;
    audio.play.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    cancel = playLetterCatcherSuccess({ ...word, audio });
    cancel();
    audio.emit('ended'); audio.emit('error'); reject(new Error('aborted'));
    await Promise.resolve();
    vi.advanceTimersByTime(5000);
    expect(audio.play).toHaveBeenCalledOnce();
    expect(audio.paused).toBe(true);
  });

  it.each(['error', 'timeout', 'blocked'])('still reads once after a cue %s', async failure => {
    const audio = media();
    if (failure === 'blocked') audio.play.mockRejectedValueOnce(new Error('blocked'));
    cancel = playLetterCatcherSuccess({ ...word, audio });
    if (failure === 'error') audio.emit('error');
    if (failure === 'timeout') vi.advanceTimersByTime(3500);
    await Promise.resolve();
    expect(audio.src).toBe(word.url);
    expect(audio.play).toHaveBeenCalledTimes(2);
  });

  it('reads the word directly when the teacher disables the victory sound', () => {
    const { Audio } = browser();
    cancel = playLetterCatcherSuccess({ ...word, audio: null });
    expect(Audio).toHaveBeenCalledOnce();
    expect(Audio).toHaveBeenCalledWith(word.url);
  });

  it('does not report pronunciation complete when only the Carnival cue ends', () => {
    const audio = media(), onComplete = vi.fn(), onUnavailable = vi.fn();
    cancel = playLetterCatcherSuccess({ ...word, audio, onComplete, onUnavailable });
    audio.emit('playing');
    audio.emit('ended');
    expect(audio.src).toBe(word.url);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onUnavailable).not.toHaveBeenCalled();
    audio.emit('playing');
    audio.emit('ended');
    audio.emit('ended');
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onUnavailable).not.toHaveBeenCalled();
  });

  it('forwards completion for the word when the victory cue is disabled', () => {
    const { Audio } = browser(), onComplete = vi.fn();
    cancel = playLetterCatcherSuccess({ ...word, audio: null, onComplete });
    const wordAudio = Audio.mock.results[0].value;
    expect(onComplete).not.toHaveBeenCalled();
    wordAudio.emit('playing');
    wordAudio.emit('ended');
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('keeps blocked pronunciation unavailable after a failed cue without completing', async () => {
    const audio = media(), onComplete = vi.fn(), onUnavailable = vi.fn();
    audio.play.mockRejectedValue(new Error('Blocked'));
    cancel = playLetterCatcherSuccess({ ...word, audio, onComplete, onUnavailable });
    await Promise.resolve();
    await Promise.resolve();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledOnce();
    audio.emit('ended');
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('Letter Catcher pronunciation completion', () => {
  it('requires the whole recording to end, including recordings longer than the startup timeout', async () => {
    const audio = media(), onComplete = vi.fn(), onUnavailable = vi.fn();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', audio, onComplete, onUnavailable });
    await Promise.resolve();
    vi.advanceTimersByTime(60000);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onUnavailable).not.toHaveBeenCalled();
    audio.emit('ended');
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onUnavailable).not.toHaveBeenCalled();
  });

  it('recognizes complete advancing playback when start notifications are omitted', () => {
    const audio = media(), onComplete = vi.fn();
    audio.play.mockImplementationOnce(() => new Promise(() => {}));
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', audio, onComplete });
    audio.currentTime = 1.8;
    audio.emit('ended');
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('does not accept an ended event from media that never started', () => {
    const audio = media(), onComplete = vi.fn(), onUnavailable = vi.fn();
    audio.play.mockImplementationOnce(() => new Promise(() => {}));
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', audio, onComplete, onUnavailable });
    audio.emit('ended');
    expect(onComplete).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledOnce();
  });

  it('preserves the legacy onEnd callback for unavailable playback without completing', () => {
    const onEnd = vi.fn(), onComplete = vi.fn(), onUnavailable = vi.fn();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', onEnd, onComplete, onUnavailable });
    expect(onEnd).toHaveBeenCalledOnce();
    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not mark a failed startup timeout as successful pronunciation', () => {
    const audio = media(), onComplete = vi.fn(), onUnavailable = vi.fn();
    audio.play.mockImplementationOnce(() => new Promise(() => {}));
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', audio, onComplete, onUnavailable });
    vi.advanceTimersByTime(6000);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledOnce();
  });

  it('completes once after successful full fallback speech', () => {
    const { synth } = browser(), onComplete = vi.fn(), onUnavailable = vi.fn();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', onComplete, onUnavailable });
    synth.begin();
    vi.advanceTimersByTime(16000);
    expect(onComplete).not.toHaveBeenCalled();
    synth.end();
    synth.end();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onUnavailable).not.toHaveBeenCalled();
  });

  it('recognizes speech observed running by the watchdog when onstart is omitted', () => {
    const { synth } = browser(), onComplete = vi.fn(), onUnavailable = vi.fn();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', onComplete, onUnavailable });
    synth.pending = false;
    synth.speaking = true;
    vi.advanceTimersByTime(6000);
    expect(onComplete).not.toHaveBeenCalled();
    synth.end();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onUnavailable).not.toHaveBeenCalled();
  });

  it('does not accept speech ending without having started', () => {
    const { synth } = browser(), onComplete = vi.fn(), onUnavailable = vi.fn();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', onComplete, onUnavailable });
    synth.end();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledOnce();
  });

  it('never accepts a speech error after playback has started as completion', () => {
    const { synth, utterances } = browser(), onComplete = vi.fn(), onUnavailable = vi.fn(), onEnd = vi.fn();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', onComplete, onUnavailable, onEnd });
    synth.begin();
    const staleEnd = utterances[0].onend;
    utterances[0].onerror({ error: 'interrupted' });
    staleEnd();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('does not complete or report unavailable after cancellation and late speech events', () => {
    const { synth, utterances } = browser(), onComplete = vi.fn(), onUnavailable = vi.fn();
    cancel = playLetterCatcherWord({ text: 'فِيلٌ', onComplete, onUnavailable });
    synth.begin();
    const staleEnd = utterances[0].onend, staleError = utterances[0].onerror;
    cancel();
    staleEnd();
    staleError();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onUnavailable).not.toHaveBeenCalled();
  });
});

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
