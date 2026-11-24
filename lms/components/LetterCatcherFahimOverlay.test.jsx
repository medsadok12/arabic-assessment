import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LetterCatcherFahimOverlay from './LetterCatcherFahimOverlay';

const render = props => renderToStaticMarkup(<LetterCatcherFahimOverlay {...props} />);
const mascot = html => html.match(/<div\b[^>]*role="img"[^>]*>/)?.[0] || '';

describe('Letter Catcher shared Fahim overlay', () => {
  it('pairs the existing transparent sprite with one original encouragement recording', () => {
    const html = render({ cheer: 'in', wordKey: 'weather-clouds' });
    expect(html).toContain('src="/media/fahim-cheer-frames.webp"');
    expect(html).toContain('src="/media/fahim-cheer.mp3"');
    expect(html.match(/<audio\b/g)).toHaveLength(1);
    expect(html).not.toContain('<video');
    expect(mascot(html)).toContain('aria-label="فهيم يشجّعك"');
  });

  it.each([null, 'word', 'loading'])('keeps the mascot hidden while the encouragement is inactive: %s', cheer => {
    const html = render({ cheer, wordKey: 'school-book' });
    expect(mascot(html)).toContain('aria-hidden="true"');
    expect(mascot(html)).toContain('opacity:0');
  });

  it('exposes the encouragement while visible and keeps the same element through its fade', () => {
    const visible = mascot(render({ cheer: 'in', wordKey: 'fruit-apple' }));
    const fading = mascot(render({ cheer: 'out', wordKey: 'fruit-apple' }));
    expect(visible).toContain('aria-hidden="false"');
    expect(visible).toContain('opacity:1');
    expect(fading).toContain('aria-hidden="false"');
    expect(fading).toContain('opacity:0');
  });

  it('stays outside document flow in both viewport modes, with a smaller compact footprint', () => {
    const regular = mascot(render({ cheer: 'in' }));
    const compact = mascot(render({ cheer: 'in', compact: true }));
    const size = value => Number(value.match(/(?:^|;)width:(\d+)px/)?.[1]);
    expect(regular).toContain('position:absolute');
    expect(compact).toContain('position:absolute');
    expect(regular).toContain('pointer-events:none');
    expect(compact).toContain('pointer-events:none');
    expect(size(compact)).toBeGreaterThan(0);
    expect(size(compact)).toBeLessThan(size(regular));
  });
});
