import nodemailer from 'nodemailer';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

function sanitize(val, maxLen = 100) {
  return String(val ?? '').replace(/[<>&"'`]/g, '').trim().slice(0, maxLen);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { parentEmail, studentName: rawName, studentAge: rawAge, studentType, pdfBase64, overallScore, finalLevel, bySkill } = req.body;
    const studentName = sanitize(rawName);
    const studentAge  = sanitize(rawAge, 10);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    const dateStr = new Date().toLocaleDateString('ar-SA-u-nu-latn', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const skillsTable = bySkill ? Object.values(bySkill).map(s => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-size: 13px;">${s.name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: ${s.score >= 80 ? '#2e7d32' : s.score >= 60 ? '#e65100' : '#c62828'}; font-size: 13px; text-align: center;">
          ${Math.round(s.score)}%
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-size: 13px; text-align: center; color: #666;">
          ${s.correct}/${s.total}
        </td>
      </tr>
    `).join('') : '';

    function buildHTML(isParent) {
      return `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:20px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">

            <div style="background:linear-gradient(135deg,#1a1052,#2d1b69);color:white;padding:32px;text-align:center;">
              <div style="font-size:44px;margin-bottom:10px;color:#d4952a;font-family:serif;">ع</div>
              <h1 style="margin:0 0 6px;font-size:22px;font-weight:900;">عارم أكاديمي</h1>
              <p style="margin:0;opacity:0.9;font-size:14px;">AREM ACADEMY | تعليم اللغة العربية</p>
            </div>

            <div style="padding:30px;">
              <p style="font-size:16px;color:#333;line-height:1.8;margin-bottom:16px;">
                السلام عليكم ورحمة الله وبركاته،
              </p>

              ${isParent ? `
              <p style="font-size:15px;color:#555;line-height:1.8;margin-bottom:20px;">
                نشكركم على ثقتكم بأكاديمية عارم. يسعدنا إرسال تقرير تقييم اللغة العربية
                للطالب/ة <strong style="color:#1a1052;">${studentName}</strong>.
                يمكنكم الاطلاع على التقرير التفصيلي الكامل في الملف المرفق.
              </p>
              ` : `
              <p style="font-size:15px;color:#555;line-height:1.8;margin-bottom:20px;">
                هذا إشعار بتقييم جديد للطالب/ة <strong style="color:#1a1052;">${studentName}</strong>.
                التقرير التفصيلي مرفق أدناه.
              </p>
              `}

              <div style="background:#e8eaf6;border-radius:10px;padding:20px;margin-bottom:20px;">
                <h3 style="color:#1a1052;margin:0 0 14px;font-size:15px;">ملخص النتائج</h3>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:7px 0;color:#555;font-size:14px;">الطالب/ة</td>
                    <td style="padding:7px 0;font-weight:bold;color:#1a1052;font-size:14px;">${studentName}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#555;font-size:14px;">العمر</td>
                    <td style="padding:7px 0;font-weight:bold;color:#1a1052;font-size:14px;">${studentAge} سنة</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#555;font-size:14px;">النتيجة الإجمالية</td>
                    <td style="padding:7px 0;font-weight:bold;color:#1a1052;font-size:18px;">${Math.round(overallScore)}%</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#555;font-size:14px;">المستوى النهائي</td>
                    <td style="padding:7px 0;font-weight:bold;color:#1a1052;font-size:14px;">${finalLevel}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#555;font-size:14px;">التاريخ</td>
                    <td style="padding:7px 0;font-weight:bold;color:#1a1052;font-size:14px;">${dateStr}</td>
                  </tr>
                </table>
              </div>

              ${skillsTable ? `
              <div style="margin-bottom:20px;">
                <h3 style="color:#1a1052;margin:0 0 12px;font-size:15px;">تفاصيل المهارات</h3>
                <table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
                  <tr style="background:#f5f7fa;">
                    <th style="padding:10px 12px;text-align:right;font-size:13px;color:#1a1052;">المهارة</th>
                    <th style="padding:10px 12px;font-size:13px;color:#1a1052;">النسبة</th>
                    <th style="padding:10px 12px;font-size:13px;color:#1a1052;">الإجابات</th>
                  </tr>
                  ${skillsTable}
                </table>
              </div>
              ` : ''}

              ${isParent ? `
              <div style="background:#e8f5e9;border-right:4px solid #2e7d32;padding:16px 20px;border-radius:10px;margin-bottom:20px;">
                <p style="margin:0;font-size:14px;color:#1b5e20;line-height:1.7;">
                  شكراً لاختياركم أكاديمية عارم. نتطلع إلى خدمتكم دائماً وتحقيق أفضل النتائج لأبنائنا الطلاب. 💚
                </p>
              </div>
              ` : ''}
            </div>

            <div style="background:#f5f7fa;padding:16px 30px;text-align:center;border-top:1px solid #e0e0e0;">
              <p style="margin:0;color:#9e9e9e;font-size:12px;">
                أكاديمية عارم — gandouzimohamed9@gmail.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const parentMail = {
      from: `أكاديمية عارم 🎓 <${process.env.GMAIL_USER}>`,
      to: parentEmail,
      subject: `تقرير تقييم اللغة العربية — ${studentName}`,
      html: buildHTML(true),
      attachments: [{
        filename: `تقرير_${studentName}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    };

    const adminMail = {
      from: `أكاديمية عارم 🎓 <${process.env.GMAIL_USER}>`,
      to: 'gandouzimohamed9@gmail.com',
      subject: `[إدارة] تقييم جديد — ${studentName} — ${Math.round(overallScore)}%`,
      html: buildHTML(false),
      attachments: [{
        filename: `تقرير_${studentName}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    };

    // كل نسخة تُرسَل باستقلالية عن الأخرى — فشل نسخة المعلم يجب ألا يُظهر
    // للأهل أن التقرير لم يصلهم، ونسخة المعلم تستحق محاولة إعادة واحدة قبل
    // اعتبارها فاشلة نهائياً (بريد داخلي، لا ضرر من محاولة إضافية سريعة).
    const [parentResult, adminResult] = await Promise.allSettled([
      transporter.sendMail(parentMail),
      transporter.sendMail(adminMail),
    ]);

    let parentSent = parentResult.status === 'fulfilled';
    let adminSent  = adminResult.status === 'fulfilled';

    if (!parentSent) console.error('Email error (parent):', parentResult.reason);
    if (!adminSent) {
      console.error('Email error (admin), retrying once:', adminResult.reason);
      try {
        await transporter.sendMail(adminMail);
        adminSent = true;
      } catch (retryErr) {
        console.error('Email error (admin retry failed):', retryErr);
      }
    }

    return res.status(parentSent ? 200 : 500).json({
      success: parentSent,
      parentSent,
      adminSent,
    });

  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ success: false, parentSent: false, adminSent: false, error: error.message });
  }
}
