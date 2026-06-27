import { Resend } from 'resend';

const FROM       = 'أكاديمية عارم <noreply@aarem.net>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'gandouzimohamed9@gmail.com';

function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
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

  const { error } = await resend().emails.send({
    from:    FROM,
    to,
    subject: `دعوة لمقابلة وظيفية — ${dateStr} الساعة ${startTime}`,
    html,
  });
  if (error) throw new Error(error.message);
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

  const { error } = await resend().emails.send({
    from:    FROM,
    to,
    subject: 'شكراً لتقديمك — أكاديمية عارم',
    html,
  });
  if (error) throw new Error(error.message);
}

export async function sendSessionEmail({ to, studentName, teacherName, sessionDate, startTime, durationMinutes, subject, reminderType }) {
  const is24h    = reminderType === '24h';
  const is30min  = reminderType === '30min';
  const subtitle = is24h  ? 'تذكير: حصتك غداً'
                 : is30min ? 'تذكير: حصتك بعد 30 دقيقة'
                 : 'موعد حصتك القادمة';
  const intro    = is24h
    ? `تذكيرٌ بأن لديك حصة <strong>غداً</strong>، <strong>${studentName}</strong>. إليك التفاصيل:`
    : is30min
      ? `تذكير: حصتك ستبدأ <strong>خلال 30 دقيقة</strong>، <strong>${studentName}</strong>. استعدّ!`
      : `تمّ جدولة حصة جديدة لك، <strong>${studentName}</strong>. إليك التفاصيل:`;
  const emailSubject = is24h
    ? `⏰ تذكير: حصتك غداً مع ${teacherName} الساعة ${startTime}`
    : is30min
      ? `🔔 تذكير: حصتك بعد 30 دقيقة مع ${teacherName}`
      : `📅 حصتك مع ${teacherName} — ${sessionDate} الساعة ${startTime}`;

  const html = baseHtml(`
    <div class="card">
      <div class="hdr">
        <h1>🎓 أكاديمية عارم للتعليم</h1>
        <p>${subtitle}</p>
      </div>
      <div class="body">
        <p>السلام عليكم ورحمة الله وبركاته،</p>
        <p>${intro}</p>
        <div class="info">
          ${subject ? `<div class="info-row"><span class="info-lbl">📚 الموضوع</span><span>${subject}</span></div>` : ''}
          <div class="info-row"><span class="info-lbl">👤 المعلم</span><span>${teacherName}</span></div>
          <div class="info-row"><span class="info-lbl">📅 التاريخ</span><span>${sessionDate}</span></div>
          <div class="info-row"><span class="info-lbl">⏰ الوقت</span><span>${startTime}</span></div>
          <div class="info-row"><span class="info-lbl">⏱️ المدة</span><span>${durationMinutes} دقيقة</span></div>
        </div>
        <p class="note">سيتواصل معك المعلم بخصوص رابط الحصة. نتمنى لك حصة مثمرة!</p>
      </div>
      <div class="ftr">أكاديمية عارم للتعليم — جميع الحقوق محفوظة</div>
    </div>
  `);

  const { error } = await resend().emails.send({ from: FROM, to, subject: emailSubject, html });
  if (error) throw new Error(error.message);
}

export async function sendApplicationConfirmationEmail({ to, candidateName, specialty }) {
  const html = baseHtml(`
    <div class="card">
      <div class="hdr">
        <h1>🎓 أكاديمية عارم للتعليم</h1>
        <p>تأكيد استلام طلب الترشح</p>
      </div>
      <div class="body">
        <p>السلام عليكم ورحمة الله وبركاته،</p>
        <p>شكراً جزيلاً <strong>${candidateName}</strong> على اهتمامك بالانضمام إلى فريق <strong>أكاديمية عارم</strong>. يسعدنا إخبارك بأنّنا استلمنا طلبك بنجاح.</p>
        <div class="info">
          <div class="info-row"><span class="info-lbl">📋 التخصص</span><span>${specialty || '—'}</span></div>
          <div class="info-row"><span class="info-lbl">📌 حالة الطلب</span><span>قيد المراجعة</span></div>
        </div>
        <p>سيقوم فريقنا بمراجعة ملفك والتواصل معك في أقرب وقت ممكن عبر البريد الإلكتروني أو الواتساب.</p>
        <p class="note">إذا كان لديك أي استفسار يمكنك التواصل معنا مباشرةً عبر <a href="https://api.whatsapp.com/send/?phone=447400755914" style="color:#1a7c40;font-weight:700">واتساب الأكاديمية</a>.</p>
      </div>
      <div class="ftr">أكاديمية عارم للتعليم — جميع الحقوق محفوظة</div>
    </div>
  `);

  const { error } = await resend().emails.send({
    from:    FROM,
    to,
    subject: '✅ وصل طلبك — أكاديمية عارم',
    html,
  });
  if (error) throw new Error(error.message);
}

