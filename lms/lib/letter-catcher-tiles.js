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

// Mohamed's reading convention: the plain madd letter already indicates the long
// vowel, so omit only its matching short vowel on the preceding letter. Keep the
// fully vocalized source for speech, editing and answer verification.
export function letterCatcherDisplayWord(text = '') {
  const letters = splitVocalizedLetters(text);
  const shortVowel = { 'ا': '\u064e', 'ى': '\u064e', 'و': '\u064f', 'ي': '\u0650' };
  return letters.map((letter, index) => {
    const next = letters[index + 1];
    const vowel = shortVowel[next];
    // A marked waw/ya is not a plain madd: preserve بَيْتٌ، ثَوْرٌ، قُوَّةٌ، نَبِيٌّ.
    return vowel ? letter.replace(vowel, '') : letter;
  }).join('');
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
  const displayWord = letterCatcherDisplayWord(fullWord);
  return {
    fullWord, letters, baseLetters, missingIndex, letterGroups,
    displayWord, displayLetters: splitVocalizedLetters(displayWord),
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

const CHOICE_DUAL_JOINERS = new Set('بتثجحخسشصضطظعغفقكلمنهيئ');
const CHOICE_RIGHT_JOINERS = new Set([...CHOICE_DUAL_JOINERS, ...'اأإآٱدذرزوةىؤ']);

// Only answer choices get the two-stroke extension approved in the preview.
// A distractor such as د in a medial slot must not receive a detached left arm.
export function extendedChoiceLetter(letter, form) {
  const base = (letter || '').normalize('NFC').replace(MARKS, '');
  const before = (form === 'final' || form === 'medial') && CHOICE_RIGHT_JOINERS.has(base);
  const after = (form === 'initial' || form === 'medial') && CHOICE_DUAL_JOINERS.has(base);
  return `${before ? 'ــ' : ''}${base}${after ? 'ــ' : ''}`;
}
