import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LetterCatcherProgress from './LetterCatcherProgress';

const render = props => renderToStaticMarkup(<LetterCatcherProgress {...props} />).replace(/<style>[\s\S]*?<\/style>/, '');

describe('LetterCatcherProgress', () => {
  it('distinguishes completed questions, correct answers and the real points total', () => {
    const html = render({ category: 'الحيوانات', totalPoints: 2343, score: 4, completed: 8, total: 31 });
    expect(html).toContain('رصيد النجوم: 2,343');
    expect(html).toContain('إجابات صحيحة: 4');
    expect(html).toContain('aria-valuenow="8"');
    expect(html).toContain('aria-valuemax="31"');
    expect(html).toContain('aria-valuetext="أنجزت 8 من 31"');
    expect(html).toContain('الحيوانات');
    expect(html.match(/class="lc-progress-stop/g)).toHaveLength(6);
  });

  it('starts on the right and moves left with completed questions, not score', () => {
    const start = render({ completed: 0, total: 10, score: 0 });
    const middle = render({ completed: 5, total: 10, score: 1 });
    const end = render({ completed: 10, total: 10, score: 2 });
    expect(start).toContain('transform:scaleX(0)');
    expect(start).toContain('transform:translate3d(-0%,0,0)');
    expect(middle).toContain('transform:scaleX(0.5)');
    expect(middle).toContain('transform:translate3d(-50%,0,0)');
    expect(end).toContain('transform:scaleX(1)');
    expect(end).toContain('transform:translate3d(-100%,0,0)');
  });

  it.each([{ completed: 12, total: 10, expected: 10 }, { completed: -2, total: 10, expected: 0 }, { completed: 3, total: 0, expected: 0 }])('keeps progress bounded for %j', ({ completed, total, expected }) => {
    const html = render({ completed, total });
    expect(html).toContain(`aria-valuenow="${expected}"`);
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it('uses Western digits even if supplied counter text uses Arabic digits', () => {
    const html = render({ totalPoints: '٢٣٤٣', completed: '٨', total: '٣١', score: '٤' });
    expect(html).toContain('رصيد النجوم: 2,343');
    expect(html).toContain('أنجزت 8 من 31');
    expect(html).not.toMatch(/[\u0660-\u0669\u06f0-\u06f9]/);
  });

  it('shows only the supplied positive award and never invents points', () => {
    expect(render({ showPointsPopup: true })).not.toContain('role="status"');
    expect(render({ showPointsPopup: true, pointsAward: 0 })).not.toContain('role="status"');
    const html = render({ showPointsPopup: true, pointsAward: 2, pointsPopupKey: 7 });
    expect(html).toContain('حصلت على 2 من النجوم');
    expect(html).toContain('+2');
    expect(html).not.toContain('+5');
  });

  it('keeps accurate static progress when the teacher disables motion', () => {
    const html = render({ motionEnabled: false, completed: 3, total: 4 });
    expect(html).toContain('data-motion="off"');
    expect(html).toContain('aria-valuenow="3"');
    expect(html).toContain('transform:scaleX(0.75)');
    expect(html).toContain('transform:translate3d(-75%,0,0)');
  });
});
