import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LC_CATEGORY_ORDER } from '../../../../lib/letter-catcher-categories';
import LetterCatcherWorldPath, { LC_ANIMALS_SCENE } from './_world-path';

const render = props => renderToStaticMarkup(<LetterCatcherWorldPath {...props} />);
const worlds = [...LC_CATEGORY_ORDER, 'عالم الفضاء'];
const gameWords = worlds.map((category, index) => ({ id: `word-${index}`, category }));
const island = (html, category) => html.match(new RegExp(`<button[^>]*data-lc-world-island="${category}"[^>]*>`))?.[0];

describe('Letter Catcher world selection path', () => {
  it('requires the current image element to load when an artwork URL changes from A to B and back to A', async () => {
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>', { url: 'https://www.aarem.net/' });
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('self', dom.window);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('navigator', dom.window.navigator);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const loadedNodes = new WeakSet();
    Object.defineProperty(dom.window.HTMLImageElement.prototype, 'complete', { configurable: true, get() { return loadedNodes.has(this); } });
    Object.defineProperty(dom.window.HTMLImageElement.prototype, 'naturalWidth', { configurable: true, get() { return loadedNodes.has(this) ? 340 : 0; } });
    dom.window.HTMLImageElement.prototype.decode = () => Promise.resolve();
    const { createRoot } = await import('react-dom/client');
    const { act } = React;
    const host = dom.window.document.getElementById('host');
    const root = createRoot(host);
    const category = worlds[0];
    const show = url => act(async () => root.render(<LetterCatcherWorldPath categories={[category]} gameWords={[{ id: 'one', category }]} catMeta={{ [category]: { image_url: url, emoji: '🦁' } }} />));
    const image = () => host.querySelector('[data-lc-world-image-state]');
    const load = node => act(async () => { loadedNodes.add(node); node.dispatchEvent(new dom.window.Event('load')); });
    try {
      await show('/artwork-a.webp');
      const originalA = image();
      await load(originalA);
      expect(image().getAttribute('data-lc-world-image-state')).toBe('ready');

      await show('/artwork-b.webp');
      expect(image().getAttribute('data-lc-world-image-state')).toBe('loading');
      await show('/artwork-a.webp');
      const replacementA = image();
      expect(replacementA).not.toBe(originalA);
      expect(replacementA.getAttribute('data-lc-world-image-state')).toBe('loading');
      expect(replacementA.style.visibility).toBe('hidden');
      expect(host.querySelector('[data-lc-world-artwork-placeholder]')).not.toBeNull();
      expect(host.textContent).not.toContain('🦁');

      await load(replacementA);
      expect(image().getAttribute('data-lc-world-image-state')).toBe('ready');
      expect(image().style.visibility).toBe('visible');
    } finally {
      await act(async () => root.unmount());
      dom.window.close();
      vi.unstubAllGlobals();
    }
  });

  it('waits for authoritative artwork without displaying default objects or stale images', () => {
    const categories = worlds.slice(0, 2);
    const html = render({
      categories, gameWords, artworkReady: false,
      categoryIcons: { [categories[0]]: { emoji: '🦁' }, [categories[1]]: { emoji: '🌦️' } },
      catMeta: { [categories[0]]: { image_url: '/previous-animal-scene.webp' } },
    });
    expect(html.match(/data-lc-world-artwork-placeholder=/g)).toHaveLength(2);
    expect(html).not.toContain('🦁');
    expect(html).not.toContain('🌦️');
    expect(html).not.toContain('src="/previous-animal-scene.webp"');
    expect(html).not.toContain('data-scene-thumb=');
    expect(html.match(/data-lc-world-island=/g)).toHaveLength(2);
  });

  it('reserves configured artwork while it loads rather than substituting a category emoji', () => {
    const categories = worlds.slice(0, 2);
    const html = render({
      categories, gameWords,
      categoryIcons: { [categories[0]]: { emoji: '🦁' }, [categories[1]]: { emoji: '🌦️' } },
      catMeta: {
        [categories[0]]: { image_url: LC_ANIMALS_SCENE },
        [categories[1]]: { image_url: '/teacher-weather.webp' },
      },
    });
    expect(html.match(/data-lc-world-image-state="loading"/g)).toHaveLength(2);
    expect(html.match(/data-lc-world-artwork-placeholder=/g)).toHaveLength(2);
    expect(html.match(/width="340" height="200"/g)).toHaveLength(2);
    expect(html).toContain(`src="${LC_ANIMALS_SCENE}"`);
    expect(html).toContain('src="/teacher-weather.webp"');
    expect(html).not.toContain('🦁');
    expect(html).not.toContain('🌦️');
    expect(html).not.toContain('data-scene-thumb=');
  });

  it('uses an emoji only when the resolved category has no configured artwork', () => {
    const categories = ['عالم الفضاء'];
    const html = render({
      categories, gameWords: [{ id: 'custom-word', category: categories[0] }],
      catMeta: { [categories[0]]: { image_url: null, emoji: '🚀' } },
    });
    expect(html).toContain('🚀');
    expect(html).toContain('data-scene-thumb=');
    expect(html).not.toContain('data-lc-world-artwork-placeholder=');
    expect(html).not.toContain('data-lc-world-image-state=');
  });

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
    expect(html).not.toContain('مراحل');
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
