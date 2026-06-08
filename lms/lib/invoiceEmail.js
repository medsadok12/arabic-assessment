import { Resend } from 'resend';

const FROM = 'أكاديمية عارم <noreply@aarem.net>';

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function periodLabel(period) {
  if (!period) return period;
  const [y, m] = period.split('-');
  return `${MONTHS_AR[parseInt(m) - 1]} ${y}`;
}

function fmtAmount(n) {
  return Number(n ?? 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function invoiceHtml(invoice) {
  const isTeacher = invoice.type === 'teacher_payout';
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const tableRows = items.map(it => {
    const hrs = (it.minutes / 60).toFixed(2);
    const rowAmt = (parseFloat(hrs) * Number(invoice.rate_per_hour)).toFixed(2);
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eef2f8;font-size:.88rem;color:#334155">${it.date ?? ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eef2f8;font-size:.88rem;color:#334155">${isTeacher ? (it.student ?? '') : (it.teacher ?? '')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eef2f8;font-size:.88rem;color:#334155">${it.subject ?? '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eef2f8;font-size:.88rem;color:#334155;text-align:center">${it.minutes ?? 60} د</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eef2f8;font-size:.88rem;color:#1a7c40;text-align:center;font-weight:700">${fmtAmount(rowAmt)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{margin:0;padding:0;background:#f0f4f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl}
    .wrap{max-width:640px;margin:0 auto;padding:28px 16px}
    .card{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 28px rgba(24,95,165,.12)}
    .hdr{background:linear-gradient(135deg,#1a3a6b 0%,#185FA5 100%);padding:28px 36px}
    .hdr-title{color:#fff;font-size:1.4rem;font-weight:800;margin:0 0 4px}
    .hdr-sub{color:rgba(255,255,255,.75);font-size:.9rem;margin:0}
    .body{padding:28px 36px}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:26px}
    .meta-box{background:#f8faff;border-radius:10px;padding:14px 16px;border-right:3px solid #185FA5}
    .meta-lbl{font-size:.75rem;color:#6b7280;font-weight:700;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em}
    .meta-val{font-size:1rem;font-weight:800;color:#1e293b}
    .tbl-wrap{border-radius:10px;overflow:hidden;border:1px solid #e8eef5;margin:20px 0}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#f0f6ff}
    thead th{padding:10px 12px;font-size:.78rem;font-weight:800;color:#185FA5;text-align:right;border-bottom:2px solid #c4dcf7}
    .total-row{background:linear-gradient(135deg,#185FA5,#1a3a6b);color:#fff}
    .total-row td{padding:13px 12px;font-weight:800;font-size:1rem;border:none}
    .ftr{background:#f4f7fc;padding:16px 36px;text-align:center;font-size:.77rem;color:#9ca3af;border-top:1px solid #e8eef5}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:700}
    .badge-green{background:#dcfce7;color:#166534}
    .badge-blue{background:#dbeafe;color:#1e40af}
    @media(max-width:500px){.meta-grid{grid-template-columns:1fr}.body{padding:20px 18px}.hdr{padding:22px 18px}}
  </style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="hdr">
      <div class="hdr-title">🎓 أكاديمية عارم</div>
      <div class="hdr-sub">${isTeacher ? 'كشف مستحقات مالية' : 'فاتورة رسوم دراسية'} — ${periodLabel(invoice.billing_period)}</div>
    </div>
    <div class="body">
      <div class="meta-grid">
        <div class="meta-box">
          <div class="meta-lbl">الاسم</div>
          <div class="meta-val">${invoice.user_name}</div>
        </div>
        <div class="meta-box">
          <div class="meta-lbl">الفترة</div>
          <div class="meta-val">${periodLabel(invoice.billing_period)}</div>
        </div>
        <div class="meta-box">
          <div class="meta-lbl">عدد الحصص</div>
          <div class="meta-val">${invoice.sessions_count}</div>
        </div>
        <div class="meta-box">
          <div class="meta-lbl">إجمالي الساعات</div>
          <div class="meta-val">${Number(invoice.total_hours).toFixed(2)} ساعة</div>
        </div>
        <div class="meta-box">
          <div class="meta-lbl">السعر / الساعة</div>
          <div class="meta-val">${fmtAmount(invoice.rate_per_hour)} ر.س</div>
        </div>
        <div class="meta-box" style="background:#f0fdf4;border-right-color:#1a7c40">
          <div class="meta-lbl" style="color:#1a7c40">المبلغ الإجمالي</div>
          <div class="meta-val" style="color:#1a7c40;font-size:1.2rem">${fmtAmount(invoice.amount)} ر.س</div>
        </div>
      </div>

      ${items.length > 0 ? `
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>${isTeacher ? 'الطالب' : 'المعلم'}</th>
              <th>المادة</th>
              <th style="text-align:center">المدة</th>
              <th style="text-align:center">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4">الإجمالي</td>
              <td style="text-align:center">${fmtAmount(invoice.amount)} ر.س</td>
            </tr>
          </tfoot>
        </table>
      </div>
      ` : ''}

      ${invoice.notes ? `<p style="background:#fffbeb;border-right:3px solid #f59e0b;padding:12px 16px;border-radius:8px;font-size:.9rem;color:#78350f;margin:0">${invoice.notes}</p>` : ''}
    </div>
    <div class="ftr">أكاديمية عارم للتعليم — aarem.net<br>هذا إشعار تلقائي، يُرجى عدم الرد عليه</div>
  </div>
</div>
</body>
</html>`;
}

export async function sendInvoiceEmail({ invoice, to }) {
  const isTeacher = invoice.type === 'teacher_payout';
  const subject   = isTeacher
    ? `كشف مستحقاتك لشهر ${periodLabel(invoice.billing_period)} — أكاديمية عارم`
    : `فاتورة الرسوم الدراسية لشهر ${periodLabel(invoice.billing_period)} — أكاديمية عارم`;

  const r = new Resend(process.env.RESEND_API_KEY);
  await r.emails.send({ from: FROM, to, subject, html: invoiceHtml(invoice) });
}
