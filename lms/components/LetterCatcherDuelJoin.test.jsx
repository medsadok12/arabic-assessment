// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LetterCatcherDuel from './LetterCatcherDuel';

const network = vi.hoisted(() => ({ handler: null, calls: [] }));
vi.mock('../lib/child-fetch', () => ({
  getActiveChildTab: () => 'child-ali',
  childFetch: (url, options) => {
    const body = options?.body ? JSON.parse(options.body) : null;
    network.calls.push({ url, body });
    return network.handler(url, options);
  },
}));

const ali = { id: 'child-ali', name: 'علي', score: 0, ready: false, avatar_url: '/ali.webp', connected: true };
const fatima = { id: 'child-fatima', name: 'فاطمة', score: 0, ready: false, avatar_url: '/fatima.webp', connected: true };
const savedKey = 'lc_duel_room_v1:child-ali';
const lobby = (code, players = [ali]) => ({
  id: `room-${code}`, code, status: 'waiting', revision: 1, serverNow: Date.now(), meId: ali.id,
  players, currentQuestion: null, ownAnswer: {}, questionIndex: -1, totalQuestions: 10,
  settings: { soundEnabled: false, motionEnabled: false, encouragementEnabled: false },
});
const reply = (room, status = 200, error) => ({ ok: status >= 200 && status < 300, status, json: async () => error ? { error } : { room: structuredClone(room) } });
const command = (url, options) => options?.body ? JSON.parse(options.body) : { action: 'get', code: new URL(url, 'http://test.local').searchParams.get('code') };
const joins = () => network.calls.filter(call => call.body?.action === 'join');
let container, root;

beforeEach(() => {
  vi.useFakeTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  network.calls = []; network.handler = async () => reply(null, 404, 'لم نجد هذا التحدّي.');
  sessionStorage.clear();
  container = document.createElement('div'); document.body.append(container);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; container.remove(); sessionStorage.clear();
  vi.clearAllTimers(); vi.useRealTimers();
});
const mount = async () => {
  root = createRoot(container);
  await act(async () => root.render(<LetterCatcherDuel currentPlayer={ali} />));
};
const click = async text => {
  const button = [...container.querySelectorAll('button')].find(node => node.textContent === text);
  expect(button).toBeTruthy();
  await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};
