import { describe, expect, it } from 'vitest';
import { letterCatcherPictureLayout } from './letter-catcher-picture';

describe('letterCatcherPictureLayout', () => {
  it.each([320, 360, 412, 768])('keeps portrait and wide images clear of Fahim on a %ipx viewport', viewport => {
    const available = viewport - 64;
    const size = Math.min(240, available * 0.75);
    for (const ratio of [0.45, 0.7, 1, 1.8, 3]) {
      const imageWidth = Math.min(size * 1.2, available, size * ratio);
      const layout = letterCatcherPictureLayout({ available, size, imageWidth });
      const shownWidth = imageWidth * layout.imageScale;
      const imageLeft = -layout.imageOffset - shownWidth / 2;
      const imageRight = -layout.imageOffset + shownWidth / 2;
      const videoLeft = layout.videoOffset - layout.videoWidth / 2;
      const videoRight = layout.videoOffset + layout.videoWidth / 2;
      expect(imageLeft).toBeGreaterThanOrEqual(-available / 2 - 1e-9);
      expect(videoRight).toBeLessThanOrEqual(available / 2 + 1e-9);
      expect(videoLeft - imageRight).toBeCloseTo(8);
      expect(layout.videoWidth).toBeLessThanOrEqual(120);
      expect(layout.videoWidth).toBeLessThanOrEqual(size * 0.55);
      if (ratio <= 0.7) expect(layout.imageScale).toBe(1);
    }
  });

  it('scales a wide picture uniformly only when the two subjects would overflow', () => {
    const layout = letterCatcherPictureLayout({ available: 240, size: 200, imageWidth: 240 });
    expect(layout.videoWidth).toBeCloseTo(62.4);
    expect(layout.imageScale).toBeCloseTo((240 - 62.4 - 8) / 240);
  });

  it.each([undefined, {}, { available: -1, size: NaN, imageWidth: Infinity }, { available: 0, size: 200, imageWidth: 200 }, { available: 2, size: 200, imageWidth: 200 }])('keeps missing, invalid or tiny dimensions safe: %j', input => {
    const layout = letterCatcherPictureLayout(input);
    for (const value of Object.values(layout)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
    expect(layout.imageScale).toBeLessThanOrEqual(1);
    const available = Math.max(0, input?.available || 0);
    expect(layout.videoOffset + layout.videoWidth / 2).toBeLessThanOrEqual(available / 2 + 1e-9);
  });
});
