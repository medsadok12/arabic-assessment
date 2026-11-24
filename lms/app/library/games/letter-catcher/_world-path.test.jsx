import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LC_CATEGORY_ORDER } from '../../../../lib/letter-catcher-categories';
import LetterCatcherWorldPath, { LC_ANIMALS_SCENE } from './_world-path';

const render = props => renderToStaticMarkup(<LetterCatcherWorldPath {...props} />);
const worlds = [...LC_CATEGORY_ORDER, 'عالم الفضاء'];
const gameWords = worlds.map((category, index) => ({ id: `word-${index}`, category }));
const island = (html, category) => html.match(new RegExp(`<button[^>]*data-lc-world-island="${category}"[^>]*>`))?.[0];

describe('Letter Catcher world selection path', () => {
  it('uses the active account photo in the invitation and leaves the unknown friend as a placeholder', () => {
    const html = render({ duelSettings: { enabled: true }, currentPlayer: { id: 'active-child', name: 'علي', avatar_url: '/my-uploaded-photo.webp?t=2' } });
    expect(html).toContain('data-lc-entry-self=""');
    expect(html.match(/src="\/my-uploaded-photo.webp\?t=2"/g)).toHaveLength(1);
    const hidden = render({ duelSettings: { enabled: false }, currentPlayer: { id: 'active-child', avatar_url: '/my-uploaded-photo.webp' } });
    expect(hidden).not.toContain('src="/my-uploaded-photo.webp"');
    expect(render({ duelSettings: { enabled: true } }).match(/data-lc-avatar-fallback=/g)).toHaveLength(2);
  });

  it('fills only the approved animal scene while keeping teacher replacements and other worlds unchanged', () => {
    const categories = worlds.slice(0, 2);
    const props = { categories, gameWords, catMeta: {
      [categories[0]]: { image_url: LC_ANIMALS_SCENE },
      [categories[1]]: { image_url: '/teacher-weather.webp' },
    } };
    const html = render(props);
    expect(html.match(/data-lc-world-scene="animals"/g)).toHaveLength(1);
    expect(html).toContain(`src="${LC_ANIMALS_SCENE}"`);
    expect(html).toContain('src="/teacher-weather.webp"');
    const replaced = render({ ...props, catMeta: { [categories[0]]: { image_url: '/teacher-cow.webp' }, [categories[1]]: { image_url: LC_ANIMALS_SCENE } } });
    expect(replaced).not.toContain('data-lc-world-scene=');
    expect(replaced).toContain('src="/teacher-cow.webp"');
  });

  it('keeps every canonical and custom world, its order and its own scene', () => {
    const html = render({ categories: worlds, gameWords, totalPoints: 1353 });
    expect(html.match(/data-lc-world-island=/g)).toHaveLength(17);
    expect(html.match(/data-scene-thumb=/g)).toHaveLength(17);
    for (let index = 1; index < worlds.length; index += 1) {
      expect(html.indexOf(`data-lc-world-island="${worlds[index]}"`)).toBeGreaterThan(html.indexOf(`data-lc-world-island="${worlds[index - 1]}"`));
    }
    expect(html).toContain('رصيدك 1,353 نجمة');
    expect(html).not.toContain('data-lc-play-all');
    expect(html).not.toContain('العب الكل');
    expect(html).not.toContain('data-scene=');
  });

  it('preserves student locks, saved-result access and the teacher bypass', () => {
    const categories = worlds.slice(0, 3);
    const initial = render({ categories, gameWords });
    expect(island(initial, categories[0])).toContain('data-unlocked="true"');
    expect(island(initial, categories[1])).toContain('aria-disabled="true"');
    const progressed = render({ categories, gameWords, catResults: { [categories[0]]: { correct: 8, wrong: 2, total: 10 } } });
    expect(island(progressed, categories[1])).toContain('data-unlocked="true"');
    expect(island(progressed, categories[2])).toContain('data-unlocked="false"');
    const teacher = render({ categories, gameWords, isTeacher: true });
    expect(teacher.match(/data-unlocked="true"/g)).toHaveLength(3);
    expect(teacher).not.toContain('aria-disabled="true"');
  });

  it('uses actual per-world counts and saved mastery rather than decorative progress', () => {
    const categories = worlds.slice(0, 2);
    const words = [categories[0], categories[0], categories[0], categories[1]].map((category, id) => ({ id, category }));
    const html = render({ categories, gameWords: words, catResults: { [categories[0]]: { correct: 8, wrong: 2, total: 10 } } });
    expect(island(html, categories[0])).toContain('3 كلمات');
    expect(island(html, categories[1])).toContain('1 كلمة');
    expect(html).toContain('aria-label="3 من 3 نجوم"');
    expect(html).toContain('aria-label="لم تبدأ هذا العالم بعد"');
    expect(html).toContain('aria-label="8 إجابات صحيحة"');
    expect(html).toContain('aria-label="2 إجابات تحتاج إلى تدريب"');
  });

  it('retains teacher artwork and optional duel text with Western display digits', () => {
    const props = { categories: worlds.slice(0, 1), gameWords, catMeta: { [worlds[0]]: { image_url: '/teacher-cow.webp' } } };
    expect(render(props)).not.toContain('data-lc-duel-entry');
    const html = render({ ...props, duelSettings: { enabled: true, title: 'تحدي صديق', subtitle: 'العب مع ٢ من الأصدقاء' } });
    expect(html).toContain('src="/teacher-cow.webp"');
    expect(html).toContain('data-lc-duel-entry=""');
    expect(html).toContain('aria-label="تحدي صديق، العب مع 2 من الأصدقاء"');
    expect(html).not.toContain('٢');
  });

  it('offers teacher setup and no play-all action when there are no words', () => {
    const html = render({ isTeacher: true });
    expect(html).toContain('لنجهّز عوالم الكلمات!');
    expect(html).toContain('إضافة كلمات');
    expect(html).not.toContain('data-lc-world-island');
    expect(html).not.toContain('data-lc-play-all');
  });
});
