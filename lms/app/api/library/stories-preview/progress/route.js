import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { getRole, isSuspended, isStaff } from '../../../../../lib/auth-role';
import { resolveActiveIdentity } from '../../../../../lib/active-child';

export const dynamic = 'force-dynamic';
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
// Only reads completion records. Opening this preview never starts/finishes a story or awards points.
export async function GET(req) {
  try {
    const { data: { user } } = await createClient().auth.getUser();
    if (!user || !getRole(user) || isSuspended(user)) return json({ error: 'سجّل الدخول لعرض حكاياتك.' }, 401);
    if (isStaff(user)) return json({ completed: [], preview: true });
    const admin = createAdminClient();
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    const completed = new Set();
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.from('story_reads').select('story_id')
        .eq('user_id', effectiveUserId).order('story_id').range(offset, offset + 999);
      if (error) throw error;
      for (const row of data || []) completed.add(row.story_id);
      if (!data || data.length < 1000) break;
    }
    return json({ completed: [...completed] });
  } catch { return json({ error: 'تعذّر عرض حالة القراءة الآن. يمكنك اختيار قصة والقراءة كالمعتاد.' }, 503); }
}
