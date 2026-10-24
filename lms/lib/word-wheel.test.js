import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CATALOG, calcScore, canFormFrom, letterCounts, toPreviewWheel, pickPreviewWheels, WHEEL_PREVIEW_TARGET,
  parseLetters, resolveTheme, sanitizeThemeSpec, THEME_PRESETS, mixHex, normalizeWwSettings, sanitizeWheelSettings,
  effectiveSettings, starsFor, normalizeWheelWords, wordProblem, suggestWheelLetters, sanitizeWheelInput, wheelForPlay,
  defaultChallengeRows, cardFor, sanitizeWordInput, missingIndex, challengeHint, normalizeGlobalConfig, DEFAULT_WW_SETTINGS,
} from './word-wheel.js';

describe('word-wheel helpers', () => {
  it('يحسب النقاط بطول الكلمة ويضاعفها حين تستعمل كل الحروف', () => {
    expect(calcScore('رسم', ['ك', 'ت', 'م'])).toBe(1);
    expect(calcScore('مكتب', ['ك', 'ت', 'م'])).toBe(4); // 4 حروف (2) × 2: فيها ك ت م كلها
    expect(calcScore('مدرس', ['ك', 'ت', 'م'])).toBe(2);
  });
  it('يتحقق أن الكلمة تُكوَّن من حروف العجلة بعددها', () => {
    const c = letterCounts('كتبرسنلدم');
    expect(canFormFrom('مكتب', c)).toBe(true);
    expect(canFormFrom('ممم', c)).toBe(false);
  });
  it('يقرأ حروف العجلة من أي كتابة ويحذف التشكيل', () => {
    expect(parseLetters('ك ت ب')).toEqual(['ك', 'ت', 'ب']);
    expect(parseLetters('كَتَب، س')).toEqual(['ك', 'ت', 'ب', 'س']);
    expect(parseLetters(['م', 'ن'])).toEqual(['م', 'ن']);
    expect(parseLetters('abc 12')).toEqual([]);
  });
});

describe('المظهر', () => {
  it('الذهبي الافتراضي يطابق ألوان اللعبة الأصلية حرفياً', () => {
    const t = resolveTheme(null);
    expect(t.outer_light).toBe('#FDE68A');
    expect(t.outer_bg).toBe('#D97706');
    expect(t.outer_stroke).toBe('#F59E0B');
    expect(t.center_light).toBe('#FEF3C7');
    expect(t.center_text).toBe('#78350F');
  });
  it('لون مخصص يغلب الإعداد الجاهز وتُشتق ظلاله منه', () => {
    const t = resolveTheme({ preset: 'gold', colors: { outer_bg: '#22C55E' } });
    expect(t.outer_bg).toBe('#22C55E');
    expect(t.outer_light).toBe(mixHex('#22C55E', '#FFFFFF', 0.55));
    expect(t.center_light).toBe('#FEF3C7'); // ما لم يُغيَّر يبقى كما هو
  });
  it('يقبل Hex فقط ويتجاهل اللون المطابق للإعداد الجاهز', () => {
    expect(sanitizeThemeSpec({ preset: 'ocean', colors: { bg1: 'red', bg2: '#123', button_bg: THEME_PRESETS.ocean.button_bg, x: '#fff' } }))
      .toEqual({ preset: 'ocean', colors: { bg2: '#123' } });
    expect(sanitizeThemeSpec({ preset: 'nope' }).preset).toBe('gold');
    expect(sanitizeThemeSpec(null)).toBeNull();
  });
  it('يمزج اللونين بالنسبة', () => {
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mixHex('#FFF', '#000', 0)).toBe('#FFFFFF');
  });
});

