/* كتالوج «استوديو الأبطال» — المصدر الوحيد للقطع والأسعار والألوان.
   تستورده الواجهة (للعرض والتجربة) والخادم (لحساب السعر والتحقق من الملكية)،
   فلا يُوثق أبداً بسعر يرسله المتصفح. */

export const SKIN    = ['#F9D9BF', '#EFC09A', '#D99E70', '#B97A4C', '#8D5634', '#5F3A22'];
export const HAIR_C  = ['#2A1A12', '#5B3621', '#8E5B2C', '#D8A441', '#B4452F', '#22304F'];
export const HIJAB_C = ['#7C5CD9', '#E8578C', '#2ABB7A', '#3B9BEF', '#F2EFEA', '#1A2B4A'];
export const CLOTH_C = ['#7C5CD9', '#E8B84B', '#2ABB7A', '#3B9BEF', '#E8578C', '#1A2B4A', '#F2F2F2', '#F07D3A'];
export const PANTS_C = ['#1A2B4A', '#3B5B8C', '#6B4E3D', '#2E3138', '#8FA3BF', '#E8578C'];
export const SHOE_C  = ['#2ABB7A', '#E8578C', '#F7F7F7', '#1A2B4A', '#E8B84B', '#3B9BEF'];

/* مفتاح اللون في المظهر ← لوحته */
export const COLOR_KEYS = { skin: SKIN, hairC: HAIR_C, hijabC: HIJAB_C, topC: CLOTH_C, pantsC: PANTS_C, shoeC: SHOE_C };

export const HAIR = [
  { id: 'short', name: 'قَصِيرٌ',      icon: '💇‍♂️' },
  { id: 'curly', name: 'مُجَعَّدٌ',     icon: '🌀' },
  { id: 'long',  name: 'طَوِيلٌ',       icon: '💁‍♀️' },
  { id: 'pony',  name: 'ذَيْلُ حِصَانٍ', icon: '🎀' },
  { id: 'hijab', name: 'حِجَابٌ',       icon: '🧕' },
];

export const ITEMS = {
  top: [
    { id: 'tee',    name: 'قَمِيصُ عَارِمٍ',     icon: '👕', price: 0 },
    { id: 'hoodie', name: 'هُودِي دَافِئٌ',      icon: '🧥', price: 250 },
    { id: 'jersey', name: 'قَمِيصُ الْفَرِيقِ',  icon: '⚽', price: 350 },
    { id: 'thobe',  name: 'ثَوْبٌ أَبْيَضُ',      icon: '🥋', price: 300 },
    { id: 'space',  name: 'بَدْلَةُ الْفَضَاءِ', icon: '🧑‍🚀', price: 800 },
  ],
  bottom: [
    { id: 'pants',  name: 'بِنْطَالٌ', icon: '👖', price: 0 },
    { id: 'shorts', name: 'شُورْتٌ',   icon: '🩳', price: 0 },
  ],
  head: [
    { id: 'none',       name: 'بِلَا شَيْءٍ',           icon: '🙂', price: 0 },
    { id: 'cap',        name: 'قُبَّعَةٌ رِيَاضِيَّةٌ',  icon: '🧢', price: 200 },
    { id: 'headphones', name: 'سَمَّاعَاتٌ مُلَوَّنَةٌ', icon: '🎧', price: 300 },
    { id: 'shemagh',    name: 'شِمَاغٌ وَعِقَالٌ',      icon: '👳', price: 400 },
    { id: 'story',      name: 'قُبَّعَةُ الْحَكَوَاتِيِّ', icon: '🎩', price: 600 },
    { id: 'astro',      name: 'خُوذَةُ الْفَضَاءِ',     icon: '🪐', price: 900 },
    { id: 'crown',      name: 'تَاجُ الْأَبْطَالِ',     icon: '👑', price: 1000 },
  ],
  eyes: [
    { id: 'none',  name: 'بِلَا نَظَّارَةٍ',     icon: '👀', price: 0 },
    { id: 'round', name: 'نَظَّارَةُ فَهِيمٍ',   icon: '👓', price: 200 },
    { id: 'star',  name: 'نَظَّارَةُ النُّجُومِ', icon: '🤩', price: 350 },
  ],
  hand: [
    { id: 'none',    name: 'يَدَانِ حُرَّتَانِ',         icon: '🙌', price: 0 },
    { id: 'book',    name: 'كِتَابُ الْحِكَايَاتِ',     icon: '📕', price: 300 },
    { id: 'mic',     name: 'مِيكْرُوفُونُ الْإِلْقَاءِ', icon: '🎤', price: 350 },
    { id: 'pen',     name: 'قَلَمُ النُّورِ',           icon: '🖊️', price: 400 },
    { id: 'lantern', name: 'فَانُوسُ رَمَضَانَ',        icon: '🏮', price: 450 },
    { id: 'shield',  name: 'دِرْعُ الْحُرُوفِ',         icon: '🛡️', price: 600 },
  ],
  back: [
    { id: 'none',  name: 'بِلَا شَيْءٍ',         icon: '🙂', price: 0 },
    { id: 'bag',   name: 'حَقِيبَةُ الْمَدْرَسَةِ', icon: '🎒', price: 300 },
    { id: 'cape',  name: 'عَبَاءَةُ الْبَطَلِ',    icon: '🦸', price: 500 },
    { id: 'wings', name: 'جَنَاحَا الْخَيَالِ',    icon: '🕊️', price: 900 },
  ],
  pet: [
    { id: 'none',   name: 'وَحْدِي',           icon: '🙂', price: 0 },
    { id: 'faheem', name: 'فَهِيمٌ الصَّغِيرُ', icon: '🐘', price: 1200 },
  ],
};

