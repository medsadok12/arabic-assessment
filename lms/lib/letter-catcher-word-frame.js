import { lcCategoryKey } from './letter-catcher-categories';
import { letterCatcherTiles } from './letter-catcher-tiles';
import { ZWJ } from './letter-forms';

const MARKS = /\p{M}/gu;
// Following means the next logical Arabic letter, to the left on screen.
// Unknown characters, punctuation and spaces are deliberate joining boundaries.
const JOINS_FOLLOWING = new Set('بتثجحخسشصضطظعغفقكلمنهيئ');
const RECEIVES_PREVIOUS = new Set([...JOINS_FOLLOWING, ...'اأإآٱدذرزوةىؤ']);

const baseLetter = letter => String(letter ?? '').normalize('NFC').replace(MARKS, '');
const connects = (previous, next) => JOINS_FOLLOWING.has(baseLetter(previous))
  && RECEIVES_PREVIOUS.has(baseLetter(next));

// Scope this experiment to each actual word, including in mixed/all-topic rounds.
export function usesAnimalWordFrame(wordRow) {
  return lcCategoryKey(wordRow?.category || wordRow?.topic) === 'animals';
}

// Display only: Noto Naskh Arabic includes its own open-dammatan glyph (two
// separate dammas). U+064C and U+08F1 share combining class 28 and native GPOS
// mark/mkmk attachment, preserving the letter, shadda and font underneath.
// Stored words, pronunciation and answer checks keep their original U+064C.
export function withSeparatedDammatan(text = '') {
  return text.replace(/\u064c/g, '\u08f1');
}

// Shape each surviving text run naturally. A zero-width joiner preserves only
// connections that the hidden letter originally made; no visible tatweel is added.
// The shared tiles helper owns grapheme grouping and the existing madd convention.
export function letterCatcherWordFrame(wordRow = {}) {
  const row = wordRow || {};
  const tiles = letterCatcherTiles(row);
  const { displayWord, fullWord, displayLetters } = tiles;
  const hasMissing = Boolean(baseLetter(row.missing_letter).trim())
    && tiles.missingIndex >= 0
    && tiles.missingIndex < displayLetters.length;

  if (!hasMissing) {
    return {
      before: displayWord, after: '', text: displayWord, displayWord, fullWord,
      missingIndex: -1, hasMissing: false, joinsBefore: false, joinsAfter: false,
    };
  }

  const missingIndex = tiles.missingIndex;
  const missing = displayLetters[missingIndex];
  const joinsBefore = connects(displayLetters[missingIndex - 1], missing);
  const joinsAfter = connects(missing, displayLetters[missingIndex + 1]);

  return {
    before: displayLetters.slice(0, missingIndex).join('') + (joinsBefore ? ZWJ : ''),
    after: (joinsAfter ? ZWJ : '') + displayLetters.slice(missingIndex + 1).join(''),
    text: displayWord, displayWord, fullWord, missingIndex, hasMissing: true,
    joinsBefore, joinsAfter,
  };
}
