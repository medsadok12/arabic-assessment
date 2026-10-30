// المفتاح المنشور (publishable) مصمَّم ليكون في المتصفح: الحماية الفعلية
// في سياسات RLS التي لا تكشف إلا بيانات الدفتر صاحب الرمز السري.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://uqspozzkzyytwwidojxv.supabase.co';
export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_eKPvEGaiFdNefgrmnx3S6A_7HGmhw3h';

export const DEFAULT_TITLE = 'تحضيرات زواجنا';

export const DEFAULT_CATEGORIES = [
  { name: 'تجهيزات المنزل', icon: '🏠' },
  { name: 'القاعة',         icon: '🏛️' },
  { name: 'الملابس',        icon: '👗' },
  { name: 'الذهب',          icon: '💍' },
  { name: 'أخرى',           icon: '✨' },
];

const CATEGORY_COLORS = ['#B5677A', '#C49A4F', '#5E8C6A', '#7D5BA6', '#4F7FA6', '#C77D2E', '#9C6B5E', '#3F8F8A'];

export function categoryIcon(name) {
  return DEFAULT_CATEGORIES.find(c => c.name === name)?.icon ?? '🏷️';
}

export function categoryColor(name) {
  const index = DEFAULT_CATEGORIES.findIndex(c => c.name === name);
  if (index >= 0) return CATEGORY_COLORS[index];
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return CATEGORY_COLORS[DEFAULT_CATEGORIES.length + (hash % (CATEGORY_COLORS.length - DEFAULT_CATEGORIES.length))];
}

export const STATUSES = {
  soon:    { label: 'مطلوبة قريباً', icon: '⏳' },
  bought:  { label: 'تم شراؤها',     icon: '✅' },
  pending: { label: 'معلقة',         icon: '⏸️' },
};
export const STATUS_ORDER = ['soon', 'bought', 'pending'];

// locale يحدد أسماء الأشهر المحلية (جانفي في تونس، يناير في المشرق...)
export const CURRENCIES = {
  TND: { symbol: 'د.ت', name: 'دينار تونسي',    decimals: 3, locale: 'ar-TN' },
  DZD: { symbol: 'د.ج', name: 'دينار جزائري',   decimals: 2, locale: 'ar-DZ' },
  MAD: { symbol: 'د.م', name: 'درهم مغربي',     decimals: 2, locale: 'ar-MA' },
  LYD: { symbol: 'د.ل', name: 'دينار ليبي',     decimals: 3, locale: 'ar-LY' },
  EGP: { symbol: 'ج.م', name: 'جنيه مصري',      decimals: 2, locale: 'ar-EG' },
  SAR: { symbol: 'ر.س', name: 'ريال سعودي',     decimals: 2, locale: 'ar-SA' },
  AED: { symbol: 'د.إ', name: 'درهم إماراتي',   decimals: 2, locale: 'ar-AE' },
  KWD: { symbol: 'د.ك', name: 'دينار كويتي',    decimals: 3, locale: 'ar-KW' },
  QAR: { symbol: 'ر.ق', name: 'ريال قطري',      decimals: 2, locale: 'ar-QA' },
  BHD: { symbol: 'د.ب', name: 'دينار بحريني',   decimals: 3, locale: 'ar-BH' },
  OMR: { symbol: 'ر.ع', name: 'ريال عماني',     decimals: 3, locale: 'ar-OM' },
  JOD: { symbol: 'د.أ', name: 'دينار أردني',    decimals: 3, locale: 'ar-JO' },
  USD: { symbol: '$',   name: 'دولار أمريكي',   decimals: 2, locale: 'ar' },
  EUR: { symbol: '€',   name: 'يورو',           decimals: 2, locale: 'ar' },
};

const TIMEZONE_CURRENCY = {
  'Africa/Tunis': 'TND', 'Africa/Algiers': 'DZD', 'Africa/Casablanca': 'MAD', 'Africa/El_Aaiun': 'MAD',
  'Africa/Tripoli': 'LYD', 'Africa/Cairo': 'EGP', 'Asia/Riyadh': 'SAR', 'Asia/Dubai': 'AED',
  'Asia/Kuwait': 'KWD', 'Asia/Qatar': 'QAR', 'Asia/Bahrain': 'BHD', 'Asia/Muscat': 'OMR', 'Asia/Amman': 'JOD',
};

export function detectCurrency() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    if (TIMEZONE_CURRENCY[zone]) return TIMEZONE_CURRENCY[zone];
    if (zone.startsWith('Europe/')) return 'EUR';
  } catch { /* المتصفح لا يدعم المنطقة الزمنية */ }
  return 'USD';
}
