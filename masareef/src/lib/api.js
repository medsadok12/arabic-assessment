import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { sha256Hex } from './spaceKey.js';

const ITEM_FIELDS = ['id', 'item_date', 'name', 'price', 'category', 'status', 'added_by'];
const SPACE_FIELDS = ['title', 'currency', 'wedding_date'];

const clients = new Map();
const hashes = new Map();
const channels = new Map();

// كل طلب يحمل رمز الدفتر في الترويسة، وسياسات RLS تحصر البيانات فيه
function client(key) {
  if (!clients.has(key)) {
    clients.set(key, createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { 'x-masareef-key': key } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }));
  }
  return clients.get(key);
}

function spaceHash(key) {
  if (!hashes.has(key)) hashes.set(key, sha256Hex(key));
  return hashes.get(key);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    // status 0 = انقطاع الشبكة؛ 5xx/408/429 = عطل مؤقت يستحق إعادة المحاولة
    this.transient = !status || status >= 500 || status === 408 || status === 429;
  }
}

function unwrap({ data, error, status }) {
  if (error) throw new ApiError(error.message, status);
  return data;
}

const pick = (source, fields) => Object.fromEntries(fields.map(f => [f, source[f] ?? null]));

export async function fetchSpace(key) {
  const rows = unwrap(await client(key).from('masareef_spaces').select(['space', ...SPACE_FIELDS].join(',')).limit(1));
  return rows[0] ? pick(rows[0], SPACE_FIELDS) : null;
}

export async function saveSpace(key, space) {
  const row = { ...pick(space, SPACE_FIELDS), space: await spaceHash(key) };
  unwrap(await client(key).from('masareef_spaces').upsert(row));
}

export async function fetchItems(key) {
  return unwrap(await client(key)
    .from('masareef_items')
    .select([...ITEM_FIELDS, 'created_at', 'updated_at'].join(','))
    .order('item_date')
    .order('created_at'))
    .map(item => ({ ...item, price: Number(item.price) }));
}

export async function upsertItem(key, item) {
  const row = { ...pick(item, ITEM_FIELDS), space: await spaceHash(key) };
  unwrap(await client(key).from('masareef_items').upsert(row));
}

export async function deleteItem(key, id) {
  unwrap(await client(key).from('masareef_items').delete().eq('id', id));
}

// المزامنة اللحظية: إشارة «تغيّر شيء» بين جهازي الخطيبين عبر قناة بث خاصة بالدفتر.
// الإشارة لا تحمل بيانات؛ الجهاز الآخر يعيد التحميل عبر الطلبات المحمية بالرمز.
export function subscribe(key, onChange) {
  let cancelled = false;
  sha256Hex(`masareef-channel:${key}`).then(name => {
    if (cancelled) return;
    const channel = client(key)
      .channel(`masareef-${name.slice(0, 32)}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'changed' }, () => onChange())
      .subscribe();
    channels.set(key, channel);
  }).catch(() => { /* البث غير متاح؛ يكفي التحديث الدوري */ });

  return () => {
    cancelled = true;
    const channel = channels.get(key);
    if (channel) {
      channels.delete(key);
      client(key).removeChannel(channel);
    }
  };
}

export function notifyPartner(key) {
  const channel = channels.get(key);
  if (channel?.state === 'joined') {
    channel.send({ type: 'broadcast', event: 'changed', payload: {} }).catch(() => {});
  }
}

export const supabaseApi = { fetchSpace, saveSpace, fetchItems, upsertItem, deleteItem, subscribe, notifyPartner };
