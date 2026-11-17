import { describe, expect, it } from 'vitest';
import { getLetterForm, ZWJ } from './letter-forms';
import { contextualTile, extendedChoiceLetter, letterCatcherTiles, letterCatcherDisplayWord, splitVocalizedLetters } from './letter-catcher-tiles';

describe('extended answer-choice connectors', () => {
  it.each([
    ['لٌ', 'final', 'ــل'], ['ج', 'final', 'ــج'],
    ['بِ', 'initial', 'بــ'], ['م', 'medial', 'ــمــ'],
    ['ل', 'isolated', 'ل'],
  ])('extends only the joining sides of %s in %s form', (letter, form, expected) => {
    expect(extendedChoiceLetter(letter, form)).toBe(expected);
  });

  it.each([...'دذرزواأإآؤٱةى'])('does not add a detached left arm to the distractor %s', letter => {
    expect(extendedChoiceLetter(letter, 'initial')).toBe(letter);
    expect(extendedChoiceLetter(letter, 'medial')).toBe(`ــ${letter}`);
    expect(extendedChoiceLetter(letter, 'final')).toBe(`ــ${letter}`);
  });

  it.each(['isolated', 'initial', 'medial', 'final'])('keeps standalone hamza unjoined in %s slots', form => {
    expect(extendedChoiceLetter('ء', form)).toBe('ء');
  });

  it('keeps the source, completed word and word tiles at their original lengths', () => {
    const word = { word: 'جَمَ_', missing_letter: 'لٌ' };
    const before = letterCatcherTiles(word);
    expect(extendedChoiceLetter(word.missing_letter, before.missingForm)).toBe('ــل');
    expect(letterCatcherTiles(word)).toEqual(before);
    expect(before.fullWord).toBe('جَمَلٌ');
    expect(before.displayWord).not.toContain('ـ');
    expect(contextualTile(before.displayLetters[2], 'final')).toBe(`${ZWJ}لٌ`);
  });
});

describe('Letter Catcher long-vowel display convention', () => {
  it.each([
    ['زَرَافَةٌ', 'زَرافَةٌ'], ['فِيلٌ', 'فيلٌ'], ['عُصْفُورٌ', 'عُصْفورٌ'],
    ['سِنْجَابٌ', 'سِنْجابٌ'], ['حِمَارٌ وَحْشِيٌّ', 'حِمارٌ وَحْشِيٌّ'],
    ['سَيَّارَةٌ', 'سَيّارَةٌ'], ['رَمَى', 'رَمى'], ['كِتَابًا', 'كِتابًا'],
    ['مُوسَى', 'موسى'], ['حَيَوَانٌ', 'حَيَوانٌ'], ['سُؤَالٌ', 'سُؤالٌ'],
  ])('formats %s as %s', (source, display) => {
    expect(letterCatcherDisplayWord(source)).toBe(display);
    expect(letterCatcherDisplayWord(source.normalize('NFD'))).toBe(display.normalize('NFD'));
  });

  it.each(['بَيْتٌ', 'ثَوْرٌ', 'قُوَّةٌ', 'نَبِيٌّ', 'هِيَ', 'رَأْسٌ', 'سَأَلَ', 'فَتًى', 'قِطٌّ'])('preserves consonants, tanwin and other marks in %s', word => {
    expect(letterCatcherDisplayWord(word)).toBe(word);
  });

  it('uses the same display in tiles and the completed word while retaining the source', () => {
    const result = letterCatcherTiles({ word: 'سِنْ_ابٌ', missing_letter: 'جَ' });
    expect(result.fullWord).toBe('سِنْجَابٌ');
    expect(result.displayWord).toBe('سِنْجابٌ');
    expect(result.letters[result.missingIndex]).toBe('جَ');
    expect(result.displayLetters[result.missingIndex]).toBe('ج');
    expect(result.displayLetters.join('')).toBe(result.displayWord);
    expect(result.displayLetters).toHaveLength(result.letters.length);
  });
});

