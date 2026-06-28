import { createAdminClient } from '../../../lib/supabase-admin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) return Response.json({ plans: [] });
    return Response.json({ plans: data ?? [] });
  } catch {
    return Response.json({ plans: [] });
  }
}
