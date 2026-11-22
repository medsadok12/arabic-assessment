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
});
