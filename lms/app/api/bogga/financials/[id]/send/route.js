import { createClient as createServerClient } from '../../../../../../lib/supabase-server';
import { createAdminClient }   from '../../../../../../lib/supabase-admin';
import { sendInvoiceEmail }    from '../../../../../../lib/invoiceEmail';

async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role ?? '';
  return (role === 'super_admin' || role === 'admin') ? user : null;
}

// ── POST /api/bogga/financials/[id]/send
export async function POST(request, { params }) {
  const user = await requireAdmin();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  const admin = createAdminClient();
  const { data: invoice, error: fetchErr } = await admin
    .from('invoices')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchErr || !invoice) return Response.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });

  const email = invoice.user_email?.includes('@teacher') ? null : invoice.user_email;
  if (!email) return Response.json({ error: 'البريد الإلكتروني غير متوفر لهذا المستخدم' }, { status: 400 });

  try {
    await sendInvoiceEmail({ invoice, to: email });
  } catch (e) {
    return Response.json({ error: 'فشل إرسال البريد: ' + e.message }, { status: 500 });
  }

  const { data: updated, error: upErr } = await admin
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .maybeSingle();

  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  return Response.json({ invoice: updated });
}