export async function sendTeacherInviteEmail({ to, teacherName, inviterName, sessionDate, startTime, durationMinutes, subject }) {
  const html = baseHtml(`
    <div class="card">
      <div class="hdr">
        <h1>🎓 أكاديمية عارم للتعليم</h1>
        <p>دعوة لحضور حصة دراسية</p>
      </div>
      <div class="body">
        <p>السلام عليكم ورحمة الله وبركاته،</p>
        <p>يسعدنا إعلامك يا <strong>${teacherName}</strong> بأن زميلك <strong>${inviterName}</strong> يدعوك لحضور الحصة التالية:</p>
        <div class="info">
          ${subject ? `<div class="info-row"><span class="info-lbl">📚 الموضوع</span><span>${subject}</span></div>` : ''}
          <div class="info-row"><span class="info-lbl">👨‍🏫 صاحب الحصة</span><span>${inviterName}</span></div>
          <div class="info-row"><span class="info-lbl">📅 التاريخ</span><span>${sessionDate}</span></div>
          <div class="info-row"><span class="info-lbl">⏰ الوقت</span><span>${startTime}</span></div>
          <div class="info-row"><span class="info-lbl">⏱️ المدة</span><span>${durationMinutes} دقيقة</span></div>
        </div>
        <p>يمكنك قبول أو رفض الدعوة من لوحة تحكمك في <a href="https://aarem.net/teacher" style="color:#185FA5;font-weight:700">منصة أكاديمية عارم</a>.</p>
        <p class="note">سيشاركك الزميل رابط الحصة فور انطلاقها.</p>
      </div>
      <div class="ftr">أكاديمية عارم للتعليم — جميع الحقوق محفوظة</div>
    </div>
  `);

  const { error } = await resend().emails.send({
    from:    FROM,
    to,
    subject: `👥 دعوة من ${inviterName} لحضور حصة — ${sessionDate} الساعة ${startTime}`,
    html,
  });
  if (error) throw new Error(error.message);
}

export async function sendTeacherDeclineEmail({ to, ownerName, inviteeName, sessionDate, startTime, subject }) {
  const html = baseHtml(`
    <div class="card">
      <div class="hdr">
        <h1>🎓 أكاديمية عارم للتعليم</h1>
        <p>اعتذار عن حضور الحصة</p>
      </div>
      <div class="body">
        <p>السلام عليكم ورحمة الله وبركاته،</p>
        <p>نُفيدك يا <strong>${ownerName}</strong> بأن الزميل <strong>${inviteeName}</strong> اعتذر عن حضور الحصة التالية لارتباطات أخرى:</p>
        <div class="info">
          ${subject ? `<div class="info-row"><span class="info-lbl">📚 الموضوع</span><span>${subject}</span></div>` : ''}
          <div class="info-row"><span class="info-lbl">📅 التاريخ</span><span>${sessionDate}</span></div>
          <div class="info-row"><span class="info-lbl">⏰ الوقت</span><span>${startTime}</span></div>
        </div>
        <p class="note">يمكنك دعوة زميل آخر من لوحة التحكم.</p>
      </div>
      <div class="ftr">أكاديمية عارم للتعليم — جميع الحقوق محفوظة</div>
    </div>
  `);

  const { error } = await resend().emails.send({
    from:    FROM,
    to,
    subject: `❌ ${inviteeName} اعتذر عن حضور حصة ${sessionDate}`,
    html,
  });
  if (error) throw new Error(error.message);
}

