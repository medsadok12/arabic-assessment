import nodemailer from 'nodemailer';

export const config = { api: { bodyParser: { sizeLimit: '50kb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body ?? {};
  if (!message || !String(message).trim()) return res.status(400).json({ error: 'empty' });

  const safe = String(message).replace(/[<>]/g, '').trim().slice(0, 1000);

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"موقع عارم أكاديمي" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: '📩 رسالة جديدة من موقع أكاديمية عارم',
    html: `
      <div dir="rtl" style="font-family:Arial;max-width:500px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0a0528,#1a1052);color:#d4952a;padding:20px 24px;font-size:1.2rem;font-weight:bold">
          📩 رسالة جديدة من زوار الموقع
        </div>
        <div style="padding:24px;background:#fff;font-size:1rem;line-height:1.8;color:#222;white-space:pre-wrap">${safe}</div>
        <div style="background:#f5f5f0;padding:12px 24px;font-size:0.8rem;color:#888">
          أُرسلت عبر فقاعة التواصل في assessment.aarem.net
        </div>
      </div>`,
  });

  return res.status(200).json({ ok: true });
}
