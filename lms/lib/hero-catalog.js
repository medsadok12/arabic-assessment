/* كتالوج «استوديو الأبطال» — المصدر الوحيد للقطع والأسعار والألوان.
   تستورده الواجهة (للعرض والتجربة) والخادم (لحساب السعر والتحقق من الملكية)،
   فلا يُوثق أبداً بسعر يرسله المتصفح. */

export const SKIN    = ['#F9D9BF', '#EFC09A', '#D99E70', '#B97A4C', '#8D5634', '#5F3A22'];
export const HAIR_C  = ['#2A1A12', '#5B3621', '#8E5B2C', '#D8A441', '#B4452F', '#22304F'];
export const HIJAB_C = ['#7C5CD9', '#E8578C', '#2ABB7A', '#3B9BEF', '#F2EFEA', '#1A2B4A'];
export const CLOTH_C = ['#7C5CD9', '#E8B84B', '#2ABB7A', '#3B9BEF', '#E8578C', '#1A2B4A', '#F2F2F2', '#F07D3A'];
export const PANTS_C = ['#1A2B4A', '#3B5B8C', '#6B4E3D', '#2E3138', '#8FA3BF', '#E8578C'];
export const SHOE_C  = ['#2ABB7A', '#E8578C', '#F7F7F7', '#1A2B4A', '#E8B84B', '#3B9BEF'];

/* مفتاح اللون في المظهر ← لوحته (لون «skin» يتبع الشخصية: بشرة أو فرو أو معدن — انظر CHARACTERS) */
export const COLOR_KEYS = { hairC: HAIR_C, hijabC: HIJAB_C, topC: CLOTH_C, pantsC: PANTS_C, shoeC: SHOE_C };

/* الشخصيات: كل شخصية تلبس كل القطع نفسها، ولها ألوانها وتحيتها.
   colors[0] لونها المميز (عدا الطفل: لون بشرته الافتراضي firstColor) */
