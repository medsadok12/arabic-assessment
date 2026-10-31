import { describe, expect, it } from 'vitest';
import { displayNumber } from './display-number';
describe('training display uses Western digits', () => {
 it('keeps scores, zero, decimals and negative values readable as 0–9', () => {
  for (const value of [0, 4, 6, 10, 24, 568, -10, 12.5]) expect(displayNumber(value)).toBe(String(value));
 });
 it('normalizes Arabic-Indic and Persian digits without changing Arabic or RTL text', () => {
  expect(displayNumber('الصورة ٤ من ٦ · +١٠ نقاط')).toBe('الصورة 4 من 6 · +10 نقاط');
  expect(displayNumber('الرصيد ۵۶۸')).toBe('الرصيد 568');
  expect(displayNumber('1٢۳')).toBe('123');
 });
 it('does not invent values for missing data', () => {
  expect(displayNumber(null)).toBe('');expect(displayNumber(undefined)).toBe('');
 });
});
