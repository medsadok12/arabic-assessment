import { describe, it, expect } from 'vitest';
import { audioMimeFor } from './audio-file';
import { parseAudioDataUrl } from './game-audio';

describe('audioMimeFor', () => {
  it('ملف ElevenLabs (mp3) يُقبل بأي نوع يعطيه المتصفح', () => {
    expect(audioMimeFor('word.mp3', 'audio/mpeg')).toBe('audio/mpeg');
    expect(audioMimeFor('word.mp3', 'audio/mp3')).toBe('audio/mpeg');
    expect(audioMimeFor('word.mp3', '')).toBe('audio/mpeg');
  });
  it('m4a وwav من الآيفون والحاسوب', () => {
    expect(audioMimeFor('a.m4a', 'audio/x-m4a')).toBe('audio/mp4');
    expect(audioMimeFor('a.wav', 'audio/x-wav')).toBe('audio/wav');
  });
  it('يرفض غير الصوت', () => {
    expect(audioMimeFor('a.pdf', 'application/pdf')).toBeNull();
    expect(audioMimeFor('a.png', 'image/png')).toBeNull();
  });
  it('كل نوع يقبله المتصفح يقبله الخادم أيضاً', () => {
    for (const name of ['a.mp3', 'a.m4a', 'a.wav', 'a.ogg', 'a.webm', 'a.aac']) {
      const mime = audioMimeFor(name, '');
      expect(parseAudioDataUrl(`data:${mime};base64,${btoa('x')}`), name).not.toBeNull();
    }
  });
});