describe('Letter Catcher vocalized tiles', () => {
  it('keeps shadda, vowels, tanwin and dagger alif attached to a single base letter', () => {
    expect(splitVocalizedLetters('قِطٌّ هٰذَا')).toEqual(['قِ', 'طٌّ', ' ', 'هٰ', 'ذَ', 'ا']);
    expect(splitVocalizedLetters('قِطٌّ'.normalize('NFD'))).toHaveLength(2);
  });

  it('reconstructs a missing letter with the marks retained after the marker', () => {
    const result = letterCatcherTiles({ word: 'قِ_ٌّ', missing_letter: 'ط' });
    expect(result.fullWord).toBe('قِطٌّ');
    expect(result.letters).toEqual(['قِ', 'طٌّ']);
    expect(result.baseLetters).toEqual(['ق', 'ط']);
    expect(result.missingIndex).toBe(1);
    expect(result.missingForm).toBe('final');
    expect(contextualTile(result.letters[result.missingIndex], result.missingForm)).toBe(`${ZWJ}طٌّ`);
  });

  it('supports both marked missing_letter values and legacy marked placeholders', () => {
    const storedTarget = letterCatcherTiles({ word: 'سِنْ_ابٌ', missing_letter: 'جَ' });
    const storedMarks = letterCatcherTiles({ word: 'سِنْ_َابٌ', missing_letter: 'ج' });
    expect(storedTarget).toEqual(storedMarks);
    expect(storedTarget.fullWord).toBe('سِنْجَابٌ');
    expect(storedTarget.missingIndex).toBe(2);
    expect(storedTarget.letters[2]).toBe('جَ');
    expect(storedTarget.missingForm).toBe('medial');
  });

  it('uses an explicit marker instead of the first occurrence of a repeated letter', () => {
    const result = letterCatcherTiles({ word: 'سُ_ْسٌ', missing_letter: 'س' });
    expect(result.missingIndex).toBe(1);
    expect(result.letters).toEqual(['سُ', 'سْ', 'سٌ']);
    expect(result.missingForm).toBe('medial');
    expect(contextualTile(result.letters[1], result.missingForm)).toBe(`${ZWJ}سْ${ZWJ}`);
  });

  it('finds an unmarked answer letter inside a fully vocalized word without a marker', () => {
    const result = letterCatcherTiles({ word: 'أَرْنَبٌ', missing_letter: 'ن' });
    expect(result.missingIndex).toBe(2);
    expect(result.missingForm).toBe('initial');
    expect(result.letters[2]).toBe('نَ');
    expect(contextualTile(result.letters[2], result.missingForm)).toBe(`نَ${ZWJ}`);
  });

  it('preserves phrase spacing without adding gap tiles or joining across words', () => {
    const result = letterCatcherTiles({ word: '  حِمَارٌ  وَحْ_ِيٌّ ', missing_letter: 'ش' });
    expect(result.fullWord).toBe('  حِمَارٌ  وَحْشِيٌّ ');
    expect(result.letterGroups).toEqual([[2, 3, 4, 5], [8, 9, 10, 11]]);
    expect(result.missingIndex).toBe(10);
    expect(result.missingForm).toBe('medial');
    expect(getLetterForm(result.baseLetters, 5)).toBe('isolated');
    expect(getLetterForm(result.baseLetters, 8)).toBe('isolated');
    expect(result.letterGroups.flat()).toHaveLength(8);
  });

  it('retains marks through every contextual joining form', () => {
    expect(contextualTile('بِ', 'initial')).toBe(`بِ${ZWJ}`);
    expect(contextualTile('بٌّ', 'medial')).toBe(`${ZWJ}بٌّ${ZWJ}`);
    expect(contextualTile('بْ', 'final')).toBe(`${ZWJ}بْ`);
    expect(contextualTile('دٌ', 'isolated')).toBe('دٌ');
  });

  it('preserves legacy unvocalized words and the missing-answer fallback', () => {
    const plain = letterCatcherTiles({ word: 'حمار وحشي', missing_letter: 'ش' });
    expect(plain.letterGroups).toEqual([[0, 1, 2, 3], [5, 6, 7, 8]]);
    expect(plain.missingIndex).toBe(7);
    expect(letterCatcherTiles({ word: 'قِطٌّ', missing_letter: 'ب' }).missingIndex).toBe(-1);
  });
});
