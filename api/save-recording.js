import nodemailer from 'nodemailer';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

function sanitize(val, max = 100) {
  return String(val ?? '').replace(/[<>&"'`]/g, '').trim().slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { audioBase64, studentName: rawName, questionId } = req.body;
    const studentName = sanitize(rawName);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)
      return res.status(500).json({ error: 'Email not configured' });

    const base64Data  = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const audioBuffer = Buffer.from(base64Data, 'base64');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });

    const dateStr = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    await transporter.sendMail({
      from:    `عارم أكاديمي <${process.env.GMAIL_USER}>`,
      to:      process.env.GMAIL_USER,
      subject: `[تسجيل صوتي] ${studentName} — ${dateStr}`,
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;padding:24px;background:#f5f7fa;">
          <div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#1a1052,#2d1b69);color:white;padding:24px;text-align:center;">
              <div style="font-size:36px;color:#d4952a;font-family:serif;margin-bottom:6px;">ع</div>
              <h2 style="margin:0;font-size:18px;">تسجيل صوتي جديد</h2>
            </div>
            <div style="padding:24px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#666;font-size:14px;">الطالب</td>
                    <td style="padding:8px 0;font-weight:bold;color:#1a1052;">${studentName}</td></tr>
                <tr><td style="padding:8px 0;color:#666;font-size:14px;">السؤال</td>
                    <td style="padding:8px 0;font-weight:bold;color:#1a1052;">${questionId}</td></tr>
                <tr><td style="padding:8px 0;color:#666;font-size:14px;">التاريخ</td>
                    <td style="padding:8px 0;font-weight:bold;color:#1a1052;">${dateStr}</td></tr>
              </table>
              <p style="margin-top:16px;color:#555;font-size:13px;">التسجيل الصوتي مرفق — يمكنك حفظه في Google Drive مباشرة من Gmail.</p>
            </div>
          </div>
        </div>
      `,
      attachments: [{
        filename:    `تسجيل_${studentName}_${Date.now()}.webm`,
        content:     audioBuffer,
        contentType: 'audio/webm',
      }],
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Save recording error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