export const CHARACTERS = [
  { id: 'kid',   name: 'الْبَطَلُ الصَّغِيرُ', icon: '🧒', price: 0,    colorLabel: 'لَوْنُ الْبَشَرَةِ', colors: SKIN, firstColor: 1,
    special: { name: 'قَفْزَةُ الْبَطَلِ', icon: '🌟' }, hello: 'مَرْحَبًا! أَنَا بَطَلُكَ الصَّغِيرُ ⭐', lines: ['أَنَا بَطَلُ الْحُرُوفِ! ⭐', 'هَيَّا نَتَعَلَّمْ مَعًا! 📚'] },
  { id: 'cat',   name: 'مِشْمِشٌ الْقِطُّ',    icon: '🐱', price: 0,    colorLabel: 'لَوْنُ الْفَرْوِ', colors: ['#F2A65A', '#A7AFBC', '#F6E7D2', '#4A4A55', '#FFF8F0'],
    special: { name: 'شَقْلَبَةُ الْقِطِّ', icon: '🤸' }, hello: 'مِيَاوْ! أَنَا مِشْمِشٌ 🐱', lines: ['مِيَاوْ! هَيَّا نَقْرَأْ قِصَّةً 📖', 'أُحِبُّ الْحُرُوفَ كَثِيرًا! 🐾'] },
  { id: 'bunny', name: 'أَرْنُوبٌ',            icon: '🐰', price: 600,  colorLabel: 'لَوْنُ الْفَرْوِ', colors: ['#FFF8F2', '#D8B48C', '#BCC1CB', '#F6C9D8', '#8A5A3C'],
    special: { name: 'قَفَزَاتُ أَرْنُوبٍ', icon: '🐇' }, hello: 'أَهْلًا! أَنَا أَرْنُوبٌ 🥕', lines: ['أَقْفِزُ عَالِيًا مِثْلَ دَرَجَاتِكَ! 🥕', 'هَيَّا نَتَعَلَّمْ كَلِمَةً جَدِيدَةً! 🐰'] },
  { id: 'panda', name: 'بَانْدَا',             icon: '🐼', price: 800,  colorLabel: 'لَوْنُ الْفَرْوِ', colors: ['#FFFFFF'],
    special: { name: 'دَحْرَجَةُ الْبَانْدَا', icon: '🌀' }, hello: 'مَرْحَبًا! أَنَا بَانْدَا 🎋', lines: ['أُحِبُّ الْخَيْزُرَانَ وَالْكُتُبَ! 🎋', 'الْقِرَاءَةُ تَجْعَلُنِي سَعِيدًا! 🐼'] },
  { id: 'fox',   name: 'ثَعْلَبٌ ذَكِيٌّ',     icon: '🦊', price: 800,  colorLabel: 'لَوْنُ الْفَرْوِ', colors: ['#EE7F2D', '#F4F6FA', '#8C95A3'],
    special: { name: 'دَوَّامَةُ الثَّعْلَبِ', icon: '🌪️' }, hello: 'أَهْلًا! أَنَا الثَّعْلَبُ الذَّكِيُّ 🦊', lines: ['عِنْدِي فِكْرَةٌ ذَكِيَّةٌ! 💡', 'هَلْ تَعْرِفُ هَذِهِ الْكَلِمَةَ؟ 🦊'] },
  { id: 'lion',  name: 'لَيْثٌ الشِّبْلُ',     icon: '🦁', price: 1000, colorLabel: 'لَوْنُ الْفَرْوِ', colors: ['#E7B04A', '#F1D49A', '#F4EDE2'],
    special: { name: 'زَئِيرُ الشِّبْلِ', icon: '🦁' }, hello: 'زَئِيرٌ! أَنَا لَيْثٌ الشُّجَاعُ 🦁', lines: ['زَئِيرٌ! أَنَا شِبْلٌ شُجَاعٌ 🦁', 'الشُّجَاعُ يُحَاوِلُ دَائِمًا! 💪'] },
  { id: 'dino',  name: 'دِينُو',               icon: '🦖', price: 1200, colorLabel: 'لَوْنُ الْجِلْدِ', colors: ['#5CC46A', '#4FA3E8', '#9B7BE0', '#F08DB8', '#F5A040'],
    special: { name: 'خُطْوَةُ الْعِمْلَاقِ', icon: '👣' }, hello: 'مَرْحَبًا! أَنَا دِينُو الدَّيْنَاصُورُ 🦖', lines: ['خُطْوَةٌ كَبِيرَةٌ نَحْوَ الْقِرَاءَةِ! 🦖', 'أَنَا دَيْنَاصُورٌ يُحِبُّ الْكُتُبَ! 📚'] },
  { id: 'robot', name: 'رُوبُو',               icon: '🤖', price: 1500, colorLabel: 'لَوْنُ الْمَعْدِنِ', colors: ['#C9D1DC', '#E8B84B', '#6E98F0', '#F2A0C0', '#5A6578'],
    special: { name: 'صَارُوخُ رُوبُو', icon: '🚀' }, hello: 'بِيبْ بُوبْ! أَنَا رُوبُو 🤖', lines: ['بِيبْ بُوبْ! جَاهِزٌ لِلتَّعَلُّمِ 🤖', 'أَشْحَنُ طَاقَتِي بِالْقِرَاءَةِ! ⚡'] },
];
export const charOf = (look) => CHARACTERS.find(c => c.id === look?.char) ?? CHARACTERS[0];

export const HAIR = [
  { id: 'short', name: 'قَصِيرٌ',      icon: '💇‍♂️' },
  { id: 'curly', name: 'مُجَعَّدٌ',     icon: '🌀' },
  { id: 'long',  name: 'طَوِيلٌ',       icon: '💁‍♀️' },
  { id: 'pony',  name: 'ذَيْلُ حِصَانٍ', icon: '🎀' },
  { id: 'hijab', name: 'حِجَابٌ',       icon: '🧕' },
];

