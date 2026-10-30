/* ════════════════════════════════════════════════════════════════
   المدقق الإملائي لتحدّي «الحروف الهجائية» — يعمل في المتصفح (تغذية راجعة فورية)
   وعلى الخادم (اعتماد الإجابة قبل تسجيل الحرف ومنح النقاط) بالمنطق نفسه.

   الطفل يكتب الكلمة بلا تشكيل (لا نحاسبه على الحركات)، ونصحّح له القواعد الأساسية
   برسالة لطيفة من فهيم، كلٌّ في وقته — خطأ واحد في كل مرة بالأولوية:
     قاعدة المعلم ← الهمزة ← التاء المربوطة/المفتوحة ← الألف المقصورة ← التنوين
     ← حرف المدّ ← الحرف المشدّد ← حرف شبيه (صوتاً أو نقاطاً) ← «قريب» ← «ليست هذه الكلمة».
   رسائل القواعد تُظهر الكلمة الصحيحة (مثال الأستاذ محمد: «لا تنسَ إضافة الهمزة: أَسَد!»)،
   أما «قريب» و«ليست هذه» فلا تكشفها — كي يبقى اللغز لغزاً.
════════════════════════════════════════════════════════════════ */

/* الحركات والتنوين والشدة والسكون والألف الخنجرية وعلامات المصحف */
const HARAKAT   = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g;
const TANWEEN   = /[ً-ٍ]/g;
/* التطويل والمحارف الخفية (اتجاه النص، عرض صفري) */
const INVISIBLE = /[ـ​-‏‪-‮⁦-⁩؜﻿]/g;
const PUNCT     = /[.,!?؟،؛:;"'`«»()[\]{}\-_*+=/\\|~^<>@#$%&]/g;
const ARABIC_LETTER = /[ء-ي]/;
const HAMZAS = 'أإآءؤئ';

/* ما يكتبه الطفل ← صيغة المقارنة: بلا تشكيل ولا تطويل ولا ترقيم، والمحارف الفارسية/الأردية
   الشبيهة (لوحات مفاتيح أخرى) تُوحَّد مع العربية — فهذه ليست أخطاء إملائية */
export function normalizeArabic(s) {
  return String(s ?? '')
    .normalize('NFKC')                // أشكال العرض (ﻻ ﻷ) ← حروف عادية
    .replace(HARAKAT, '')
    .replace(INVISIBLE, '')
    .replace(PUNCT, ' ')
    .replace(/ٱ/g, 'ا')
    .replace(/[یې]/g, 'ي')   // ی ې
    .replace(/ک/g, 'ك')           // ک
    .replace(/[ہە]/g, 'ه')   // ہ ە
    .replace(/\s+/g, ' ')
    .trim();
}

export const stripHarakat = (s) => String(s ?? '').replace(HARAKAT, '').replace(INVISIBLE, '');
export const stripTanween = (s) => String(s ?? '').replace(TANWEEN, '');

const words = (s) => s.split(' ');
const mapWords = (s, f) => words(s).map(f).join(' ');
const stripAl = (s) => mapWords(s, w => (w.startsWith('ال') && w.length > 3 ? w.slice(2) : w));

/* ── طيّات المقارنة: كل واحدة تُخفي صنفاً واحداً من الفروق ── */
const foldHamzaA = (s) => s.replace(/[أإآ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '');  // همزة ناقصة
const foldHamzaB = (s) => s.replace(/[أإآ]/g, 'أ').replace(/[ؤئء]/g, 'ء');                                  // كرسي الهمزة
const foldTa     = (s) => mapWords(s, w => w.replace(/[ةهت]$/, 'ه'));
/* إصلاحات باتجاه الهدف: التنوين المكتوب نوناً، والألف المقصورة */
function fixTanween(a, b) {
  const bw = words(b);
  return words(a).map((w, i) => {
    const t = bw[i];
    return t && w.endsWith('ن') && !t.endsWith('ن') && w.length === t.length + 1 ? w.slice(0, -1) : w;
  }).join(' ');
}
function fixMaqsura(a, b) {
  const bw = words(b);
  return words(a).map((w, i) => {
    const t = bw[i];
    if (!t || w.length !== t.length) return w;
    if (t.endsWith('ى') && /[يا]$/.test(w)) return w.slice(0, -1) + 'ى';
    if (t.endsWith('ي') && w.endsWith('ى')) return w.slice(0, -1) + 'ي';
    return w;
  }).join(' ');
}

const CLASSES = ['hamza', 'ta', 'maqsura', 'tanween'];
function sameUnder(a, b, on) {
  let x = a, y = b;
  if (on.tanween) x = fixTanween(x, y);
  if (on.maqsura) x = fixMaqsura(x, y);
  if (on.ta) { x = foldTa(x); y = foldTa(y); }
  if (x === y) return true;
  return on.hamza ? [foldHamzaA, foldHamzaB].some(f => f(x) === f(y)) : false;
}
const ALL_ON = Object.fromEntries(CLASSES.map(c => [c, true]));
/* تطابق «متسامح» (للقواعد المخصّصة): نفس الكلمة مع أي خطأ همزة/تاء/ألف/تنوين */
export const looseEqual = (a, b) => sameUnder(normalizeArabic(a), normalizeArabic(b), ALL_ON);

/* أشكال الكلمة الكاملة بعد إصلاح الأصناف الأربعة (للبحث عن خطأ حرف واحد بعدها) */
const fullyFolded = (a, b) => {
  const x = foldHamzaA(foldTa(fixMaqsura(fixTanween(a, b), b)));
  return [x, foldHamzaA(foldTa(b))];
};

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/* حروف يخلط بينها الأطفال: بالنقاط (ب ت ث ن ي…) أو بالصوت (س ص ث، ت ط، ذ ز ظ…) */
const SIMILAR = ['بتثني', 'جحخ', 'دذ', 'رز', 'سش', 'صض', 'طظ', 'عغ', 'فق', 'سصث', 'تط', 'دض', 'ذزظ', 'ضظ', 'كق', 'هح', 'عا', 'غق', 'ةه'];
const isSimilar = (x, y) => SIMILAR.some(g => g.includes(x) && g.includes(y));

const SEAT = {
  'أ': 'فوق الألف (أ)', 'إ': 'تحت الألف (إ)', 'آ': 'ألف المدّ (آ)',
  'ؤ': 'على الواو (ؤ)', 'ئ': 'على النبرة (ئ)', 'ء': 'على السطر (ء)',
};

/* الكلمة كما تُعرض للطفل في رسائل التصحيح: بتشكيلها (من بطاقة الحرف) وبلا تنوين —
   إلا إن غيّر المعلم الإجابة فتُعرض كما كتبها */
export function displayAnswer(word, answer) {
  const w = String(word ?? '').trim();
  const a = String(answer ?? '').trim();
  if (a && normalizeArabic(a) !== normalizeArabic(w)) return stripTanween(a);
  return stripTanween(w || a);
}

/* ── التشخيص على هدف واحد: { kind, msg, tip?, show? } أو null ── */
function diagnose(a, b, { show, showTanween, hasShadda }) {
  if (sameUnder(a, b, ALL_ON)) {
    const need = CLASSES.find(c => !sameUnder(a, b, { ...ALL_ON, [c]: false }));
    if (need === 'hamza') {
      const hb = [...b].filter(c => HAMZAS.includes(c));
      const ha = [...fixMaqsura(fixTanween(a, b), b)].filter(c => HAMZAS.includes(c));
      if (ha.length > hb.length) {
        return { kind: 'hamza_extra', show, msg: `أحسنت المحاولة! لكن هذه الكلمة بلا همزة: ${show}`, tip: 'اكتب الألف وحدها هكذا: ا' };
      }
      let i = 0; while (i < ha.length && ha[i] === hb[i]) i++;
      const e = hb[Math.min(i, hb.length - 1)] ?? 'أ';
      if (i < ha.length && ha.length === hb.length) {
        return { kind: 'hamza_seat', show, msg: `قريب جدًّا! الهمزة هنا تُكتب ${SEAT[e]}: ${show}`, tip: `الهمزة ${SEAT[e]}` };
      }
      return { kind: 'hamza_missing', show, msg: `أحسنت المحاولة، لكن لا تنسَ إضافة الهمزة: ${show}!`, tip: `الهمزة هنا ${SEAT[e]}` };
    }
    if (need === 'ta') {
      const x = fixTanween(a, b);
      const bw = words(b), xw = words(x);
      const k = bw.findIndex((w, i) => /[ةهت]$/.test(w) && xw[i] && xw[i].slice(-1) !== w.slice(-1));
      const e = bw[k]?.slice(-1), g = xw[k]?.slice(-1);
      if (e === 'ة' && g === 'ه') return { kind: 'ta_marbuta', show, msg: `أحسنت المحاولة! في آخر الكلمة تاء مربوطة (ة) وليست هاء: ${show}`, tip: 'التاء المربوطة هاءٌ فوقها نقطتان: ة' };
      if (e === 'ة') return { kind: 'ta_marbuta', show, msg: `أحسنت المحاولة! في آخر الكلمة تاء مربوطة (ة) وليست تاء مفتوحة: ${show}`, tip: 'نقف عليها بالهاء، فنكتبها مربوطة: ة' };
      if (e === 'ت') return { kind: 'ta_maftuha', show, msg: `انتبه! في آخر هذه الكلمة تاء مفتوحة (ت): ${show}`, tip: 'نقف عليها بالتاء، فنكتبها مفتوحة: ت' };
      return { kind: 'ha', show, msg: `انتبه! في آخر هذه الكلمة هاء (ه): ${show}`, tip: 'نقف عليها بالهاء وليس فوقها نقطتان: ه' };
    }
    if (need === 'maqsura') {
      const x = fixTanween(a, b);
      if (/ى(\s|$)/.test(b) && /ي(\s|$)/.test(x)) return { kind: 'alef_maqsura', show, msg: `في آخر الكلمة ألف مقصورة (ى) بلا نقطتين: ${show}`, tip: 'الألف المقصورة تشبه الياء بلا نقاط: ى' };
      if (/ى(\s|$)/.test(b)) return { kind: 'alef_maqsura', show, msg: `في آخر الكلمة ألف مقصورة تُكتب هكذا (ى): ${show}`, tip: 'الألف المقصورة تشبه الياء بلا نقاط: ى' };
      return { kind: 'ya', show, msg: `في آخر الكلمة ياء بنقطتين (ي): ${show}`, tip: 'الياء تحتها نقطتان: ي' };
    }
    if (need === 'tanween') {
      return { kind: 'tanween', show: showTanween, msg: `أحسنت! نسمع التنوين «نْ» في آخر الكلمة، لكننا لا نكتبه حرف نون: ${showTanween}`, tip: 'التنوين حركتان على الحرف الأخير: ـٌ ـً ـٍ' };
    }
    return null;
  }

  const [x, y] = fullyFolded(a, b);
  // حرف مدّ ناقص (غزل ← غزال)
  if (y.length === x.length + 1) {
    for (let i = 0; i < y.length; i++) {
      if ('اوي'.includes(y[i]) && y.slice(0, i) + y.slice(i + 1) === x) {
        return { kind: 'madd', show, msg: `قريب! لا تنسَ حرف المدّ «${y[i]}»: ${show}`, tip: `حروف المدّ: ا و ي` };
      }
    }
  }
  // حرف مكرر بدل الشدة (تففاحة ← تفّاحة)
  if (x.length === y.length + 1) {
    for (let i = 1; i < x.length; i++) {
      if (x[i] === x[i - 1] && x.slice(0, i) + x.slice(i + 1) === y) {
        return hasShadda
          ? { kind: 'shadda', show, msg: `قريب! الحرف «${x[i]}» مشدَّد: نكتبه مرة واحدة وعليه شدّة: ${show}`, tip: 'الشدّة علامة فوق الحرف: ـّ' }
          : { kind: 'close_extra', msg: 'قريب جدًّا! فيها حرف زائد 👀' };
      }
    }
  }
  // حرف شبيه واحد (تفاخة ← تفاحة، سقر ← صقر)
  if (x.length === y.length) {
    const diff = [...x].map((c, i) => (c !== y[i] ? i : -1)).filter(i => i >= 0);
    if (diff.length === 1 && isSimilar(x[diff[0]], y[diff[0]])) {
      const e = y[diff[0]], g = x[diff[0]];
      return { kind: 'similar', show, msg: `قريب جدًّا! انتبه للحرف «${e}» وليس «${g}»: ${show}`, tip: `«${e}» و«${g}» حرفان متشابهان` };
    }
  }
  return null;
}

/* ── الفحص الكامل ──
   target: { answer, accept: [], rules: [{ wrong, msg }], word (بتشكيله) }
   opts:   { allowAl: true } — «الأسد» تُقبل لِـ«أسد»
   ← { ok: true, matched } أو { ok: false, kind, msg, tip?, show? } */
export function checkSpelling(input, target, { allowAl = true } = {}) {
  const raw = String(input ?? '');
  let a = normalizeArabic(raw);
  if (!a) return { ok: false, kind: 'empty', msg: 'اكتب اسم الكلمة أولًا ✏️' };
  if (!ARABIC_LETTER.test(a)) {
    return /[A-Za-z]/.test(raw)
      ? { ok: false, kind: 'not_arabic', msg: 'اكتب بالحروف العربية من فضلك 😊', tip: 'استعمل لوحة الحروف تحت الخانة' }
      : { ok: false, kind: 'wrong', msg: 'ليست هذه الكلمة 🤔 اقرأ اللغز مرة أخرى' };
  }

  const answer = normalizeArabic(target?.answer || stripHarakat(target?.word || ''));
  if (!answer) return { ok: false, kind: 'wrong', msg: 'ليست هذه الكلمة 🤔 اقرأ اللغز مرة أخرى' };
  const accept = (Array.isArray(target?.accept) ? target.accept : []).map(normalizeArabic).filter(Boolean);
  const targets = [answer, ...accept.filter(t => t !== answer)];
  const prep = (s) => (allowAl ? stripAl(s) : s);

  const hit = targets.find(t => prep(a) === prep(t));
  if (hit) return { ok: true, matched: hit };

  // قواعد المعلم: «إن كتب الطفل كذا فقل له كذا» (متسامحة مع أخطاء الهمزة والتاء)
  for (const r of Array.isArray(target?.rules) ? target.rules : []) {
    if (r?.wrong && r?.msg && sameUnder(prep(a), prep(normalizeArabic(r.wrong)), ALL_ON)) {
      return { ok: false, kind: 'custom', msg: String(r.msg) };
    }
  }

  if (!allowAl && a.startsWith('ال') && targets.some(t => a.slice(2) === t)) {
    return { ok: false, kind: 'al', msg: 'اكتب الكلمة بدون «ال» 😊' };
  }

  const show = displayAnswer(target?.word, target?.answer);
  const vowelledWord = String(target?.word ?? '');
  const showTanween = /[\u064B-\u064D]/.test(vowelledWord) && normalizeArabic(vowelledWord) === answer ? vowelledWord.trim() : show;
  const hasShadda = /ّ/.test(target?.answer || '') || /ّ/.test(vowelledWord);

  // نشخّص على الأقرب من الإجابة والبدائل المقبولة
  const ranked = targets
    .map(t => ({ t, d: levenshtein(...fullyFolded(prep(a), prep(t))) }))
    .sort((p, q) => p.d - q.d);
  for (const { t } of ranked) {
    const isMain = t === answer;
    const d = diagnose(prep(a), prep(t), { show: isMain ? show : t, showTanween: isMain ? showTanween : t, hasShadda: isMain && hasShadda });
    if (d) return { ok: false, ...d };
  }

  const best = ranked[0];
  const [x, y] = fullyFolded(prep(a), prep(best.t));
  const near = y.length <= 3 ? 1 : 2;
  if (best.d <= near) {
    if (x.length < y.length) return { ok: false, kind: 'close_missing', msg: 'قريب جدًّا! ينقصها حرف 👀' };
    if (x.length > y.length) return { ok: false, kind: 'close_extra', msg: 'قريب جدًّا! فيها حرف زائد 👀' };
    return { ok: false, kind: 'close', msg: 'قريب! تحقّق من الحروف مرة أخرى 👀' };
  }
  return { ok: false, kind: 'wrong', msg: 'ليست هذه الكلمة 🤔 اقرأ اللغز مرة أخرى' };
}

/* أسماء أنواع التشخيص — لمختبر المدقق في لوحة المعلم */
export const SPELL_KIND_LABELS = {
  hamza_missing: 'همزة ناقصة', hamza_seat: 'كرسي الهمزة', hamza_extra: 'همزة زائدة',
  ta_marbuta: 'تاء مربوطة', ta_maftuha: 'تاء مفتوحة', ha: 'هاء آخر الكلمة',
  alef_maqsura: 'ألف مقصورة', ya: 'ياء آخر الكلمة', tanween: 'تنوين مكتوب نوناً',
  madd: 'حرف مدّ ناقص', shadda: 'حرف مشدّد مكرّر', similar: 'حرف شبيه',
  custom: 'قاعدة المعلم', al: '«ال» غير مقبولة', close_missing: 'حرف ناقص', close_extra: 'حرف زائد',
  close: 'قريبة', wrong: 'كلمة أخرى', empty: 'فارغة', not_arabic: 'حروف غير عربية',
};
