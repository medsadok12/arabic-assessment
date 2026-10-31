/** Display training counters with Western digits (0–9), including in Arabic UI. */
export function displayNumber(value) {
  return String(value ?? '').replace(/[\u0660-\u0669\u06f0-\u06f9]/g, digit =>
    String(digit.charCodeAt(0) - (digit.charCodeAt(0) <= 0x0669 ? 0x0660 : 0x06f0)));
}
