import { CURRENCIES } from '../config.js';

const pad = n => String(n).padStart(2, '0');

export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isoToUTC(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function daysBetween(fromISO, toISO) {
  return Math.round((isoToUTC(toISO) - isoToUTC(fromISO)) / 86_400_000);
}

const DAY_FORMS  = { one: 'يوم واحد', twoNom: 'يومان', twoGen: 'يومين', few: 'أيام', many: 'يوماً', single: 'يوم' };
const ITEM_FORMS = { one: 'بند واحد', twoNom: 'بندان', twoGen: 'بندين', few: 'بنود', many: 'بنداً', single: 'بند' };

// تمييز العدد بالعربية: يوم واحد، يومان/يومين، 3–10 أيام، 11–99 يوماً، 100 يوم...
function countPhrase(n, forms, grammaticalCase) {
  if (n === 1) return forms.one;
  if (n === 2) return grammaticalCase === 'nom' ? forms.twoNom : forms.twoGen;
  const rest = n % 100;
  if (n === 0 || (n >= 100 && rest <= 2)) return `${n} ${forms.single}`;
  if (rest >= 3 && rest <= 10) return `${n} ${forms.few}`;
  return `${n} ${forms.many}`;
}

export const daysPhrase  = (n, grammaticalCase = 'gen') => countPhrase(n, DAY_FORMS, grammaticalCase);
export const itemsPhrase = (n, grammaticalCase = 'gen') => countPhrase(n, ITEM_FORMS, grammaticalCase);

export function dueHint(item, today) {
  if (item.status === 'bought') return null;
  const diff = daysBetween(today, item.item_date);
  if (diff < 0) return { tone: 'late', text: `متأخر منذ ${daysPhrase(-diff)}` };
  if (diff === 0) return { tone: 'today', text: 'اليوم' };
  if (diff === 1) return { tone: 'near', text: 'غداً' };
  if (diff <= 14) return { tone: 'near', text: `بعد ${daysPhrase(diff)}` };
  return null;
}

export function weddingCountdown(weddingDate, today) {
  if (!weddingDate) return null;
  const diff = daysBetween(today, weddingDate);
  if (diff > 0) return `${daysPhrase(diff, 'nom')} على الزفاف`;
  if (diff === 0) return 'اليوم يوم الزفاف! مبارك 🎉';
  return 'بالرفاء والبنين 🤍';
}

// يقبل الأرقام العربية والفواصل: «١٢٬٥٠٠» أو «12,500» أو «12500.5»
export function parseAmount(input) {
  const text = String(input ?? '')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/[,٬\s]/g, '');
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
}

export function createFormatters(currencyCode) {
  const currency = CURRENCIES[currencyCode] ?? { symbol: currencyCode, decimals: 2, locale: 'ar' };
  const locale = `${currency.locale}-u-ca-gregory-nu-latn`;
  const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: currency.decimals });
  const fullDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shortDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const monthYear = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return {
    symbol: currency.symbol,
    money: amount => `${number.format(amount)} ${currency.symbol}`,
    date: (iso, today = todayISO()) =>
      (iso.slice(0, 4) === today.slice(0, 4) ? shortDate : fullDate).format(isoToUTC(iso)),
    month: ym => monthYear.format(isoToUTC(`${ym}-01`)),
  };
}
