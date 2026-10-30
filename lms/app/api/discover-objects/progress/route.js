import { createAdminClient } from '../../../../lib/supabase-admin';
import { resolveActiveIdentity } from '../../../../lib/active-child';
import { getRole } from '../../../../lib/auth-role';
import { discoverJson as json, discoverUser, loadDiscover, loadDiscoverSolved } from '../../../../lib/discover-objects-server';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const auth = await discoverUser();
  if (auth.error) return auth.error;
  try {
    const admin = createAdminClient();
    const { config, version } = await loadDiscover(admin);
    if (auth.staff || getRole(auth.user) === 'supervisor') return json({ solved: [], preview: true, version, identity: auth.user.id });
    const { effectiveUserId } = await resolveActiveIdentity(auth.user, admin, req);
    return json({ solved: await loadDiscoverSolved(admin, effectiveUserId, config), version, identity: effectiveUserId });
  } catch { return json({ error: 'تعذّر فتح مسارك الآن. جرّب ثانية، إنجازاتك محفوظة.' }, 503); }
}
