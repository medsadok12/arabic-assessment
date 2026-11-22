import { describe, expect, it } from 'vitest';
import { ZWJ } from './letter-forms';
import { letterCatcherWordFrame, usesAnimalWordFrame } from './letter-catcher-word-frame';

describe('animal-only word-frame rollout', () => {
  it.each([
    { category: 'الحيوانات' },
    { category: '  الْحَيَواناتُ  ' },
    { category: 'animals' },
    { topic: 'الحيوانات' },
    { category: '', topic: 'الحيوانات' },
  ])('recognizes the actual animal word category: %j', row => {
    expect(usesAnimalWordFrame(row)).toBe(true);
  });

  it.each([
    undefined, {}, { category: '__all__' }, { category: 'المزرعة' },
    { category: 'الفواكه', selectedCategory: 'الحيوانات' },
    { category: 'المزرعة', topic: 'الحيوانات' },
  ])('does not infer animal scope from a selection or another topic: %j', row => {
    expect(usesAnimalWordFrame(row)).toBe(false);
  });
});

describe('contextual Arabic letters around the missing-letter marker', () => {
  it.each([
    ['بَقَرَةٌ', 'ق', `بَ${ZWJ}`, `${ZWJ}رَةٌ`, true, true],
    ['سَمَكَةٌ', 'م', `سَ${ZWJ}`, `${ZWJ}كَةٌ`, true, true],
    ['جَمَلٌ', 'ل', `جَمَ${ZWJ}`, '', true, false],
    ['أَسَدٌ', 'س', 'أَ', `${ZWJ}دٌ`, false, true],
    ['فَرَسٌ', 'ر', `فَ${ZWJ}`, 'سٌ', true, false],
    ['كَلْبٌ', 'ل', `كَ${ZWJ}`, `${ZWJ}بٌ`, true, true],
  ])('preserves the original joining edges in %s with %s hidden', (word, missing_letter, before, after, joinsBefore, joinsAfter) => {
    const frame = letterCatcherWordFrame({ word, missing_letter });
    expect(frame).toMatchObject({ before, after, joinsBefore, joinsAfter, hasMissing: true });
    expect(frame.text).toBe(word);
    expect(frame.displayWord).toBe(word);
    expect(frame.before + frame.after).not.toContain('\u0640');
  });

  it('keeps each side of a hidden alif in its own correct form', () => {
    const frame = letterCatcherWordFrame({ word: 'بَابٌ', missing_letter: 'ا' });
    expect(frame).toMatchObject({
      before: `ب${ZWJ}`, after: 'بٌ', displayWord: 'بابٌ',
      joinsBefore: true, joinsAfter: false,
    });
  });

  it('does not join a visible letter into a hidden standalone hamza', () => {
    const frame = letterCatcherWordFrame({ word: 'شَيْءٌ', missing_letter: 'ء' });
    expect(frame).toMatchObject({ before: 'شَيْ', after: '', joinsBefore: false, joinsAfter: false });
  });

  it('receives a connection into waw-hamza without joining it to the next letter', () => {
    const frame = letterCatcherWordFrame({ word: 'لُؤْلُؤٌ', missing_letter: 'ؤ' });
    expect(frame).toMatchObject({ before: `لُ${ZWJ}`, after: 'لُؤٌ', joinsBefore: true, joinsAfter: false });
  });

  it('preserves both connections around a hidden ya-hamza', () => {
    const frame = letterCatcherWordFrame({ word: 'مِئَةٌ', missing_letter: 'ئ' });
    expect(frame).toMatchObject({ before: `مِ${ZWJ}`, after: `${ZWJ}ةٌ`, joinsBefore: true, joinsAfter: true });
  });

  it('preserves compound-word spacing and never bridges a word boundary', () => {
    const frame = letterCatcherWordFrame({ word: '  حِمَارٌ  _َحْشِيٌّ ', missing_letter: 'و' });
    expect(frame).toMatchObject({
      before: '  حِمارٌ  ', after: 'حْشِيٌّ ',
      displayWord: '  حِمارٌ  وَحْشِيٌّ ', joinsBefore: false, joinsAfter: false,
    });
  });

  it('preserves joins inside the second word of a compound without altering the first', () => {
    const frame = letterCatcherWordFrame({ word: 'حِمَارٌ وَحْ_ِيٌّ', missing_letter: 'ش' });
    expect(frame).toMatchObject({
      before: `حِمارٌ وَحْ${ZWJ}`, after: `${ZWJ}يٌّ`,
      displayWord: 'حِمارٌ وَحْشِيٌّ', joinsBefore: true, joinsAfter: true,
    });
  });

  it('uses an explicit marker for a repeated letter and hides its own sukun', () => {
    const frame = letterCatcherWordFrame({ word: 'سُ_ْسٌ', missing_letter: 'س' });
    expect(frame).toMatchObject({
      before: `سُ${ZWJ}`, after: `${ZWJ}سٌ`, missingIndex: 1, displayWord: 'سُسْسٌ',
    });
    expect(frame.before + frame.after).not.toContain('\u0652');
  });
});