describe('الإعدادات', () => {
  it('القيم الغريبة تعود للافتراضي، والأرقام تُحصر في حدودها', () => {
    const s = normalizeWwSettings({ hints_limit: 99, max_attempts: -3, complete_style: 'x', points_per_word: '7', star2_pct: 90, star3_pct: 40 });
    expect(s.hints_limit).toBe(5);
    expect(s.max_attempts).toBe(0);
    expect(s.complete_style).toBe('missing');
    expect(s.points_per_word).toBe(7);
    expect(s.star3_pct).toBe(90); // لا تقل الثلاث نجوم عن النجمتين
  });
  it('تخصيص العجلة: مفاتيح المساعدة فقط، والنقاط عامة', () => {
    expect(sanitizeWheelSettings({ hints_enabled: false, points_per_word: 50 })).toEqual({ hints_enabled: false });
    expect(sanitizeWheelSettings({})).toBeNull();
    const e = effectiveSettings({ hints_limit: 3, points_per_word: 20 }, { hints_limit: 0, points_per_word: 50 });
    expect(e.hints_limit).toBe(0);
    expect(e.points_per_word).toBe(20);
  });
  it('الإعدادات العامة تحمل مظهراً سليماً دائماً', () => {
    expect(normalizeGlobalConfig(null).theme).toEqual({ preset: 'gold', colors: {} });
    expect(normalizeGlobalConfig({ theme: { preset: 'forest' } }).theme.preset).toBe('forest');
  });
  it('النجوم بنسبة الكلمات المحلولة', () => {
    expect(starsFor(0, 4)).toBe(0);
    expect(starsFor(1, 4)).toBe(1);
    expect(starsFor(2, 4)).toBe(2);
    expect(starsFor(4, 4)).toBe(3);
    expect(starsFor(3, 4, { star2_pct: 50, star3_pct: 75 })).toBe(3);
  });
});

describe('كلمات العجلة', () => {
  it('يقبل الصيغتين القديمة والجديدة بلا تشكيل ولا تكرار', () => {
    expect(normalizeWheelWords(['سَمَك', { word: 'نمر', image: 'https://x/y.png' }, 'سمك', 'a b', ''])).toEqual([
      { word: 'سمك', image: null }, { word: 'نمر', image: 'https://x/y.png' },
    ]);
  });
  it('سبب واضح لكل كلمة لا تصلح', () => {
    const w = { mode: 'challenge', center: 'م', letters: ['ك', 'ت', 'ب'] };
    expect(wordProblem('مكتب', w)).toBeNull();
    expect(wordProblem('كتب', w)).toMatch(/الإلزامي/);
    expect(wordProblem('سمك', w)).toMatch(/ينقص العجلة: س/);
    expect(wordProblem('مك', w)).toMatch(/أقصر/);
    expect(wordProblem('كتب', { ...w, mode: 'picture' })).toBeNull(); // الأوسط ليس إلزامياً لغير التحدي
  });
  it('يقترح أقل حروف تكفي لكل الكلمات', () => {
    const s = suggestWheelLetters(['سمك', 'نمر', 'جمل', 'ممر']);
    expect(s.center).toBe('م');
    const all = letterCounts([s.center, ...s.letters].join(''));
    ['سمك', 'نمر', 'جمل', 'ممر'].forEach(w => expect(canFormFrom(w, all)).toBe(true));
    expect(all['م']).toBe(2); // «ممر» تحتاج ميمين
  });
  it('لا يقترح التاء المربوطة حرفاً أوسط', () => {
    const s = suggestWheelLetters(['قطة', 'بطة']);
    expect(s.center).toBe('ط');
    expect(s.letters.sort()).toEqual(['ب', 'ة', 'ق'].sort());
  });
});

describe('sanitizeWheelInput', () => {
  const ok = { name: ' حيوانات ', mode: 'picture', center_letter: 'م', outer_letters: 'س ك ن ر', valid_words: ['سمك', 'نمر'] };
  it('عجلة كاملة سليمة', () => {
    const { data, error } = sanitizeWheelInput({ ...ok, time_seconds: 999, level: 9, theme: { preset: 'ocean' }, settings: { max_attempts: 2 } });
    expect(error).toBeUndefined();
    expect(data).toMatchObject({ name: 'حيوانات', mode: 'picture', center_letter: 'م', outer_letters: ['س', 'ك', 'ن', 'ر'], valid_words: ['سمك', 'نمر'], time_seconds: 600, level: 4 });
    expect(data.theme).toEqual({ preset: 'ocean', colors: {} });
    expect(data.settings).toEqual({ max_attempts: 2 });
  });
  it('رسالة ودّية لكل نقص', () => {
    expect(sanitizeWheelInput({ ...ok, name: '' }).error).toMatch(/اسماً/);
    expect(sanitizeWheelInput({ ...ok, mode: 'x' }).error).toMatch(/نمط/);
    expect(sanitizeWheelInput({ ...ok, center_letter: 'مك' }).error).toMatch(/حرف واحد/);
    expect(sanitizeWheelInput({ ...ok, outer_letters: 'س' }).error).toMatch(/حرفين/);
    expect(sanitizeWheelInput({ ...ok, outer_letters: 'ابتثجحخدذرز' }).error).toMatch(/10/);
  });
  it('التعديل الجزئي يمسّ ما أُرسل فقط', () => {
    expect(sanitizeWheelInput({ is_active: false }, { partial: true })).toEqual({ data: { is_active: false } });
  });
});

