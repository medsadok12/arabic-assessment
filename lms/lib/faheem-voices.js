/* ── أصوات Azure المرشّحة لفهيم ──
   بلاغ الأستاذ محمد (2026-10-23): «الصوت يبدو كرجل كبير — أريد صوت طفل مرح يشبه صوت الفيل فهيم».
   صوت فهيم في مقطع الفيل (ElevenLabs) طبقته ≈305 هرتز (طفل/كرتون)، و«حامد» ≈130 هرتز (رجل).
   لا يوجد في Azure صوت طفل عربي جاهز، فالمرشّحون أصوات عربية تُرفع طبقتها (pitch) وتُسرَّع قليلاً.
   الأصوات الخليجية تقرأ الفصحى المشكولة سليمة؛ المصرية والمغاربية مستبعدة (تنطق الجيم والقاف بلهجتها). */

export const FAHEEM_VOICES = [
  { id: 'hamed',    name: 'ar-SA-HamedNeural',   pitch: '+8%',  rate: '-4%', label: 'حامد — الصوت الحالي',   note: 'صوت رجل بالغ (للمقارنة)' },
  { id: 'zariyah25', name: 'ar-SA-ZariyahNeural', pitch: '+25%', rate: '+0%', label: 'زرياب — مرحة',           note: 'صوت فتاة شابة مبتهجة' },
  { id: 'zariyah40', name: 'ar-SA-ZariyahNeural', pitch: '+40%', rate: '+4%', label: 'زرياب — طفولية',         note: 'الأقرب لطبقة صوت فهيم في مقطع الفيل' },
  { id: 'zariyah50', name: 'ar-SA-ZariyahNeural', pitch: '+50%', rate: '+6%', label: 'زرياب — كرتونية',        note: 'أعلى طبقة، مثل شخصيات الرسوم المتحركة' },
  { id: 'fatima40',  name: 'ar-AE-FatimaNeural',  pitch: '+40%', rate: '+4%', label: 'فاطمة — طفولية',         note: 'نبرة إماراتية ناعمة' },
  { id: 'amal40',    name: 'ar-QA-AmalNeural',    pitch: '+40%', rate: '+4%', label: 'أمل — طفولية',           note: 'نبرة قطرية واضحة' },
  { id: 'hamed50',   name: 'ar-SA-HamedNeural',   pitch: '+50%', rate: '+6%', label: 'حامد — صبيّ',            note: 'صوت ولد صغير (رجل بطبقة مرفوعة)' },
  { id: 'hamdan50',  name: 'ar-AE-HamdanNeural',  pitch: '+50%', rate: '+6%', label: 'حمدان — صبيّ',           note: 'ولد صغير بنبرة إماراتية' },
];

// الصوت المعتمد لفهيم — يتغير هنا بعد اختيار الأستاذ من صفحة العيّنات
export const FAHEEM_VOICE_ID = 'hamed';

export const voiceById = (id) => FAHEEM_VOICES.find(v => v.id === id) || null;
export const currentVoice = () => voiceById(FAHEEM_VOICE_ID);

// جملة العيّنة: تحية فهيم المعتادة بحركاتها كاملة
export const VOICE_SAMPLE = 'أَهْلًا يَا بَطَلُ! أَنَا فَهِيمٌ، صَدِيقُكَ الْفِيلُ الذَّكِيُّ. هَيَّا نَتَعَلَّمْ مَعًا كَلِمَاتٍ جَدِيدَةً وَمُمْتِعَةً!';
