import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '../../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_ROLES.has(user.user_metadata?.role)) return null;
  return user;
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomPart() {
  let out = '';
  for (let i = 0; i < 6; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
  return out;
}

function nextSuffix(suffix) {
  const chars = suffix.split('').map(c => c.charCodeAt(0) - 65);
  let carry = 1;
  for (let i = chars.length - 1; i >= 0 && carry; i--) {
    const val = chars[i] + carry;
    if (val >= 26) { chars[i] = 0; } else { chars[i] = val; carry = 0; }
  }
  if (carry) chars.unshift(0);
  return chars.map(c => String.fromCharCode(65 + c)).join('');
}

function buildNextCode(prefix, existingCodes) {
  const suffixes = existingCodes
    .map(c => c.toUpperCase())
    .filter(c => c.startsWith(prefix))
    .map(c => c.slice(prefix.length).split('-')[0])
    .filter(s => s.length > 0 && /^[A-Z]+$/.test(s));

  const seqSuffix = suffixes.length
    ? nextSuffix(suffixes.reduce((max, s) =>
        s.length > max.length || (s.length === max.length && s > max) ? s : max))
    : 'A';

  return `${prefix}${seqSuffix}-${randomPart()}`;
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST() {
  if (!await requireAdmin()) return Response.json({ error: 'غير مخول' }, { status: 403 });

  const supabase = getClient();

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: existing, error: fetchErr } = await supabase
      .from('assessment_codes').select('code');

    if (fetchErr) return Response.json({ error: fetchErr.message }, { status: 500 });

    const code = buildNextCode('A', (existing ?? []).map(r => r.code));

    const { data, error } = await supabase
      .from('assessment_codes')
      .insert({ code }).select('code').single();

    if (!error && data) return Response.json({ code: data.code });
    if (error?.code === '23505') continue;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ error: 'الجدول يرفض الحفظ — تحقق من إعداد Supabase' }, { status: 500 });
  }

  return Response.json({ error: 'فشل توليد الكود، أعد المحاولة' }, { status: 500 });
}
