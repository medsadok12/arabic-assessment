export const dynamic = 'force-dynamic';
import { createAdminClient } from '../../../lib/supabase-admin';

const NO_CACHE = { 'Cache-Control': 'no-store, must-revalidate', 'CDN-Cache-Control': 'no-store' };

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('team_members')
      .select('id, name, title, bio, image_url, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) return Response.json({ members: [] }, { headers: NO_CACHE });
    return Response.json({ members: data ?? [] }, { headers: NO_CACHE });
  } catch {
    return Response.json({ members: [] }, { headers: NO_CACHE });
  }
}
