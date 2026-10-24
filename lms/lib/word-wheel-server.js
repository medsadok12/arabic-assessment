import { NextResponse } from 'next/server';
import { createClient } from './supabase-server';
import { getRole, isAdmin } from './auth-role';
import { mediaPathFromUrl } from './story-audio';
import {
  WW_GAME_ID, WORD_MEDIA_PREFIX, normalizeGlobalConfig, normalizeWheelWords, wheelForPlay,
  defaultChallengeRows, sortWheels, cardFor, resolveTheme,
} from './word-wheel';

/* ════════════════════════════════════════════════════════════════
   عجلة الكلمات — مساعدات مسارات الخادم (/api/word-wheel/*)
   الصلاحيات: المعلم والمشرف والمدير يديرون اللعبة. المعلم يعدّل عجلاته
   وعجلات المنصة (بلا منشئ)، ولا يمسّ عجلات معلم آخر؛ الحذف: عجلاته فقط.
════════════════════════════════════════════════════════════════ */

export const WW_STAFF = ['teacher', 'admin', 'super_admin'];
export const WHEEL_COLUMNS = 'id, name, mode, level, sort_order, center_letter, outer_letters, valid_words, time_seconds, is_active, theme, settings, created_by, created_at, updated_at';
export const WORD_COLUMNS = 'id, word, vocalized, emoji, image_url, audio_url, definition, hint, updated_at';
const NO_STORE = { 'Cache-Control': 'no-store' };

export function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/* المستخدم الحالي إن كان من طاقم اللعبة — { user } أو { error: ردّ جاهز } */
export async function requireWwStaff() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: json({ error: 'انتهت جلسة الدخول — سجّل الدخول ثم أعد المحاولة' }, 401) };
  if (!WW_STAFF.includes(getRole(user) ?? '')) return { error: json({ error: 'إدارة اللعبة للمعلمين والمشرفين فقط' }, 403) };
  return { user };
}

export function canEditWheel(user, row) {
  return isAdmin(user) || !row.created_by || row.created_by === user.id;
}
export function canDeleteWheel(user, row) {
  return isAdmin(user) || (!!row.created_by && row.created_by === user.id);
}

/* روابط الصور والأصوات المقبولة في بطاقات الكلمات: مجلد word-wheel/ في تخزيننا فقط */
export function isWordMediaUrl(url) {
  return !!mediaPathFromUrl(url, WORD_MEDIA_PREFIX);
}

/* يحذف من التخزين ملفات بطاقة لم تعد مستخدمة (استبدال/إزالة/حذف البطاقة) */
export async function removeWordMedia(admin, urls) {
  const paths = urls.map(u => mediaPathFromUrl(u, WORD_MEDIA_PREFIX)).filter(Boolean);
  if (!paths.length) return;
  try { await admin.storage.from('media').remove(paths); } catch {}
}

/* خطأ قاعدة بيانات سببه أن هجرة word_wheel_v2.sql لم تُنفَّذ بعد */
export function isMissingSchema(error) {
  return ['42703', '42P01', 'PGRST204', 'PGRST205'].includes(error?.code);
}
export function schemaResponse() {
  return json({ error: 'قاعدة البيانات تحتاج تحديث «عجلة الكلمات» (lms/supabase/word_wheel_v2.sql) قبل الحفظ', need_sql: true }, 503);
}

export async function loadGlobalConfig(admin) {
  const { data } = await admin.from('game_settings').select('settings').eq('game_id', WW_GAME_ID).maybeSingle();
  return normalizeGlobalConfig(data?.settings);
}

/* كل ما يحتاجه الطفل في طلب واحد: العجلات الظاهرة الجاهزة للعب، والإعدادات
   العامة، وبطاقات كلماتها. العجلات الافتراضية للتحدي إن خلت القاعدة منه. */
export async function loadGamePayload(admin) {
  const [wheelsRes, global] = await Promise.all([
    admin.from('word_wheel_configs').select(WHEEL_COLUMNS).eq('is_active', true),
    loadGlobalConfig(admin).catch(() => normalizeGlobalConfig(null)),
  ]);
  const rows = wheelsRes.error ? [] : (wheelsRes.data || []);
  let wheels = rows.map(r => wheelForPlay(r, global)).filter(Boolean);
  if (!wheels.some(w => w.mode === 'challenge')) {
    wheels = wheels.concat(defaultChallengeRows().map(r => wheelForPlay(r, global)).filter(Boolean));
  }
  wheels = sortWheels(wheels);

  const allWords = [...new Set(wheels.flatMap(w => w.words.map(x => x.word)))];
  const bank = {};
  if (allWords.length) {
    const { data, error } = await admin.from('word_wheel_words').select(WORD_COLUMNS).in('word', allWords);
    if (!error) for (const row of data || []) bank[row.word] = row;
  }
  const cards = {};
  for (const w of wheels) for (const x of w.words) if (!cards[x.word]) cards[x.word] = cardFor(x.word, bank, x.image);
  // صور الصيغة القديمة دخلت البطاقة — لا حاجة لها داخل العجلة
  for (const w of wheels) w.words = w.words.map(x => x.word);

  const { theme, ...settings } = global;
  return { wheels, cards, settings, theme: resolveTheme(theme) };
}

/* كلمات العجلة نصوصاً (الصيغة الجديدة) — صور الصيغة القديمة تُقرأ عند العرض فقط (cardFor) */
export function wheelWordList(row) {
  return normalizeWheelWords(row?.valid_words).map(w => w.word);
}
