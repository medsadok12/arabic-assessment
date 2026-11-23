// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LetterCatcherPlayerAvatar from './LetterCatcherPlayerAvatar';
import LetterCatcherDuelScores, { LetterCatcherDuelResultPlayers } from './LetterCatcherDuelScores';
import LetterCatcherDuel from './LetterCatcherDuel';

const ali = { id: 'child-ali', name: 'علي', avatar_url: '/ali-account.webp', score: 125 };
const fatima = { id: 'child-fatima', name: 'فاطمة', avatar_url: '/fatima-account.webp', score: 140 };
const network = vi.hoisted(() => ({ room: null }));
vi.mock('../lib/child-fetch', () => ({
  getActiveChildTab: () => 'child-ali',
  childFetch: async () => ({ ok: true, json: async () => ({ room: network.room, award: { state: 'done', amount: 125 }, awarded: 125 }) }),
}));
let container, root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; container.remove();
  sessionStorage.clear(); network.room = null;
});
const mount = async element => {
  if (!root) root = createRoot(container);
  await act(async () => root.render(element));
};
const pair = (first = ali, second = fatima) => <><LetterCatcherPlayerAvatar player={first} /><LetterCatcherPlayerAvatar player={second} /></>;
const photo = id => container.querySelector(`[data-player-id="${id}"] img`);
const fallback = id => container.querySelector(`[data-player-id="${id}"] [data-lc-avatar-fallback]`);

describe('account photos in Letter Catcher', () => {
  it('renders each account photo with a stable circle and an optional accessible label', () => {
    const html = renderToStaticMarkup(<LetterCatcherPlayerAvatar player={{ ...ali, name: 'علي ٣' }} size={48} decorative={false} />);
    expect(html).toContain('src="/ali-account.webp"');
    expect(html).toContain('--lc-player-avatar-size:48px');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="صورة علي 3"');
    expect(html).not.toContain('aria-hidden="true"');
  });

  it('uses a neutral fallback only for an account without a photo', async () => {
    await mount(pair({ ...ali, avatar_url: null }));
    expect(fallback(ali.id)).not.toBeNull();
    expect(photo(ali.id)).toBeNull();
    expect(photo(fatima.id)?.getAttribute('src')).toBe(fatima.avatar_url);
    expect(container.textContent).not.toContain('🧒');
  });

  it('keeps the other account photo when one image fails', async () => {
    await mount(pair());
    await act(async () => photo(ali.id).dispatchEvent(new Event('error')));
    expect(fallback(ali.id)).not.toBeNull();
    expect(photo(ali.id)).toBeNull();
    expect(photo(fatima.id)?.getAttribute('src')).toBe(fatima.avatar_url);
    expect(fallback(fatima.id)).toBeNull();
  });

  it('retries a changed photo URL and ignores an old image failure', async () => {
    await mount(pair());
    const old = photo(ali.id);
    await act(async () => old.dispatchEvent(new Event('error')));
    await mount(pair({ ...ali, avatar_url: '/ali-new-account.webp' }));
    await act(async () => old.dispatchEvent(new Event('error')));
    expect(photo(ali.id)?.getAttribute('src')).toBe('/ali-new-account.webp');
    expect(fallback(ali.id)).toBeNull();
    expect(photo(fatima.id)?.getAttribute('src')).toBe(fatima.avatar_url);
  });

  it('does not carry a failed image into a different child with the same URL', async () => {
    await mount(pair());
    await act(async () => photo(ali.id).dispatchEvent(new Event('error')));
    await mount(pair({ ...ali, id: 'different-child', name: 'طفل آخر' }));
    expect(photo('different-child')?.getAttribute('src')).toBe(ali.avatar_url);
    expect(fallback('different-child')).toBeNull();
    expect(container.querySelector(`[data-player-id="${ali.id}"]`)).toBeNull();
  });

  it('keeps both server scores and photos in the scoreboard', () => {
    const html = renderToStaticMarkup(<LetterCatcherDuelScores me={ali} opponent={fatima} />);
    expect(html).toContain('src="/ali-account.webp"');
    expect(html).toContain('src="/fatima-account.webp"');
    expect(html).toContain('نقاط علي: 125');
    expect(html).toContain('نقاط فاطمة: 140');
    expect(html.match(/data-lc-player-avatar=/g)).toHaveLength(2);
  });

  it('shows both named account photos and final server scores in results', async () => {
    await mount(<LetterCatcherDuelResultPlayers me={ali} opponent={fatima} />);
    const ownCard = container.querySelector('[data-lc-duel-result-player="self"]');
    const otherCard = container.querySelector('[data-lc-duel-result-player="opponent"]');
    expect(ownCard.textContent).toContain('علي');
    expect(ownCard.textContent).toContain('125');
    expect(otherCard.textContent).toContain('فاطمة');
    expect(otherCard.textContent).toContain('140');
    await act(async () => photo(ali.id).dispatchEvent(new Event('error')));
    expect(fallback(ali.id)).not.toBeNull();
    expect(photo(fatima.id)?.getAttribute('src')).toBe(fatima.avatar_url);
  });

  it('uses the active-child profile in the create/join lobby before a room exists', () => {
    const html = renderToStaticMarkup(<LetterCatcherDuel currentPlayer={ali} />);
    expect(html).toContain('data-lc-duel-current-player=""');
    expect(html).toContain('src="/ali-account.webp"');
    expect(html).toContain('علي');
    expect(html).toContain('أنشئ تحديًا لصديقي');
    expect(html).not.toContain('src="/fatima-account.webp"');
  });

  it('keeps the final review scoreboard, then shows exactly two result photos', async () => {
    vi.useFakeTimers();
    const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    network.room = {
      id: 'finished-room', code: '123456', status: 'finished', serverNow: Date.now(), revision: 1,
      meId: ali.id, players: [ali, fatima], questionIndex: 9, totalQuestions: 10,
      startsAt: Date.now() - 20000, deadlineAt: Date.now(),
      settings: { soundEnabled: false, motionEnabled: false, encouragementEnabled: false },
      ownAnswer: { done: true, right: false, letter: 'ب', tried: ['ب'], award: 0 }, roundAwards: { [ali.id]: 0, [fatima.id]: 0 },
      currentQuestion: { id: 'last-cat', options: ['ق', 'ك', 'ب'], image_url: '/cat-image.webp', frame: { before: '', after: 'طٌّ' }, review: { word: 'قِطٌّ', correctLetter: 'ق', audio_url: null } },
    };
    sessionStorage.setItem('lc_duel_room_v1:child-ali', '123456');
    try {
      await mount(<LetterCatcherDuel currentPlayer={ali} />);
      expect(container.querySelector('[data-lc-duel-scores]')).not.toBeNull();
      expect(container.querySelector('[data-lc-duel-result-players]')).toBeNull();
      await act(async () => vi.advanceTimersByTimeAsync(1400));
      const resultButton = [...container.querySelectorAll('button')].find(button => button.textContent === 'شاهد نجومنا!');
      expect(resultButton?.disabled).toBe(false);
      await act(async () => resultButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(container.querySelector('[data-lc-duel-scores]')).toBeNull();
      expect(container.querySelector('[data-lc-duel-result-players]')).not.toBeNull();
      expect(container.querySelectorAll('[data-lc-player-avatar]')).toHaveLength(2);
      expect(photo(ali.id)?.getAttribute('src')).toBe(ali.avatar_url);
      expect(photo(fatima.id)?.getAttribute('src')).toBe(fatima.avatar_url);
    } finally {
      if (root) await act(async () => root.unmount());
      root = null; canvas.mockRestore(); vi.useRealTimers();
    }
  });
});
