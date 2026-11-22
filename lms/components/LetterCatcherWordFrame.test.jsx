import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LetterCatcherWordFrame from './LetterCatcherWordFrame';

const examples = [
  { word: 'بَقَرَةٌ', missing_letter: 'ق' },
  { word: 'سَمَكَةٌ', missing_letter: 'م' },
  { word: 'جَمَلٌ', missing_letter: 'ل' },
  { word: 'أَسَدٌ', missing_letter: 'س' },
  { word: 'فَرَسٌ', missing_letter: 'ر' },
  { word: 'كَلْبٌ', missing_letter: 'ل' },
];
const render = (word, props = {}) => renderToStaticMarkup(<LetterCatcherWordFrame word={word} {...props} />);
const marker = html => html.match(/<svg\b[\s\S]*?<\/svg>/)?.[0];

describe('whole-word animal challenge', () => {
  it('renders a server-prepared challenge without receiving its missing answer', () => {
    const html = render(undefined, { preparedFrame: { before: 'بَ\u200D', after: '\u200Dرَةٌ' } });
    expect(html).toContain('بَ\u200D');
    expect(html).toContain('\u200Dرَة\u08F1');
    expect(html.match(/data-lc-missing-mark=/g)).toHaveLength(1);
    expect(html).not.toContain('بَقَرَة');
    expect(marker(html)).toContain('width="16" height="26"');
  });

  it('normalizes a revealed word rather than showing raw prepared review text', () => {
    const html = render({ word: 'فِيلٌ' }, { revealed: true, preparedFrame: { before: '', after: '', text: 'فِيلٌ' } });
    expect(html).toContain('aria-label="فيلٌ">فيل\u08F1</span>');
  });

  it('uses one shared frame and one identical small marker across words and viewport modes', () => {
    const markers = new Set();
    for (const word of examples) for (const compact of [true, false]) {
      const html = render(word, { compact });
      expect(html.match(/data-lc-word-frame=/g)).toHaveLength(1);
      expect(html.match(/data-lc-missing-mark=/g)).toHaveLength(1);
      expect(marker(html)).toContain('width="16" height="26"');
      markers.add(marker(html));
    }
    expect(markers.size).toBe(1);
  });

  it('colors the actual dot red without a second dot or underline', () => {
    const svg = marker(render(examples[0]));
    expect(svg.match(/<path /g)).toHaveLength(2);
    expect(svg.match(/fill="#E8B84B"/g)).toHaveLength(1);
    expect(svg.match(/fill="#EF4444"/g)).toHaveLength(1);
    expect(svg).not.toMatch(/<line|<rect|<circle|<text/);
  });

  it.each(examples)('reveals $word as one intact text run with its original marks', word => {
    const html = render(word, { revealed: true });
    expect(html).toContain(word.word);
    expect(html).not.toContain('data-lc-missing-mark');
    expect(html).not.toContain('\u200D');
  });

  it('keeps all shadda and tanwin on a hidden final letter out of the challenge', () => {
    const html = render({ word: 'قِ_ٌّ', missing_letter: 'ط', category: 'الحيوانات' });
    expect(html).toContain('قِ\u200D');
    expect(html).not.toContain('ّ');
    expect(html).not.toContain('ٌ');
  });

  it('uses the existing font open dammatan while preserving the original accessible word', () => {
    const word = { word: 'ثَعْلَبٌ', missing_letter: 'ع', category: 'الحيوانات' };
    const html = render(word, { revealed: true });
    expect(html).toContain('aria-label="ثَعْلَبٌ">ثَعْلَب\u08F1</span>');
    expect(html).toContain('font-family:inherit');
  });

  it('keeps shadda and contextual joins when showing separated dammas on a known final letter', () => {
    const html = render({ word: '_طٌّ', missing_letter: 'قِ', category: 'الحيوانات' });
    expect(html).toContain('\u200Dطّ\u08F1</span>');
    expect(html).toContain('aria-label="\u200Dطٌّ"');
    expect(html.match(/data-lc-missing-mark=/g)).toHaveLength(1);
  });
});