describe('wheelForPlay', () => {
  it('عجلة قاعدة البيانات ← جاهزة للعب، والكلمات غير الصالحة تُستبعد', () => {
    const w = wheelForPlay({ id: 'a1', name: 'تجربة', mode: 'challenge', level: 2, sort_order: 1, center_letter: 'م', outer_letters: ['ك', 'ت', 'ب'], valid_words: ['مكتب', 'كتب', 'سمك'], time_seconds: 90 }, { hints_limit: 1 });
    expect(w.words.map(x => x.word)).toEqual(['مكتب']);
    expect(w.time).toBe(90);
    expect(w.settings.hints_limit).toBe(1);
    expect(w.theme.outer_light).toBe('#FDE68A');
  });
  it('عجلة بلا كلمة صالحة لا تُعرض', () => {
    expect(wheelForPlay({ mode: 'picture', center_letter: 'م', outer_letters: ['ك', 'ت'], valid_words: ['سمك'] })).toBeNull();
    expect(wheelForPlay({ mode: 'picture', center_letter: '', outer_letters: ['ك', 'ت'], valid_words: ['كت'] })).toBeNull();
  });
  it('مظهر العجلة الخاص يغلب العام', () => {
    const row = { mode: 'picture', center_letter: 'م', outer_letters: ['س', 'ك'], valid_words: ['سمك'] };
    expect(wheelForPlay(row, { theme: { preset: 'forest' } }).theme.preset).toBe('forest');
    expect(wheelForPlay({ ...row, theme: { preset: 'candy' } }, { theme: { preset: 'forest' } }).theme.preset).toBe('candy');
  });
  it('كل عجلات التحدي الافتراضية الـ20 صالحة للعب بكل كلماتها', () => {
    const rows = defaultChallengeRows();
    expect(rows).toHaveLength(20);
    rows.forEach((r, i) => {
      const w = wheelForPlay(r);
      expect(w).not.toBeNull();
      expect(w.words.length).toBe(DEFAULT_CATALOG[i].valid_words.length);
    });
  });
});

describe('بطاقة الكلمة', () => {
  const isMedia = (u) => typeof u === 'string' && u.startsWith('https://proj.supabase.co/storage/v1/object/public/media/word-wheel/');
  it('من بنك الكلمات، وإلا الصورة القديمة، وإلا الكلمة وحدها', () => {
    const bank = { سمك: { vocalized: 'سَمَك', emoji: '🐟', definition: 'يسبح' } };
    expect(cardFor('سمك', bank)).toMatchObject({ vocalized: 'سَمَك', emoji: '🐟', definition: 'يسبح', image_url: null });
    expect(cardFor('نمر', bank, 'https://x/n.png')).toMatchObject({ vocalized: 'نمر', image_url: 'https://x/n.png', definition: '' });
  });
  it('يتحقق من الكلمة والتشكيل والروابط', () => {
    const img = 'https://proj.supabase.co/storage/v1/object/public/media/word-wheel/image/a.webp';
    const { data } = sanitizeWordInput({ word: 'سَمَك', vocalized: 'سَمَكٌ', emoji: '🐟', image_url: img, definition: '  يسبح  ' }, isMedia);
    expect(data).toMatchObject({ word: 'سمك', vocalized: 'سَمَكٌ', image_url: img, definition: 'يسبح' });
    expect(sanitizeWordInput({ word: 'سمك', vocalized: 'نَمِر' }, isMedia).error).toMatch(/المشكولة/);
    expect(sanitizeWordInput({ word: 'two words' }, isMedia).error).toMatch(/عربية/);
    expect(sanitizeWordInput({ word: 'سمك', image_url: 'https://evil.example/x.png' }, isMedia).error).toMatch(/الصورة/);
    expect(sanitizeWordInput({ word: 'سمك', audio_url: '' }, isMedia).data.audio_url).toBeNull();
  });
});

