import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

// الحارس — يتحقق من هوية المستخدم عبر كوكيز الجلسة (لا SERVICE_ROLE)
async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_ROLES.has(user.user_metadata?.role)) return null;
  return user;
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function fetchCodes() {
  // 🔒 لا وصول دون صلاحية إدارية — قبل أي لمس لقاعدة البيانات
  if (!await requireAdmin()) {
    return Response.json({ error: 'غير مخول' }, { status: 403 });
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('student_invitation_codes')
    .select('id, code, is_used, used_by_name, used_at, created_at')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(JSON.stringify({ codes: data ?? [] }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export async function POST() { return fetchCodes(); }
export async function GET()  { return fetchCodes(); }
