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

// ── POST /api/bogga/financials/[id]/send  (initial send OR retry)
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

  // Allow retry only for failed or unsent invoices
  if (invoice.status === 'sent' && invoice.email_delivery_status === 'success') {
    return Response.json({ error: 'تم إرسال هذه الفاتورة بنجاح مسبقاً' }, { status: 400 });
  }

  const email = invoice.user_email?.includes('@teacher') || invoice.user_email?.endsWith('@demo.test')
    ? null : invoice.user_email;
  if (!email) return Response.json({ error: 'البريد الإلكتروني غير متوفر لهذا المستخدم' }, { status: 400 });

  // ── Attempt email delivery ──────────────────────────────────────────────────
  let emailOk = false;
  let emailErr = null;
  try {
    await sendInvoiceEmail({ invoice, to: email });
    emailOk = true;
  } catch (e) {
    emailErr = e.message;
  }

  // ── Persist result regardless of outcome ───────────────────────────────────
  const now = new Date().toISOString();
  const patch = emailOk
    ? { status: 'sent', sent_at: now, email_delivery_status: 'success', locked_at: now, updated_at: now }
    : { email_delivery_status: 'failed', updated_at: now };

  const { data: updated, error: upErr } = await admin
    .from('invoices')
    .update(patch)
    .eq('id', params.id)
    .select()
    .maybeSingle();

  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });

  if (!emailOk) {
    return Response.json({
      error: `فشل إرسال البريد: ${emailErr}`,
      invoice: updated,
    }, { status: 500 });
  }

  return Response.json({ invoice: updated });
}
