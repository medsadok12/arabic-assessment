import { createClient as createServerClient } from '../../../../../../lib/supabase-server';
import { createAdminClient }   from '../../../../../../lib/supabase-admin';
import { invoiceHtml }         from '../../../../../../lib/invoiceEmail';
import { isAdmin } from '../../../../../../lib/auth-role';

async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return isAdmin(user) ? user : null;
}

// ── GET /api/bogga/financials/[id]/preview — نسخة قابلة للطباعة/الحفظ كـPDF ──
export async function GET(request, { params }) {
  const user = await requireAdmin();
  if (!user) return new Response('غير مصرح', { status: 401 });

  const admin = createAdminClient();
  const { data: invoice, error } = await admin
    .from('invoices')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error || !invoice) return new Response('الفاتورة غير موجودة', { status: 404 });

  const html = invoiceHtml(invoice, { withPrintButton: true });
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