const typeCode = async value => {
  const input = container.querySelector('[data-lc-duel-join-code]');
  expect(input).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const submit = async () => {
  await act(async () => container.querySelector('[data-lc-duel-join-form]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
};
const currentCode = () => container.querySelector('[data-lc-duel-room-code]')?.textContent;

describe('joining a friend from a waiting Letter Catcher room', () => {
  it('joins an independently created friend lobby from a newly created own lobby', async () => {
    const ownRoom = lobby('111111');
    const friendsRoom = lobby('222222', [fatima, ali]);
    network.handler = async (url, options) => {
      const body = command(url, options);
      return reply(body.action === 'create' ? ownRoom : body.code === '222222' ? friendsRoom : ownRoom);
    };
    await mount();
    expect(container.querySelectorAll('[data-lc-duel-join-form]')).toHaveLength(1);
    await click('أنشئ تحديًا لصديقي');
    expect(currentCode()).toBe('111111');
    expect(container.querySelectorAll('[data-lc-duel-join-form]')).toHaveLength(1);
    await typeCode('222222'); await submit();
    expect(joins().map(call => call.body.code)).toEqual(['222222']);
    expect(currentCode()).toBe('222222');
    expect(sessionStorage.getItem(savedKey)).toBe('222222');
    expect(container.querySelectorAll('[data-lc-player-avatar]')).toHaveLength(2);
    expect(network.calls.some(call => call.body?.action === 'leave')).toBe(false);
    expect(ownRoom.players).toHaveLength(1);
  });

  it('keeps the code entry visible after restoring a solo waiting room', async () => {
    sessionStorage.setItem(savedKey, '111111');
    network.handler = async () => reply(lobby('111111'));
    await mount();
    expect(currentCode()).toBe('111111');
    const form = container.querySelector('[data-lc-duel-join-form]');
    const copyButton = [...container.querySelectorAll('button')].find(button => button.textContent === 'انسخ الرمز');
    const ownPhoto = container.querySelector('[data-player-id="child-ali"]');
    expect(copyButton.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(form.compareDocumentPosition(ownPhoto) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([
    [404, 'لم نجد تحديًا بهذا الرمز.'],
    [409, 'هذا التحدّي ممتلئ. اطلب رمزًا آخر.'],
    [400, 'تحقّق من رمز صديقك ثم حاول مرة أخرى.'],
  ])('retains the current room and photos when joining fails with %s', async (status, message) => {
    sessionStorage.setItem(savedKey, '111111');
    network.handler = async (url, options) => command(url, options).action === 'join' ? reply(null, status, message) : reply(lobby('111111'));
    await mount(); await typeCode('999999'); await submit();
    expect(currentCode()).toBe('111111');
    expect(sessionStorage.getItem(savedKey)).toBe('111111');
    expect(container.querySelector('[data-player-id="child-ali"] img')?.getAttribute('src')).toBe('/ali.webp');
    expect(container.querySelector('[data-lc-duel-join-message]').textContent).toBe(message);
    expect(container.querySelector('[data-lc-duel-join-code]').value).toBe('999999');
    expect(network.calls.some(call => call.body?.action === 'leave')).toBe(false);
  });

  it('explains an own code locally without submitting or discarding its room', async () => {
    sessionStorage.setItem(savedKey, '111111');
    network.handler = async () => reply(lobby('111111'));
    await mount(); await typeCode('١١١١١١'); await submit();
    expect(joins()).toHaveLength(0);
    expect(currentCode()).toBe('111111');
    expect(sessionStorage.getItem(savedKey)).toBe('111111');
    expect(container.querySelector('[data-lc-duel-join-message]').textContent).toContain('هذا رمز تحدّيك');
    expect(container.querySelector('[data-lc-duel-join-code]').value).toBe('111111');
  });

  it('keeps the current room and explains a network failure in Arabic', async () => {
    sessionStorage.setItem(savedKey, '111111');
    network.handler = async (url, options) => {
      if (command(url, options).action === 'join') throw new TypeError('Failed to fetch');
      return reply(lobby('111111'));
    };
    await mount(); await typeCode('222222'); await submit();
    expect(currentCode()).toBe('111111');
    expect(sessionStorage.getItem(savedKey)).toBe('111111');
    expect(container.querySelector('[data-lc-duel-join-message]').textContent).toContain('رمزك الحالي محفوظ');
    expect(container.textContent).not.toContain('Failed to fetch');
  });

  it('stops a stale join form when a partner arrives while the code is being entered', async () => {
    sessionStorage.setItem(savedKey, '111111');
    let reads = 0;
    network.handler = async () => reply(lobby('111111', ++reads === 1 ? [ali] : [ali, fatima]));
    await mount(); await typeCode('222222');
    const staleForm = container.querySelector('[data-lc-duel-join-form]');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      staleForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(container.querySelector('[data-lc-duel-join-form]')).toBeNull();
    expect(joins()).toHaveLength(0);
    expect(currentCode()).toBe('111111');
    expect(container.querySelectorAll('[data-lc-player-avatar]')).toHaveLength(2);
  });

  it.each([200, 404])('ignores a late old-room poll (%s) after a successful join', async status => {
    sessionStorage.setItem(savedKey, '111111');
    let reads = 0, releaseOldPoll;
    network.handler = async (url, options) => {
      const body = command(url, options);
      if (body.action === 'join') return reply(lobby('222222', [fatima, ali]));
      if (body.code === '111111' && ++reads > 1) return new Promise((resolve, reject) => {
        releaseOldPoll = resolve;
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
      return reply(lobby('111111'));
    };
    await mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(releaseOldPoll).toBeTypeOf('function');
    await typeCode('222222'); await submit();
    expect(currentCode()).toBe('222222');
    await act(async () => releaseOldPoll(reply({ ...lobby('111111'), revision: 500 }, status, status === 404 ? 'لم نجد الغرفة القديمة.' : undefined)));
    expect(currentCode()).toBe('222222');
    expect(sessionStorage.getItem(savedKey)).toBe('222222');
    expect(container.textContent).not.toContain('لم نجد الغرفة القديمة');
    expect(container.querySelectorAll('[data-lc-player-avatar]')).toHaveLength(2);
  });
});
