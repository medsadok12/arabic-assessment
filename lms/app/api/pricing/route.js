import { createAdminClient } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const NO_CACHE = { 'Cache-Control': 'no-store, must-revalidate', 'CDN-Cache-Control': 'no-store' };

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }); // prefer newest row when sort_order is tied (dedup safety)

    if (error) {
      console.error('[/api/pricing] supabase error:', error.message);
      return Response.json({ plans: [], error: error.message }, { headers: NO_CACHE });
    }
    return Response.json({ plans: data ?? [] }, { headers: NO_CACHE });
  } catch (e) {
    console.error('[/api/pricing] caught:', e.message);
    return Response.json({ plans: [], error: e.message }, { headers: NO_CACHE });
  }
}
