import { mediaPublicUrl } from './story-audio';

/* ════════════════════════════════════════════════════════════════
   أصوات كلمات الألعاب (audio_url) — خادم فقط
   لوحات المعلم ترسل التسجيل كـdata URL؛ هنا يُرفع إلى Supabase Storage
   (media/game-audio/<اللعبة>/) ويُحفظ رابطه القصير فقط — لا base64 في
   قاعدة البيانات (القسم 9.1). ثلاثة تسجيلات base64 في صيّاد الحروف كانت
   259KB من أصل 363KB لاستجابة قائمة الكلمات كلها (71%).
   يعمل في Edge وNode معاً (atob لا Buffer).
════════════════════════════════════════════════════════════════ */

export const GAME_AUDIO_PREFIX = 'game-audio/';
const MAX_BYTES = 8 * 1024 * 1024;
const EXT = {
  'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
  'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/aac': 'aac',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav',
};
const DATA_URL_RE = /^data:(audio\/[\w.+-]+)(?:;[\w-]+=[\w.-]+)*;base64,([\s\S]*)$/i;

export const isDataAudio = (v) => typeof v === 'string' && /^data:audio\//i.test(v);

/* يفكّ data URL صوتياً إلى { type, ext, bytes }، أو null إن لم يكن صالحاً */
export function parseAudioDataUrl(dataUrl) {
  const m = DATA_URL_RE.exec(dataUrl || '');
  if (!m) return null;
  const type = m[1].toLowerCase();
  const ext = EXT[type];
  if (!ext) return null;
  let bin;
  try { bin = atob(m[2].replace(/\s+/g, '')); } catch { return null; }
  if (!bin.length || bin.length > MAX_BYTES) return null;
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { type, ext, bytes };
}

/* يرفع تسجيلاً (data URL) إلى التخزين ويُرجع رابطه العام، أو null إن تعذّر */
export async function moveAudioToStorage(admin, game, dataUrl) {
  const parsed = parseAudioDataUrl(dataUrl);
  if (!parsed) return null;
  const folder = String(game).replace(/[^a-z0-9_-]/gi, '') || 'game';
  const path = `${GAME_AUDIO_PREFIX}${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${parsed.ext}`;
  const { error } = await admin.storage.from('media').upload(path, parsed.bytes, { contentType: parsed.type, upsert: false });
  return error ? null : mediaPublicUrl(path);
}

/* قيمة audio_url الجاهزة للحفظ: التسجيل الجديد يُرفع ويُعاد رابطه، وما عداه
   (رابط موجود، فارغ، undefined) يمر كما هو. يرمي خطأً ودّياً إن فشل الرفع
   حتى لا يُحفظ base64 في القاعدة بصمت. */
export async function storableAudioUrl(admin, game, value) {
  if (!isDataAudio(value)) return value;
  const url = await moveAudioToStorage(admin, game, value);
  if (!url) throw new Error('تعذّر حفظ التسجيل الصوتي — جرّب تسجيلاً أقصر ثم احفظ مرة أخرى');
  return url;
}

/* إصلاح ذاتي لمرة واحدة: أي صف قديم ما زال صوته base64 يُنقل إلى التخزين
   ويُحدَّث رابطه، وتُعدَّل الصفوف المُعادة في نفس الاستجابة. لا يُفشل القراءة أبداً. */
export async function healAudioRows(admin, table, game, rows) {
  const stale = (rows || []).filter(r => isDataAudio(r.audio_url));
  for (const row of stale) {
    try {
      const url = await moveAudioToStorage(admin, game, row.audio_url);
      if (!url) continue;
      const { error } = await admin.from(table).update({ audio_url: url }).eq('id', row.id);
      if (!error) row.audio_url = url;
    } catch { /* يبقى كما هو ويُعاد المحاولة في القراءة التالية */ }
  }
  return rows;
}
