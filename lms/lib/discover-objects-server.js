import { NextResponse } from 'next/server';
import { createClient } from './supabase-server';
import { getRole, isSuspended } from './auth-role';
import { DISCOVER_ID, DISCOVER_STAFF, freshDiscover, validateDiscover } from './discover-objects';
import { addDiscoverScenePack } from './discover-objects-scenes';
import { playableDiscover } from './discover-objects';

export const discoverJson = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, max-age=0' } });
export async function discoverUser(staffOnly = false) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user || isSuspended(user)) return { error: discoverJson({ error: 'سجّل الدخول لتكمل مغامرتك' }, 401) };
  const staff = DISCOVER_STAFF.includes(getRole(user));
  if (staffOnly && !staff) return { error: discoverJson({ error: 'التحرير للمعلمين والإدارة فقط' }, 403) };
  return { user, staff };
}
export async function loadDiscover(admin) {
  const { data, error } = await admin.from('game_settings').select('settings, updated_at').eq('game_id', DISCOVER_ID).maybeSingle();
  if (error) throw error; // لا نعيد الافتراضي عند فشل قراءة صف قد أخفاه المعلم.
  if (!data) return { config: freshDiscover(), version: null };
  const checked = validateDiscover(data.settings);
  if (checked.error) throw new Error('تعذّرت قراءة محتوى التدريب المحفوظ');
  return { config: addDiscoverScenePack(checked.config), version: data.updated_at };
}

// مفاتيح الإنجازات التي أنشأها مسار التصحيح نفسه، وليس نتائج يرسلها المتصفح.
export async function loadDiscoverSolved(admin, userId, config) {
  const prefix = `${DISCOVER_ID}:completed:${userId}:`;
  const pattern = prefix.replace(/[\\%_]/g, c => `\\${c}`) + '%';
  const valid = new Set(playableDiscover(config).map(e => e.round.id));
  const solved = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from('game_settings').select('game_id').like('game_id', pattern).order('game_id').range(offset, offset + 999);
    if (error) throw error;
    for (const row of data || []) {
      if (!row.game_id?.startsWith(prefix)) continue;
      const id = row.game_id.slice(prefix.length);
      if (valid.has(id)) solved.add(id);
    }
    if (!data || data.length < 1000) break;
  }
  return [...solved];
}