describe('مساعدات اللعب', () => {
  it('الحرف المخفي من الوسط لا الأول', () => {
    expect(missingIndex('سمك', () => 0)).toBe(1);
    expect(missingIndex('سمك', () => 0.99)).toBe(2);
    expect(missingIndex('يد', () => 0)).toBe(0);
  });
  it('تلميح التحدي: أقصر كلمة لم تُكتشف', () => {
    expect(challengeHint(['مكتب', 'تمر', 'سمك'], ['تمر'])).toEqual({ word: 'سمك', first: 'س', length: 3 });
    expect(challengeHint(['تمر'], ['تمر'])).toBeNull();
  });
  it('الإعدادات الافتراضية سليمة', () => {
    expect(normalizeWwSettings(null)).toEqual(DEFAULT_WW_SETTINGS);
  });
});

describe('toPreviewWheel', () => {
  it('كل عجلات المرحلة الأولى الافتراضية صالحة للمعاينة', () => {
    for (const w of DEFAULT_CATALOG.filter(x => x.level === 1)) {
      const p = toPreviewWheel(w);
      expect(p).not.toBeNull();
      expect(p.words.length).toBeGreaterThanOrEqual(WHEEL_PREVIEW_TARGET);
      p.words.forEach(word => expect(word.includes(p.center)).toBe(true));
    }
  });
  it('يستبعد كلمات لا تحوي الحرف الأوسط أو بحروف خارج العجلة', () => {
    const p = toPreviewWheel({ center: 'م', letters: ['ك', 'ت', 'ب', 'ر'], valid_words: ['مكتب', 'كتب', 'رمل', 'ترم', 'برم', 'برم'] });
    expect(p.words).toEqual(['مكتب', 'ترم', 'برم']);
  });
  it('يرفض عجلة كلماتها الصالحة أقل من الهدف', () => {
    expect(toPreviewWheel({ center: 'م', letters: ['ك', 'ت', 'ب', 'ر'], valid_words: ['مكتب'] })).toBeNull();
    expect(toPreviewWheel({ center: 'مم', letters: ['ك', 'ت', 'ب', 'ر'], valid_words: ['مكتب', 'ترم', 'برم'] })).toBeNull();
  });
});

describe('pickPreviewWheels', () => {
  it('عجلات التحدي الظاهرة في المرحلة الأولى من القاعدة', () => {
    const rows = [
      { mode: 'challenge', level: 1, is_active: true, center_letter: 'م', outer_letters: ['ك', 'ت', 'ب', 'ر', 'س', 'ن'], valid_words: ['تمر', 'سمك', 'نمر'] },
      { mode: 'challenge', level: 2, is_active: true, center_letter: 'م', outer_letters: ['ك', 'ت', 'ب', 'ر'], valid_words: ['مكتب', 'ترم', 'برم'] },
      { mode: 'picture', level: 1, is_active: true, center_letter: 'م', outer_letters: ['ك', 'ت', 'ب', 'ر'], valid_words: ['مكتب', 'ترم', 'برم'] },
      { mode: 'challenge', level: 1, is_active: false, center_letter: 'م', outer_letters: ['ك', 'ت', 'ب', 'ر'], valid_words: ['مكتب', 'ترم', 'برم'] },
    ];
    const wheels = pickPreviewWheels(rows, () => 0);
    expect(wheels).toHaveLength(1);
    expect(wheels[0].words).toEqual(['تمر', 'سمك', 'نمر']);
  });
  it('بلا عجلات صالحة في القاعدة: عجلات المرحلة الأولى الافتراضية الخمس', () => {
    expect(pickPreviewWheels([], () => 0)).toHaveLength(5);
    expect(pickPreviewWheels(null, () => 0)).toHaveLength(5);
  });
});