describe('word-frame vocalization and source integrity', () => {
  it('keeps visible shadda, vowel and tanwin on their letter, with joiners outside the whole cluster', () => {
    const frame = letterCatcherWordFrame({ word: 'بَطَّةٌ', missing_letter: 'ب' });
    expect(frame).toMatchObject({ before: '', after: `${ZWJ}طَّةٌ`, joinsBefore: false, joinsAfter: true });
  });

  it('hides all shadda and tanwin belonging to the missing letter', () => {
    const frame = letterCatcherWordFrame({ word: 'قِ_ٌّ', missing_letter: 'ط' });
    expect(frame).toMatchObject({ before: `قِ${ZWJ}`, after: '', displayWord: 'قِطٌّ' });
    expect(frame.before + frame.after).not.toMatch(/[\u0651\u064c]/);
  });

  it('removes the hidden final letter together with its tanwin', () => {
    const frame = letterCatcherWordFrame({ word: 'جَمَ_', missing_letter: 'لٌ' });
    expect(frame).toMatchObject({ before: `جَمَ${ZWJ}`, after: '', text: 'جَمَلٌ' });
    expect(frame.before + frame.after).not.toContain('\u064c');
  });

  it('retains the existing madd display convention without modifying pronunciation or source data', () => {
    const row = Object.freeze({ word: 'سِنْ_ابٌ', missing_letter: 'جَ', category: 'الحيوانات', image_url: '/original.png' });
    const original = { ...row };
    const frame = letterCatcherWordFrame(row);
    expect(frame).toMatchObject({
      before: `سِنْ${ZWJ}`, after: `${ZWJ}ابٌ`, displayWord: 'سِنْجابٌ', fullWord: 'سِنْجَابٌ',
    });
    expect(row).toEqual(original);
  });

  it('keeps non-madd sukun and shadda in neighboring letters', () => {
    const frame = letterCatcherWordFrame({ word: 'قُوَّةٌ', missing_letter: 'ة' });
    expect(frame).toMatchObject({ before: 'قُوَّ', after: '', displayWord: 'قُوَّةٌ', joinsBefore: false });
  });

  it('keeps decomposed hamza and vowel marks with their grapheme', () => {
    const row = { word: 'أَ_َدٌ'.normalize('NFD'), missing_letter: 'س' };
    const frame = letterCatcherWordFrame(row);
    expect(frame).toMatchObject({ before: 'أَ'.normalize('NFD'), after: `${ZWJ}دٌ`, joinsBefore: false, joinsAfter: true });
  });

  it('shows the full display word with no marker when the answer is absent', () => {
    expect(letterCatcherWordFrame({ word: 'قِطٌّ', missing_letter: 'ب' })).toMatchObject({
      before: 'قِطٌّ', after: '', text: 'قِطٌّ', displayWord: 'قِطٌّ',
      missingIndex: -1, hasMissing: false, joinsBefore: false, joinsAfter: false,
    });
  });

  it('does not hide another letter when an invalid row has an empty answer', () => {
    expect(letterCatcherWordFrame({ word: 'بَ_رَةٌ', missing_letter: '' })).toMatchObject({ hasMissing: false, missingIndex: -1 });
    expect(letterCatcherWordFrame()).toMatchObject({ before: '', after: '', hasMissing: false });
    expect(letterCatcherWordFrame(null)).toMatchObject({ before: '', after: '', hasMissing: false });
  });
});
