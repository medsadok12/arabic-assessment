import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { lcStagesForCategory } from '../../../../lib/letter-catcher-stages';
import LetterCatcherStagePicker from './_stage-picker';

const words = Array.from({ length: 12 }, (_, index) => ({ id: `animal-${String(index).padStart(2, '0')}`, category: 'الحيوانات' }));
const stages = lcStagesForCategory(words, 'الحيوانات', 5);
const props = { category: 'الحيوانات', stages };
const render = extra => renderToStaticMarkup(<LetterCatcherStagePicker {...props} {...extra} />);
const stageButton = (html, index) => html.match(new RegExp(`<button[^>]*data-lc-stage="${stages[index].id}"[^>]*>`))?.[0];
const complete = index => ({ complete: true, wordIds: [...stages[index].wordIds] });

describe('Letter Catcher stage picker', () => {
  it('lists every stage with its actual final-stage size and only the first stage available initially', () => {
    const html = render();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="مراحل الحيوانات"');
    expect(html.match(/data-lc-stage=/g)).toHaveLength(3);
    expect(stageButton(html, 0)).toContain('data-unlocked="true"');
    expect(stageButton(html, 0)).toContain('aria-current="step"');
    expect(stageButton(html, 0)).not.toContain('disabled');
    expect(stageButton(html, 1)).toContain('disabled=""');
    expect(stageButton(html, 2)).toContain('المرحلة 3، 2 كلمة');
    expect(html).toContain('aria-label="0 من 3 مراحل مكتملة"');
  });

  it('opens the next stage using confirmed progress without inventing mastery', () => {
    const html = render({ progress: { [stages[0].id]: complete(0) } });
    expect(stageButton(html, 0)).toContain('data-complete="true"');
    expect(stageButton(html, 0)).not.toContain('aria-current');
    expect(stageButton(html, 1)).toContain('data-unlocked="true"');
    expect(stageButton(html, 1)).toContain('aria-current="step"');
    expect(stageButton(html, 2)).toContain('disabled=""');
    expect(html).toContain('aria-label="1 من 3 مراحل مكتملة"');
    const oldContent = render({ progress: { [stages[0].id]: { complete: true, wordIds: ['different-word'] } } });
    expect(stageButton(oldContent, 1)).toContain('disabled=""');
    expect(oldContent).toContain('aria-label="0 من 3 مراحل مكتملة"');
  });

  it('keeps student stage starts blocked until progress is known and offers recovery if it cannot be loaded', () => {
    const loading = render({ progressLoading: true });
    for (let index = 0; index < stages.length; index += 1) expect(stageButton(loading, index)).toContain('disabled=""');
    expect(loading).toContain('نستعيد مراحل مغامرتك');
    expect(loading).not.toContain('aria-current="step"');
    const failed = render({ progressError: true });
    expect(failed).toContain('حاول مرة أخرى');
    expect(failed).toContain('العودة إلى العوالم');
    for (let index = 0; index < stages.length; index += 1) expect(stageButton(failed, index)).toContain('disabled=""');
  });

  it('allows a teacher to preview every stage even when learner progress is unavailable', () => {
    const html = render({ isTeacher: true, progressLoading: true, progressError: true });
    for (let index = 0; index < stages.length; index += 1) {
      expect(stageButton(html, index)).toContain('data-unlocked="true"');
      expect(stageButton(html, index)).not.toContain('disabled');
    }
    expect(html).toContain('اختر مرحلة لمعاينتها');
    expect(html).not.toContain('حاول مرة أخرى');
  });

  it('disables navigation and all stage starts while a start request is in flight', () => {
    const html = render({ isTeacher: true, busy: true });
    expect(html).toMatch(/aria-label="العودة إلى العوالم" disabled=""/);
    for (let index = 0; index < stages.length; index += 1) expect(stageButton(html, index)).toContain('disabled=""');
    expect(html).toContain('نجهّز لك المرحلة');
  });

  it('keeps recovery and back controls available inside the dialog while an earlier request needs confirmation', () => {
    const html = render({
      isTeacher: true, pending: true,
      status: <div role="status">لم يصل تأكيد البدء.<button type="button">أعد التأكيد</button></div>,
    });
    const back = html.match(/<button[^>]*aria-label="العودة إلى العوالم"[^>]*>/)?.[0];
    expect(back).not.toContain('disabled');
    expect(html).toContain('لم يصل تأكيد البدء.');
    expect(html).toContain('<button type="button">أعد التأكيد</button>');
    expect(html.indexOf('أعد التأكيد')).toBeGreaterThan(html.indexOf('role="dialog"'));
    expect(html.indexOf('أعد التأكيد')).toBeLessThan(html.indexOf('aria-label="مراحل الحيوانات"'));
    for (let index = 0; index < stages.length; index += 1) expect(stageButton(html, index)).toContain('disabled=""');
  });

  it('announces a completed world and uses Western digits in stage descriptions', () => {
    const progress = Object.fromEntries(stages.map((stage, index) => [stage.id, complete(index)]));
    const html = render({ progress, category: 'عالم ٢' });
    expect(html).toContain('aria-label="3 من 3 مراحل مكتملة"');
    expect(html).toContain('أكملت مراحل هذا العالم');
    expect(html).toContain('عالم 2');
    expect(html).not.toMatch(/[\u0660-\u0669\u06f0-\u06f9]/);
  });
});