export async function sendMissingRecordingAlert({ teacherName, teacherEmail, studentName, sessionDate, startTime, subject, notes }) {
  const html = baseHtml(`
    <div class="card">
      <div class="hdr" style="background:linear-gradient(135deg,#7f1d1d 0%,#b91c1c 100%)">
        <h1>🎓 أكاديمية عارم للتعليم</h1>
        <p>⚠️ تنبيه: حصة أُنهيت بدون رابط تسجيل</p>
      </div>
      <div class="body">
        <p style="background:#fef2f2;border-right:4px solid #b91c1c;padding:14px 18px;border-radius:10px;color:#7f1d1d;font-weight:700;font-size:1rem">
          ⚠️ أُنهيت حصة دراسية دون توفير رابط التسجيل — يُرجى المتابعة مع المعلم.
        </p>
        <div class="info">
          <div class="info-row"><span class="info-lbl">👨‍🏫 المعلم</span><span>${teacherName} &lt;${teacherEmail}&gt;</span></div>
          <div class="info-row"><span class="info-lbl">👤 الطالب</span><span>${studentName}</span></div>
          ${subject ? `<div class="info-row"><span class="info-lbl">📚 الموضوع</span><span>${subject}</span></div>` : ''}
          <div class="info-row"><span class="info-lbl">📅 التاريخ</span><span>${sessionDate}</span></div>
          <div class="info-row"><span class="info-lbl">⏰ الوقت</span><span>${startTime}</span></div>
        </div>
        ${notes ? `
        <div style="background:#fffbeb;border-right:4px solid #d97706;border-radius:10px;padding:14px 18px;margin:18px 0">
          <div style="font-weight:800;color:#92400e;margin-bottom:6px">💬 سبب / ملاحظة المعلم:</div>
          <div style="color:#451a03;font-size:.93rem;line-height:1.75">${notes}</div>
        </div>` : `
        <p style="color:#dc2626;font-weight:700">❗ لم يُذكر أي سبب من قِبل المعلم.</p>`}
        <p class="note">يُرجى التواصل مع المعلم لمتابعة توفير رابط التسجيل وإرساله للطالب.</p>
      </div>
      <div class="ftr">أكاديمية عارم للتعليم — نظام الإشعارات الفورية</div>
    </div>
  `);

  const { error } = await resend().emails.send({
    from:    FROM,
    to:      ADMIN_EMAIL,
    subject: `⚠️ تنبيه: حصة بدون تسجيل — ${teacherName} / ${studentName} (${sessionDate})`,
    html,
  });
  if (error) throw new Error(error.message);
}

export async function sendWelcomeEmail({ to, name, password }) {
  const html = baseHtml(`
    <div class="card">
      <div class="hdr">
        <h1>🎓 أكاديمية عارم للتعليم</h1>
        <p>مرحباً بك في منظومة الإدارة</p>
      </div>
      <div class="body">
        <p>السلام عليكم ورحمة الله وبركاته،</p>
        <p>يسعدنا ترحيبك <strong>${name}</strong> في فريق <strong>أكاديمية عارم</strong> بصفة مشرف مساعد. يمكنك الدخول إلى لوحة التحكم باستخدام البيانات التالية:</p>
        <div class="info">
          <div class="info-row"><span class="info-lbl">🔗 رابط المنصة</span><span><a href="https://aarem.net" style="color:#185FA5">aarem.net</a></span></div>
          <div class="info-row"><span class="info-lbl">📧 البريد الإلكتروني</span><span dir="ltr">${to}</span></div>
          <div class="info-row"><span class="info-lbl">🔑 كلمة المرور المؤقتة</span><span dir="ltr" style="font-family:monospace;letter-spacing:.05em;font-weight:800">${password}</span></div>
        </div>
        <p style="color:#b91c1c;font-weight:700;background:#fff5f5;padding:12px 16px;border-radius:10px;border-right:4px solid #b91c1c">
          ⚠️ يُرجى تغيير كلمة المرور فور أول تسجيل دخول لحماية حسابك.
        </p>
        <p class="note">في حال وجود أي استفسار أو مشكلة في الدخول، تواصل مع مدير الأكاديمية مباشرةً.</p>
      </div>
      <div class="ftr">أكاديمية عارم للتعليم — جميع الحقوق محفوظة</div>
    </div>
  `);

  const { error } = await resend().emails.send({
    from:    FROM,
    to,
    subject: '🎓 مرحباً بك في أكاديمية عارم — بيانات دخولك',
    html,
  });
  if (error) throw new Error(error.message);
}
