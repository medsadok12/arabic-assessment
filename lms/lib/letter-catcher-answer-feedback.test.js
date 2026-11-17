import { describe, expect, it, vi } from 'vitest';
import { createLetterCatcherAnswerFeedback } from './letter-catcher-answer-feedback';

const context = (overrides = {}) => ({
  word: { id: 103, missing_letter: 'وْ' }, index: 2, option: 'و', tried: [], ...overrides,
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe('createLetterCatcherAnswerFeedback', () => {
  it('shows feedback before a deferred network request without confirming results', async () => {
    const feedback = createLetterCatcherAnswerFeedback(), network = deferred(), events = [];
    let settle;
    const handlers = {
      onPreview: vi.fn(attempt => { events.push('preview'); expect(attempt.localRight).toBe(true); }),
      submit: vi.fn((index, option, confirm) => { events.push('submit'); settle = confirm; return network.promise; }),
      onConfirmed: vi.fn(() => events.push('confirmed')),
    };
    expect(feedback.begin(context(), handlers)).toBe(true);
    expect(events).toEqual(['preview', 'submit']);
    expect(feedback.isPending()).toBe(true);
    expect(handlers.submit).toHaveBeenCalledWith(2, 'و', expect.any(Function));
    network.resolve({ right: true, awarded: 5 });
    await network.promise;
    expect(handlers.onConfirmed).not.toHaveBeenCalled();
    expect(feedback.isPending()).toBe(true);
    const response = { right: true, summary: { correct: 1 } };
    settle(response);
    expect(events).toEqual(['preview', 'submit', 'confirmed']);
    expect(handlers.onConfirmed).toHaveBeenCalledWith(response, {
      wordId: '103', index: 2, option: 'و', priorTried: [], localRight: true,
    });
    expect(feedback.isPending()).toBe(false);
  });

  it.each(['null', 'throw', 'reject'])('preserves the attempt for hook retry after submit %s', async failure => {
    const feedback = createLetterCatcherAnswerFeedback();
    let settle;
    const handlers = {
      onPreview: vi.fn(), onConfirmed: vi.fn(),
      submit: vi.fn((index, option, confirm) => {
        settle = confirm;
        if (failure === 'throw') throw new Error('Network failure');
        return failure === 'reject' ? Promise.reject(new Error('Network failure')) : null;
      }),
    };
    expect(feedback.begin(context(), handlers)).toBe(true);
    await Promise.resolve();
    expect(feedback.isPending()).toBe(true);
    expect(handlers.onConfirmed).not.toHaveBeenCalled();
    // The hook retries its stored request and invokes the same callback.
    settle(null);
    expect(feedback.isPending()).toBe(true);
    settle({ right: true });
    settle({ right: true });
    expect(handlers.onPreview).toHaveBeenCalledTimes(1);
    expect(handlers.submit).toHaveBeenCalledTimes(1);
    expect(handlers.onConfirmed).toHaveBeenCalledTimes(1);
    expect(feedback.isPending()).toBe(false);
  });

  it('locks immediately against rapid or reentrant taps and ignores duplicate callbacks', () => {
    const feedback = createLetterCatcherAnswerFeedback();
    let settle;
    const handlers = {
      onPreview: vi.fn(() => expect(feedback.begin(context({ option: 'ط' }), handlers)).toBe(false)),
      submit: vi.fn((index, option, confirm) => { settle = confirm; }),
      onConfirmed: vi.fn(),
    };
    feedback.begin(context(), handlers);
    expect(feedback.begin(context(), handlers)).toBe(false);
    settle({ right: true }); settle({ right: true });
    expect(handlers.submit).toHaveBeenCalledTimes(1);
    expect(handlers.onConfirmed).toHaveBeenCalledTimes(1);
  });

  it('ignores an invalidated reply without unlocking or confirming a newer question', () => {
    const feedback = createLetterCatcherAnswerFeedback(), callbacks = [];
    const handlers = {
      onPreview: vi.fn(), onConfirmed: vi.fn(),
      submit: vi.fn((index, option, confirm) => { callbacks.push(confirm); }),
    };
    feedback.begin(context(), handlers);
    feedback.invalidate();
    expect(feedback.isPending()).toBe(false);
    feedback.begin(context({ word: { id: 121, missing_letter: 'لٌ' }, index: 3, option: 'ل' }), handlers);
    callbacks[0]({ right: true, awarded: 5 });
    expect(handlers.onConfirmed).not.toHaveBeenCalled();
    expect(feedback.isPending()).toBe(true);
    callbacks[1]({ right: true });
    expect(handlers.onConfirmed).toHaveBeenCalledTimes(1);
    expect(handlers.onConfirmed.mock.calls[0][1].wordId).toBe('121');
  });

  it('preserves the predicted verdict and prior attempts when the server disagrees', () => {
    const feedback = createLetterCatcherAnswerFeedback(), tried = ['ط'];
    let settle, preview;
    const onConfirmed = vi.fn();
    feedback.begin(context({ tried }), {
      onPreview: attempt => { preview = attempt; },
      submit: (index, option, confirm) => { settle = confirm; }, onConfirmed,
    });
    tried.push('ك');
    const response = { right: false, questionDone: true };
    settle(response);
    expect(onConfirmed).toHaveBeenCalledWith(response, preview);
    expect(preview).toMatchObject({ localRight: true, priorTried: ['ط'] });
    expect(feedback.isPending()).toBe(false);
  });

  it.each([
    ['ا\u0654', 'أ', true],
    ['ـلَـ', 'لٌ', true],
    ['قِّٰ', 'قْ', true],
    ['أ', 'ا', false],
    [' ل ', 'ل', false],
    ['ل\u200d', 'ل', false],
  ])('matches server normalization for %s against %s', (option, missing, localRight) => {
    const feedback = createLetterCatcherAnswerFeedback(), onPreview = vi.fn();
    feedback.begin(context({ option, word: { id: 1, missing_letter: missing } }), {
      onPreview, onConfirmed: vi.fn(), submit: vi.fn(),
    });
    expect(onPreview.mock.calls[0][0].localRight).toBe(localRight);
  });

  it('supports synchronous confirmation in teacher preview without leaving a lock', () => {
    const feedback = createLetterCatcherAnswerFeedback(), order = [];
    expect(feedback.begin(context(), {
      onPreview: () => order.push('preview'),
      submit: (index, option, settle) => { order.push('submit'); settle({ right: true, preview: true }); },
      onConfirmed: () => order.push('confirmed'),
    })).toBe(true);
    expect(order).toEqual(['preview', 'submit', 'confirmed']);
    expect(feedback.isPending()).toBe(false);
  });
});