export const ITEMS = {
  char: CHARACTERS,
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
    { id: 'party',      name: 'قُبَّعَةُ الِاحْتِفَالِ', icon: '🥳', price: 0, weekly: true },
    { id: 'laurel',     name: 'إِكْلِيلُ الْمُثَابِرِ',  icon: '🌿', price: 0, earn: 'loyal' },
  ],
  eyes: [
    { id: 'none',  name: 'بِلَا نَظَّارَةٍ',     icon: '👀', price: 0 },
    { id: 'round', name: 'نَظَّارَةُ فَهِيمٍ',   icon: '👓', price: 200 },
    { id: 'star',  name: 'نَظَّارَةُ النُّجُومِ', icon: '🤩', price: 350 },
    { id: 'heart', name: 'نَظَّارَةُ الْقُلُوبِ', icon: '😍', price: 0, weekly: true },
  ],
  hand: [
    { id: 'none',    name: 'يَدَانِ حُرَّتَانِ',         icon: '🙌', price: 0 },
    { id: 'book',    name: 'كِتَابُ الْحِكَايَاتِ',     icon: '📕', price: 300 },
    { id: 'mic',     name: 'مِيكْرُوفُونُ الْإِلْقَاءِ', icon: '🎤', price: 350 },
    { id: 'pen',     name: 'قَلَمُ النُّورِ',           icon: '🖊️', price: 400 },
    { id: 'lantern', name: 'فَانُوسُ رَمَضَانَ',        icon: '🏮', price: 450 },
    { id: 'shield',  name: 'دِرْعُ الْحُرُوفِ',         icon: '🛡️', price: 0, earn: 'lettersAll' },
    { id: 'balloon', name: 'بَالُونُ الْفَرَحِ',        icon: '🎈', price: 0, weekly: true },
  ],
  back: [
    { id: 'none',  name: 'بِلَا شَيْءٍ',         icon: '🙂', price: 0 },
    { id: 'bag',   name: 'حَقِيبَةُ الْمَدْرَسَةِ', icon: '🎒', price: 300 },
    { id: 'cape',  name: 'عَبَاءَةُ الْبَطَلِ',    icon: '🦸', price: 500 },
    { id: 'wings', name: 'جَنَاحَا الْخَيَالِ',    icon: '🕊️', price: 900 },
    { id: 'jetpack', name: 'حَقِيبَةُ الصَّوَارِيخِ', icon: '🚀', price: 0, weekly: true },
  ],
  pet: [
    { id: 'none',   name: 'وَحْدِي',           icon: '🙂', price: 0 },
    { id: 'egg',    name: 'بَيْضَةٌ غَامِضَةٌ',   icon: '🥚', price: 0 },
    { id: 'dragon', name: 'تِنِّينٌ صَغِيرٌ',     icon: '🐉', price: 0, hatch: true },
    { id: 'faheem', name: 'فَهِيمٌ الصَّغِيرُ', icon: '🐘', price: 1200 },
  ],
  mount: [
    { id: 'none',   name: 'عَلَى قَدَمَيَّ',    icon: '👟', price: 0 },
    { id: 'cloud',  name: 'سَحَابَةٌ نَاعِمَةٌ', icon: '☁️', price: 500 },
    { id: 'board',  name: 'لَوْحٌ طَائِرٌ',      icon: '🛹', price: 700 },
    { id: 'carpet', name: 'بِسَاطُ الرِّيحِ',    icon: '🧞', price: 900 },
  ],
  aura: [
    { id: 'none',        name: 'بِلَا هَالَةٍ',        icon: '🙂', price: 0 },
    { id: 'stars',       name: 'نُجُومٌ تَدُورُ',      icon: '✨', price: 400 },
    { id: 'butterflies', name: 'فَرَاشَاتُ الرَّبِيعِ', icon: '🦋', price: 500 },
    { id: 'letters',     name: 'هَالَةُ الْحُرُوفِ',   icon: '🔤', price: 800 },
    { id: 'leaves',      name: 'أَوْرَاقُ الْخَرِيفِ',  icon: '🍂', price: 300, season: 'autumn' },
    { id: 'snow',        name: 'ثَلْجُ الشِّتَاءِ',     icon: '❄️', price: 300, season: 'winter' },
    { id: 'ramadan',     name: 'هِلَالٌ وَفَوَانِيسُ',   icon: '🌙', price: 300, season: 'ramadan' },
    { id: 'fireworks',   name: 'أَلْعَابُ الْعِيدِ',     icon: '🎆', price: 300, season: 'eid' },
  ],
  world: [
    { id: 'studio',  name: 'الِاسْتُودْيُو',              icon: '🎪', price: 0 },
    { id: 'oasis',   name: 'وَاحَةُ الْغُرُوبِ',          icon: '🏜️', price: 600 },
    { id: 'space',   name: 'رِحْلَةُ الْفَضَاءِ',         icon: '🚀', price: 700 },
    { id: 'library', name: 'الْمَكْتَبَةُ السِّحْرِيَّةُ', icon: '📚', price: 800 },
  ],
};

