import { describe, expect, it } from 'vitest';
import { refreshLcRoundImages, lcRoundMatchesCurrentWords } from './letter-catcher-live-images';

const saved = { id: 'cat', word: '_طٌّ', missing_letter: 'قِ', image_url: '/old.webp', audio_url: '/saved.mp3',
  options: ['ق', 'ك', 'ف'], _opts: ['ف', 'ق', 'ك'], _form: 'قـ', category: 'الحيوانات', grade_level: 1 };

describe('current pictures in preserved Letter Catcher rounds', () => {
  it('accepts media corrections but restarts withdrawn or renamed teaching targets without shifting answer indexes', () => {
    const items = [saved];
    expect(lcRoundMatchesCurrentWords(items, [{ ...saved, image_url: '/new.webp', audio_url: null }])).toBe(true);
    expect(lcRoundMatchesCurrentWords(items, [])).toBe(false);
    expect(lcRoundMatchesCurrentWords(items, [{ ...saved, word: 'بَ_دٌ', missing_letter: 'رْ' }])).toBe(false);
    expect(items).toEqual([saved]);
  });

  it('refreshes only the image and preserves saved grading, choices, order and audio', () => {
    const items = [saved, { ...saved, id: 'second' }];
    const current = { ...saved, image_url: '/reviewed.webp', audio_url: '/new-audio.mp3', options: ['ج'], grade_level: 4 };
    const result = refreshLcRoundImages(items, [current]);
    expect(result).toEqual([{ ...saved, image_url: '/reviewed.webp' }, items[1]]);
    expect(result[1]).toBe(items[1]);
    expect(items[0]).toBe(saved);
    expect(saved.image_url).toBe('/old.webp');
  });

  it.each(['word', 'missing_letter'])('keeps the historical image when the teacher changes %s', field => {
    const items = [saved];
    expect(refreshLcRoundImages(items, [{ ...saved, [field]: 'different', image_url: '/another-word.webp' }])).toBe(items);
  });

  it('honors image removal without substituting a previous upload', () => {
    expect(refreshLcRoundImages([saved], [{ ...saved, image_url: null }])[0]).toEqual({ ...saved, image_url: null });
  });

  it('retains deleted or unavailable historical words and avoids needless rerenders', () => {
    const items = [saved];
    expect(refreshLcRoundImages(items, [])).toBe(items);
    expect(refreshLcRoundImages(items, [{ ...saved }])).toBe(items);
    expect(refreshLcRoundImages(items, [{ id: 'unrelated', image_url: '/new.webp' }])).toBe(items);
    const { image_url, ...withoutImageField } = saved;
    expect(refreshLcRoundImages(items, [withoutImageField])).toBe(items);
  });
});

