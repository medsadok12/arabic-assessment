/**
 * Sequential + random code generation.
 * Format: {prefix}{seqLetters}-{random6}  e.g. TA-K8M3NP, TB-J2X5R7
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I/L)

function nextSuffix(suffix) {
  const chars = suffix.split('').map(c => c.charCodeAt(0) - 65);
  let carry = 1;
  for (let i = chars.length - 1; i >= 0 && carry; i--) {
    const val = chars[i] + carry;
    if (val >= 26) { chars[i] = 0; }
    else           { chars[i] = val; carry = 0; }
  }
  if (carry) chars.unshift(0);
  return chars.map(c => String.fromCharCode(65 + c)).join('');
}

function randomPart(len = 6) {
  let out = '';
  for (let i = 0; i < len; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
  return out;
}

/**
 * @param {string} prefix   - 'T' for teachers, 'S' for students/assessment
 * @param {Array}  existing - array of code strings or objects with .code
 * @returns {string}  e.g. 'TC-K8M3NP'
 */
export function nextSequentialCode(prefix, existing) {
  const codes = existing.map(c => (typeof c === 'string' ? c : c.code ?? '').toUpperCase());

  // Extract only the sequential letters part (before '-' if present)
  const suffixes = codes
    .filter(c => c.startsWith(prefix))
    .map(c => c.slice(prefix.length).split('-')[0])
    .filter(s => s.length > 0 && /^[A-Z]+$/.test(s));

  let seqSuffix = 'A';
  if (suffixes.length) {
    const maxSuffix = suffixes.reduce((max, s) =>
      s.length > max.length || (s.length === max.length && s > max) ? s : max
    );
    seqSuffix = nextSuffix(maxSuffix);
  }

  return `${prefix}${seqSuffix}-${randomPart(6)}`;
}
