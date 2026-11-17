import { getLetterForm, isGap, ZWJ } from './letter-forms';

const MARK = /\p{M}/u;
const MARKS = /\p{M}/gu;

// A tile contains a base letter and all its marks (including shadda + tanwin).
// Splitting code points alone would turn those marks into extra letter tiles.
export function splitVocalizedLetters(text = '') {
  const letters = [];
  for (const character of text) {
    if (MARK.test(character) && letters.length && !isGap(letters[letters.length - 1])) {
      letters[letters.length - 1] += character;
    } else letters.push(character);
  }
  return letters;
}

export function letterCatcherTiles({ word = '', missing_letter = '' }) {
  const marker = word.indexOf('_');
  const fullWord = marker < 0 ? word : word.replace('_', missing_letter);
  const letters = splitVocalizedLetters(fullWord);
  const baseLetters = letters.map(letter => letter.replace(MARKS, ''));
  const missingIndex = marker >= 0
    ? splitVocalizedLetters(word.slice(0, marker)).length
    : baseLetters.indexOf(missing_letter.replace(MARKS, ''));
  const letterGroups = [];
  let group = [];
  letters.forEach((letter, index) => {
    if (isGap(letter)) {
      if (group.length) letterGroups.push(group);
      group = [];
    } else group.push(index);
  });
  if (group.length) letterGroups.push(group);
  return {
    fullWord, letters, baseLetters, missingIndex, letterGroups,
    missingForm: missingIndex < 0 ? 'isolated' : getLetterForm(baseLetters, missingIndex),
  };
}

// Keep the joiners outside the entire grapheme so marks stay on their own letter.
// The shared toContextual() deliberately removes marks for answer choices elsewhere.
export function contextualTile(letter, form) {
  if (form === 'initial') return letter + ZWJ;
  if (form === 'medial') return ZWJ + letter + ZWJ;
  if (form === 'final') return ZWJ + letter;
  return letter;
}
