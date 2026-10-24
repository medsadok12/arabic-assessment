import { describe, it, expect } from 'vitest';
import { fitTileSize, compactTileStyle, TILE_GAP, WORD_GAP } from './fit-tiles';

const rowWidth = (size, letters, groups) => letters * size + (letters - groups) * TILE_GAP + (groups - 1) * WORD_GAP;

describe('fitTileSize', () => {
  it('«حمار وحشي» على جوال: مربعات كبيرة نسبياً وفي سطر واحد', () => {
    const s = fitTileSize(328, 8, 2);
    expect(s).toBeGreaterThanOrEqual(30);
    expect(rowWidth(s, 8, 2)).toBeLessThanOrEqual(328);
  });
  it('أطول عبارة (17 حرفاً) تسع سطراً واحداً على جوال 390px', () => {
    const s = fitTileSize(328, 17, 2);
    expect(rowWidth(s, 17, 2)).toBeLessThanOrEqual(328);
  });
  it('لا يتجاوز الحد الأقصى على الشاشات الواسعة', () => {
    expect(fitTileSize(900, 8, 2)).toBe(40);
  });
  it('قبل القياس يبدأ بالأصغر بدل سطرين', () => {
    expect(fitTileSize(0, 8, 2)).toBe(12);
  });
  it('الخط داخل المربع لا يصغر عن 11px', () => {
    expect(compactTileStyle(12).fontSize).toBe(11);
  });
});
