import { createAdminClient } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[/api/pricing] supabase error:', error.message);
      return Response.json({ plans: [], error: error.message });
    }
    return Response.json({ plans: data ?? [] });
  } catch (e) {
    console.error('[/api/pricing] caught:', e.message);
    return Response.json({ plans: [], error: e.message });
  }
}