/* حركات يؤديها كل بطل (والحركة الخاصة لكل شخصية في CHARACTERS) */
export const EMOTES = [
  { id: 'wave',  name: 'تَحِيَّةٌ',        icon: '👋' },
  { id: 'clap',  name: 'تَصْفِيقٌ',        icon: '👏' },
  { id: 'star',  name: 'قَفْزَةُ النَّجْمَةِ', icon: '⭐' },
  { id: 'dabke', name: 'الدَّبْكَةُ',       icon: '💃' },
];

/* مستويات النقاط في المنصة — منصة البطل تتطور معها */
export const LEVELS = [
  { name: 'مُبْتَدِئٌ', icon: '🌱' }, { name: 'مُسْتَكْشِفٌ', icon: '⚡' }, { name: 'بَطَلٌ', icon: '⭐' },
  { name: 'مُحْتَرِفٌ', icon: '💎' }, { name: 'أُسْطُورَةٌ', icon: '🚀' },
];

export const SLOTS = Object.keys(ITEMS);

export const SLOT_LABEL = {
  char: 'الشَّخْصِيَّةُ', top: 'الْقَمِيصُ', bottom: 'السِّرْوَالُ', head: 'عَلَى الرَّأْسِ', eyes: 'النَّظَّارَةُ',
  hand: 'فِي الْيَدِ', back: 'عَلَى الظَّهْرِ', pet: 'رَفِيقُ الْمُغَامَرَةِ',
  mount: 'مَرْكَبَتِي', aura: 'هَالَتِي', world: 'عَالَمِي',
};

