// رمز الدفتر: 16 حرفاً من أبجدية بلا أحرف ملتبسة (بلا l و o و 0 و 1) ≈ 80 بت
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
export const KEY_LENGTH = 16;

export function generateKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}

export function normalizeKey(input) {
  return String(input ?? '')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function isValidKey(key) {
  return key.length === KEY_LENGTH && [...key].every(ch => ALPHABET.includes(ch));
}

export function formatKey(key) {
  return (key.match(/.{1,4}/g) ?? []).join('-');
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export function inviteLink(key, location = window.location) {
  return `${location.origin}${location.pathname}#join=${key}`;
}

export function readInvite(hash) {
  const match = /(?:^#|&)join=([^&]+)/.exec(hash ?? '');
  if (!match) return null;
  const key = normalizeKey(decodeURIComponent(match[1]));
  return isValidKey(key) ? key : null;
}

export function newId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
