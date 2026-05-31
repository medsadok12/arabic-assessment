/**
 * Sequential alphabetical code generation.
 * Produces: TA → TB → ... → TZ → TAA → TAB → ...
 */

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

/**
 * @param {string} prefix  - e.g. 'T' for teacher codes, 'S' for student/assessment
 * @param {Array}  existing - array of code strings OR objects with .code property
 * @returns {string} next code e.g. 'TC' if 'TB' was the last
 */
export function nextSequentialCode(prefix, existing) {
  const codes = existing.map(c => (typeof c === 'string' ? c : c.code ?? '').toUpperCase());

  const suffixes = codes
    .filter(c => c.startsWith(prefix))
    .map(c => c.slice(prefix.length))
    .filter(s => s.length > 0 && /^[A-Z]+$/.test(s));

  if (!suffixes.length) return prefix + 'A';

  const maxSuffix = suffixes.reduce((max, s) =>
    s.length > max.length || (s.length === max.length && s > max) ? s : max
  );

  return prefix + nextSuffix(maxSuffix);
}