/* البطل الأول لكل طالب: كل ما فيه مجاني */
export const DEFAULT_LOOK = Object.freeze({
  char: 'kid', skin: 1, hair: 'short', hairC: 0, hijabC: 0,
  top: 'tee', topC: 0, bottom: 'pants', pantsC: 0, shoeC: 0,
  head: 'none', eyes: 'none', hand: 'none', back: 'none', pet: 'none',
  mount: 'none', aura: 'none', world: 'studio',
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
  // لون الجسم من لوحة الشخصية نفسها (المظهر القديم بلا شخصية ← الطفل)
  const c = charOf(look);
  look.skin = Number.isInteger(src.skin) && src.skin >= 0 && src.skin < c.colors.length ? src.skin : (c.firstColor ?? 0);
  return look;
}

export function looksEqual(a, b) {
  return Object.keys(DEFAULT_LOOK).every(k => a?.[k] === b?.[k]);
}

export function isOwned(slot, id, owned) {
  const it = findItem(slot, id);
  if (!it) return false;
  // ما يفقس من البيضة أو يُكسب بإنجاز أو بتحدّي الأسبوع لا يُشترى: يُلبس فقط إن كان في owned
  return (it.price === 0 && !isSpecial(it)) || owned.has(itemKey(slot, id));
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

/* قطعة لا تُشترى بالنجوم: تفقس، أو تُكسب بإنجاز، أو جائزة تحدّي الأسبوع */
export const isSpecial = (it) => !!(it?.hatch || it?.earn || it?.weekly);

/* ── مصادر التقدّم: أسباب النقاط في points_log التي تعني «تعلّماً» ── */
export const WORD_PREFIXES = ['word_wheel', 'word_wheel_win', 'word_scramble', 'word_smash', 'word_image_match'];
export const LEARN_PREFIXES = [
  'letter_catcher', 'vowel_balloon', ...WORD_PREFIXES, 'huroof_letter', 'huroof_all_complete', 'fc', 'flashcard_remembered',
  'challenge_win', 'challenge_draw', 'challenge_loss', 'story', 'scene_story', 'homework_done', 'daily_word', 'session_attend',
];

/* stats من الخادم: { p: { prefix: { n, sum, ws, es } }, letters: [فهارس الحروف المتقنة], earned } */
const P = (s, k) => s?.p?.[k] ?? { n: 0, sum: 0, ws: 0, es: 0 };
const sumOf = (s, list, f = 'sum') => list.reduce((a, k) => a + (P(s, k)[f] || 0), 0);

/* المستويات (مطابقة لـ PointsBadge): كل 1000 نجمة مكتسبة */
export const levelOf = (earned) => Math.max(0, Math.min(LEVELS.length - 1, Math.floor((earned || 0) / 1000)));

/* الإنجازات: تمنح ألقاباً، وبعضها يمنح قطعة لا تُشترى */
export const ACHIEVEMENTS = [
  { id: 'letters5',   title: 'صَدِيقُ الْحُرُوفِ',   icon: '🔤', how: 'تَعَلَّمْ ٥ حُرُوفٍ فِي «الْحُرُوفِ الْهِجَائِيَّةِ»', test: s => (s.letters?.length ?? 0) >= 5 },
  { id: 'lettersAll', title: 'فَارِسُ الضَّادِ',      icon: '🛡️', how: 'أَتْقِنِ الْحُرُوفَ الثَّمَانِيَةَ وَالْعِشْرِينَ — وَتَكْسِبُ دِرْعَ الْحُرُوفِ', test: s => (s.letters?.length ?? 0) >= 28 || P(s, 'huroof_all_complete').n > 0 },
  { id: 'catcher',    title: 'صَائِدُ الْحُرُوفِ',    icon: '🎯', how: 'اجْمَعْ ٢٠٠ نَجْمَةٍ فِي صَيَّادِ الْحُرُوفِ', test: s => P(s, 'letter_catcher').sum >= 200 },
  { id: 'words',      title: 'سَيِّدُ الْكَلِمَاتِ',  icon: '🎡', how: 'اجْمَعْ ٢٠٠ نَجْمَةٍ مِنْ أَلْعَابِ الْكَلِمَاتِ', test: s => sumOf(s, WORD_PREFIXES) >= 200 },
  { id: 'cards',      title: 'حَافِظُ الْبِطَاقَاتِ', icon: '🃏', how: 'رَاجِعْ ٢٠ بِطَاقَةً مِنْ بِطَاقَاتِ الْحِفْظِ', test: s => P(s, 'fc').n + P(s, 'flashcard_remembered').n >= 20 },
  { id: 'stories',    title: 'رَاوِي الْحِكَايَاتِ',  icon: '📖', how: 'اقْرَأْ أَوِ احْكِ ٣ حِكَايَاتٍ', test: s => P(s, 'story').n + P(s, 'scene_story').n >= 3 },
  { id: 'loyal',      title: 'النَّجْمُ الْمُثَابِرُ', icon: '🔥', how: 'ادْخُلِ الْمِنَصَّةَ ٧ أَيَّامٍ — وَتَكْسِبُ إِكْلِيلَ الْمُثَابِرِ', test: s => P(s, 'daily_login').n >= 7 },
  { id: 'legend',     title: 'أُسْطُورَةُ عَارِمٍ',   icon: '🚀', how: 'اجْمَعْ ٤٠٠٠ نَجْمَةٍ وَتَصِلْ إِلَى مُسْتَوَى أُسْطُورَةٍ', test: s => (s.earned ?? 0) >= 4000 },
];
export const earnedAchievements = (stats) => ACHIEVEMENTS.filter(a => { try { return a.test(stats ?? {}); } catch { return false; } }).map(a => a.id);
/* القطع المكتسبة بالإنجاز ← مفاتيحها (تُعامل كأنها مملوكة) */
export function earnedItemKeys(achIds) {
  const set = new Set(achIds);
  const keys = [];
  for (const slot of SLOTS) for (const it of ITEMS[slot]) if (it.earn && set.has(it.earn)) keys.push(itemKey(slot, it.id));
  return keys;
}

/* ── المواسم: قطع تُشترى في موسمها فقط، وتبقى لمن اشتراها. تواريخ رمضان والعيدين تقريبية وتُعدَّل هنا ── */
export const SEASONS = [
  { id: 'autumn',  name: 'مَوْسِمُ الْخَرِيفِ', icon: '🍂', yearly: [['09-22', '11-30']] },
  { id: 'winter',  name: 'مَوْسِمُ الشِّتَاءِ', icon: '❄️', yearly: [['12-01', '12-31'], ['01-01', '02-28']] },
  { id: 'ramadan', name: 'شَهْرُ رَمَضَانَ',    icon: '🌙', dates: [['2027-02-06', '2027-03-09'], ['2028-01-26', '2028-02-26'], ['2029-01-14', '2029-02-14']] },
  { id: 'eid',     name: 'أَيَّامُ الْعِيدِ',    icon: '🎉', dates: [['2027-03-09', '2027-03-16'], ['2027-05-15', '2027-05-21'], ['2028-02-25', '2028-03-03'], ['2028-05-03', '2028-05-09']] },
];
export function seasonActive(id, date = new Date()) {
  const s = SEASONS.find(x => x.id === id); if (!s) return false;
  const iso = date.toISOString().slice(0, 10), md = iso.slice(5);
  if (s.yearly?.some(([a, b]) => md >= a && md <= b)) return true;
  return !!s.dates?.some(([a, b]) => iso >= a && iso <= b);
}
export const activeSeasons = (date = new Date()) => SEASONS.filter(s => seasonActive(s.id, date)).map(s => s.id);
/* سبب منع الشراء الآن (قطعة موسمية خارج موسمها) أو null */
export function buyBlocked(key, date = new Date()) {
  const [slot, id] = String(key).split(':');
  const it = findItem(slot, id);
  if (it?.season && !seasonActive(it.season, date)) return 'season';
  return null;
}

/* ── تحدّي الأسبوع: يتبدّل كل أسبوع (الاثنين)، وجائزته قطعة تبقى لصاحبها، وتعود في دورة لاحقة لمن فاتته ── */
export const WEEKLY = [
  { id: 'catcher', icon: '🎯', text: 'اجْمَعْ ٥٠ نَجْمَةً فِي صَيَّادِ الْحُرُوفِ',            prefixes: ['letter_catcher'], goal: 50,  reward: 'head:party' },
  { id: 'words',   icon: '🎡', text: 'اجْمَعْ ٤٠ نَجْمَةً مِنْ أَلْعَابِ الْكَلِمَاتِ',          prefixes: WORD_PREFIXES,     goal: 40,  reward: 'eyes:heart' },
  { id: 'learn',   icon: '⭐', text: 'اجْمَعْ ١٠٠ نَجْمَةٍ مِنَ التَّعَلُّمِ',                   prefixes: LEARN_PREFIXES,    goal: 100, reward: 'hand:balloon' },
  { id: 'cards',   icon: '🃏', text: 'اجْمَعْ ١٥ نَجْمَةً مِنَ الْحُرُوفِ وَبِطَاقَاتِ الْحِفْظِ', prefixes: ['huroof_letter', 'fc'], goal: 15, reward: 'back:jetpack' },
];
/* بداية الأسبوع (الاثنين 00:00 بتوقيت UTC) ورقمه منذ 1970 */
export function weekStart(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}
export const weekIndex = (date = new Date()) => Math.floor(weekStart(date).getTime() / (7 * 864e5));
export const weeklyOf = (date = new Date()) => WEEKLY[((weekIndex(date) % WEEKLY.length) + WEEKLY.length) % WEEKLY.length];
export const weeklyProgress = (stats, w) => Math.min(w.goal, sumOf(stats, w.prefixes, 'ws'));

/* ── البيضة الغامضة: تفقس حين يجمع الطالب EGG_GOAL نجمة من التعلّم بعد وضعها في العش ── */
export const EGG_GOAL = 60;
export const eggProgress = (stats) => Math.min(EGG_GOAL, sumOf(stats, LEARN_PREFIXES, 'es'));

/* صورة البطل المصغّرة تُحفظ data URL صغيراً — نقبل webp/png فقط وبحجم محدود */
export const PREVIEW_MAX = 80_000;
export function isValidPreview(url) {
  return typeof url === 'string'
    && url.length <= PREVIEW_MAX
    && /^data:image\/(webp|png);base64,[A-Za-z0-9+/]+=*$/.test(url);
}
