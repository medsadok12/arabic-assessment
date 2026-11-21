import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshLcRoundAudio } from './letter-catcher-live-audio';
import { playLetterCatcherWord } from './letter-catcher-audio';

const saved = { id: 'cat', word: '_طٌّ', missing_letter: 'قِ', image_url: '/reviewed.webp', audio_url: '/old.mp3',
  options: ['ق', 'ك', 'ف'], _opts: ['ف', 'ق', 'ك'], _form: 'قـ', category: 'الحيوانات', grade_level: 1 };
let cancel;
afterEach(() => { cancel?.(); cancel = null; vi.unstubAllGlobals(); });

describe('corrected recordings in saved Letter Catcher rounds', () => {
  it('plays a corrected recording after resuming while preserving the saved question and progress', () => {
    // A persisted round may predate the recording correction and new teacher
    // choices. Only its audio should follow the refreshed word bank.
    const round = JSON.parse(JSON.stringify({ items: [saved, { ...saved, id: 'second' }], cursor: 1, score: 1,
      events: [{ action: 'answer', command: { index: 0, value: 'قِ' }, right: true }] }));
    const previous = structuredClone(round);
    const current = { ...saved, audio_url: '/corrected.mp3', image_url: '/other.webp', options: ['ج'], grade_level: 4 };
    const resumed = { ...round, items: refreshLcRoundAudio(round.items, [current]) };
    expect(resumed).toEqual({ ...previous, items: [{ ...previous.items[0], audio_url: '/corrected.mp3' }, previous.items[1]] });
    expect(resumed.items[1]).toBe(round.items[1]);
    expect(resumed.items[0]._opts).toBe(round.items[0]._opts);
    expect(round).toEqual(previous);

    const audio = new EventTarget();
    audio.play = vi.fn(() => Promise.resolve()); audio.pause = vi.fn();
    const Audio = vi.fn(function () { return audio; });
    vi.stubGlobal('window', { Audio });
    cancel = playLetterCatcherWord({ text: 'قِطٌّ', url: resumed.items[0].audio_url });
    expect(Audio).toHaveBeenCalledWith('/corrected.mp3');
    expect(audio.play).toHaveBeenCalledOnce();
  });

  it.each(['word', 'missing_letter'])('keeps historical audio when the teaching target changes: %s', field => {
    const items = [saved];
    expect(refreshLcRoundAudio(items, [{ ...saved, [field]: 'different', audio_url: '/different-word.mp3' }])).toBe(items);
  });

  it('honors an explicit recording removal instead of restoring an obsolete upload', () => {
    expect(refreshLcRoundAudio([saved], [{ ...saved, audio_url: null }])[0]).toEqual({ ...saved, audio_url: null });
  });

  it('leaves deleted or partial bank entries intact and stabilizes after one live refresh', () => {
    const items = [saved];
    expect(refreshLcRoundAudio(items, [])).toBe(items);
    expect(refreshLcRoundAudio(items, [{ ...saved, id: 'different' }])).toBe(items);
    const { audio_url, ...withoutAudioField } = saved;
    expect(refreshLcRoundAudio(items, [withoutAudioField])).toBe(items);
    const bank = [{ ...saved, audio_url: '/corrected.mp3' }];
    const refreshed = refreshLcRoundAudio(items, bank);
    expect(refreshLcRoundAudio(refreshed, bank)).toBe(refreshed);
  });
});