export const SLOTS = Object.keys(ITEMS);

export const SLOT_LABEL = {
  top: 'الْقَمِيصُ', bottom: 'السِّرْوَالُ', head: 'عَلَى الرَّأْسِ', eyes: 'النَّظَّارَةُ',
  hand: 'فِي الْيَدِ', back: 'عَلَى الظَّهْرِ', pet: 'رَفِيقُ الْمُغَامَرَةِ',
};

/* البطل الأول لكل طالب: كل ما فيه مجاني */
export const DEFAULT_LOOK = Object.freeze({
  skin: 1, hair: 'short', hairC: 0, hijabC: 0,
  top: 'tee', topC: 0, bottom: 'pants', pantsC: 0, shoeC: 0,
  head: 'none', eyes: 'none', hand: 'none', back: 'none', pet: 'none',
});

/* حدّ القطع في عملية شراء واحدة — أكثر من عدد الخانات بقليل */
export const MAX_BUY = SLOTS.length;

export const itemKey = (slot, id) => `${slot}:${id}`;

export function findItem(slot, id) {
  return ITEMS[slot]?.find(i => i.id === id) ?? null;
}

/* سعر قطعة من مفتاحها «slot:id» — undefined إن لم تكن في الكتالوج */
export function priceOf(key) {
  if (typeof key !== 'string') return undefined;
  const [slot, id, extra] = key.split(':');
  if (extra !== undefined) return undefined;
  return findItem(slot, id)?.price;
}

/* أي مدخل (من قاعدة البيانات أو من المتصفح) ← مظهر صالح تماماً.
   ما لا نعرفه يُستبدل بالقيمة الافتراضية، فلا تصل قيمة غريبة إلى الرسم أو الحفظ. */
export function normalizeLook(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const look = { ...DEFAULT_LOOK };
  for (const [key, list] of Object.entries(COLOR_KEYS)) {
    const v = src[key];
    if (Number.isInteger(v) && v >= 0 && v < list.length) look[key] = v;
  }
  if (HAIR.some(h => h.id === src.hair)) look.hair = src.hair;
  for (const slot of SLOTS) if (findItem(slot, src[slot])) look[slot] = src[slot];
  return look;
}

export function looksEqual(a, b) {
  return Object.keys(DEFAULT_LOOK).every(k => a?.[k] === b?.[k]);
}

export function isOwned(slot, id, owned) {
  const it = findItem(slot, id);
  if (!it) return false;
  return it.price === 0 || owned.has(itemKey(slot, id));
}

/* القطع التي يلبسها البطل ولم تُشترَ بعد */
export function unpaidItems(look, owned) {
  const set = owned instanceof Set ? owned : new Set(owned ?? []);
  return SLOTS
    .map(slot => ({ slot, item: findItem(slot, look[slot]) }))
    .filter(x => x.item && !isOwned(x.slot, x.item.id, set))
    .map(x => ({ ...x, key: itemKey(x.slot, x.item.id) }));
}

/* اسم قطعة للعرض في لوحة الإدارة — null إن لم تكن من الاستوديو */
export function itemLabel(key) {
  if (typeof key !== 'string') return null;
  const [slot, id] = key.split(':');
  const it = findItem(slot, id);
  return it ? `${it.name} ${it.icon}` : null;
}

/* قائمة مفاتيح الشراء من المتصفح ← مفاتيح مدفوعة صالحة بلا تكرار، أو null إن كان فيها ما لا نعرفه */
export function parseBuyList(list) {
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_BUY) return null;
  const keys = [...new Set(list)];
  for (const k of keys) {
    const p = priceOf(k);
    if (p === undefined || p === 0) return null;
  }
  return keys;
}

/* صورة البطل المصغّرة تُحفظ data URL صغيراً — نقبل webp/png فقط وبحجم محدود */
export const PREVIEW_MAX = 80_000;
export function isValidPreview(url) {
  return typeof url === 'string'
    && url.length <= PREVIEW_MAX
    && /^data:image\/(webp|png);base64,[A-Za-z0-9+/]+=*$/.test(url);
}
