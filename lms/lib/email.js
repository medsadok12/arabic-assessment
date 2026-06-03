import nodemailer from 'nodemailer';

function transport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function baseHtml(content) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{margin:0;padding:0;background:#f4f7fc;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl}
    .wrap{max-width:580px;margin:0 auto;padding:32px 16px}
    .card{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 28px rgba(24,95,165,.13)}
    .hdr{background:linear-gradient(135deg,#1a3a6b 0%,#185FA5 100%);padding:30px 36px;text-align:center}
    .hdr h1{color:#fff;margin:0 0 6px;font-size:1.45rem;font-weight:800;letter-spacing:-.01em}
    .hdr p{color:rgba(255,255,255,.78);margin:0;font-size:.92rem}
    .body{padding:30px 36px}
    .body p{color:#2d3748;font-size:.97rem;line-height:1.85;margin:0 0 14px}
    .info{background:#eef5ff;border-radius:12px;padding:20px 22px;margin:22px 0;border-right:4px solid #185FA5}
    .info-row{display:flex;gap:12px;align-items:baseline;margin-bottom:9px;font-size:.94rem;color:#1a2d4a}
    .info-row:last-child{margin-bottom:0}
    .info-lbl{font-weight:800;min-width:128px;color:#185FA5;flex-shrink:0}
    .actions{margin:26px 0;display:flex;flex-direction:column;gap:13px}
    .btn{display:block;text-align:center;padding:14px 28px;border-radius:11px;text-decoration:none;font-weight:800;font-size:.97rem;letter-spacing:.01em}
    .btn-green{background:#1a7c40;color:#fff}
    .btn-amber{background:#9a5200;color:#fff}
    .btn-red{background:#b91c1c;color:#fff}
    .note{font-size:.83rem;color:#6b7280;line-height:1.7;margin:0}
    .ftr{background:#f4f7fc;padding:18px 36px;text-align:center;font-size:.77rem;color:#9ca3af;border-top:1px solid #e8eef5}
  </style>
</head>
<body><div class="wrap">${content}</div></body>
</html>`;
}

export async function sendInterviewEmail({
  to, candidateName, interviewerName, dateStr, startTime,
  confirmUrl, rescheduleUrl, rejectUrl,
}) {
  const html = baseHtml(`
    <div class="card">
      <div class="hdr">
        <h1>🎓 أكاديمية عارم للتعليم</h1>
        <p>دعوة لإجراء مقابلة وظيفية</p>
      </div>
      <div class="body">
        <p>السلام عليكم ورحمة الله وبركاته،</p>
        <p>نسعد بإخبارك، <strong>${candidateName}</strong>، بأنه تمّ اختيار ملفّك الوظيفي للانتقال إلى مرحلة المقابلة الشخصية. نتطلع إلى التعرف عليك عن قرب.</p>
        <div class="info">
          <div class="info-row"><span class="info-lbl">📅 تاريخ المقابلة</span><span>${dateStr}</span></div>
          <div class="info-row"><span class="info-lbl">⏰ ساعة الانطلاق</span><span>${startTime}</span></div>
          <div class="info-row"><span class="info-lbl">👤 المقابِل</span><span>${interviewerName}</span></div>
        </div>
        <p>يُرجى تأكيد حضورك أو إعلامنا في حال رغبتك في تعديل الموعد، بالضغط على أحد الخيارات أدناه:</p>
        <div class="actions">
          <a href="${confirmUrl}" class="btn btn-green">✅ &nbsp; موافق على الموعد</a>
          <a href="${rescheduleUrl}" class="btn btn-amber">📅 &nbsp; أطلب تعديل الوقت</a>
          <a href="${rejectUrl}" class="btn btn-red">❌ &nbsp; أعتذر عن المقابلة</a>
        </div>
        <p class="note">يُرجى الرد في أقرب وقت ممكن حتى يتسنى لنا ترتيب جدول المقابلات. إذا كنت تعتقد أن هذا البريد وصل إليك خطأً، يُرجى التواصل معنا مباشرةً.</p>
      </div>
      <div class="ftr">أكاديمية عارم للتعليم — جميع الحقوق محفوظة</div>
    </div>
  `);

  await transport().sendMail({
    from:    `"أكاديمية عارم" <${process.env.GMAIL_USER}>`,
    to,
    subject: `دعوة لمقابلة وظيفية — ${dateStr} الساعة ${startTime}`,
    html,
  });
}

export async function sendRejectionEmail({ to, candidateName }) {
  const html = baseHtml(`
    <div class="card">
      <div class="hdr">
        <h1>🎓 أكاديمية عارم للتعليم</h1>
        <p>نتيجة الطلب الوظيفي</p>
      </div>
      <div class="body">
        <p>السلام عليكم ورحمة الله وبركاته،</p>
        <p>شكراً جزيلاً لتقديمك طلبك للانضمام إلى فريق <strong>أكاديمية عارم</strong>، <strong>${candidateName}</strong>.</p>
        <p>بعد مراجعة دقيقة لجميع الطلبات الواردة، نأسف لإبلاغك بأنه تمّ اختيار مرشحين آخرين تتوافق ملفاتهم بشكل أوسع مع متطلبات المرحلة الحالية.</p>
        <p>نثمّن اهتمامك بالأكاديمية وحرصك على الانضمام إلى فريقها المتميز، ونتمنى لك دوام التوفيق والنجاح في مسيرتك المهنية.</p>
        <p class="note">يسعدنا الاطلاع على ملفك مجدداً في حال توفر فرص مستقبلية تتناسب مع خبراتك ومؤهلاتك.</p>
      </div>
      <div class="ftr">أكاديمية عارم للتعليم — جميع الحقوق محفوظة</div>
    </div>
  `);

  await transport().sendMail({
    from:    `"أكاديمية عارم" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'شكراً لتقديمك — أكاديمية عارم',
    html,
  });
}
