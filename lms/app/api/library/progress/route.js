import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { getRole, isSuspended, isStaff } from '../../../../lib/auth-role';
import { resolveActiveIdentity } from '../../../../lib/active-child';
import { loadLibraryProgress } from '../../../../lib/library-progress-server';
export const dynamic = 'force-dynamic';
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
export async function GET(req) {
  try {
    const { data: { user } } = await createClient().auth.getUser();
    if (!user || isSuspended(user) || !getRole(user)) return json({ error: 'سجّل الدخول لعرض تقدّمك.' }, 401);
    if (isStaff(user)) return json({ preview: true, progress: {} });
    const admin = createAdminClient();
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    return json({ identity: effectiveUserId, progress: await loadLibraryProgress(admin, effectiveUserId) });
  } catch { return json({ error: 'تعذّر تحميل التقدّم. إنجازاتك محفوظة، حاول مرة أخرى.' }, 503); }
}
