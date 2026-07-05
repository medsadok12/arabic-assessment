import { NextResponse }                      from 'next/server';
import { createAdminClient }               from '../../../../lib/supabase-admin';
import { notify }                          from '../../../../lib/notify';
import { sendApplicationConfirmationEmail } from '../../../../lib/email';

export async function POST(req) {
  try {
    const {
      name, email, phone, experience, specialty, notes,
      cvBase64, cvFilename,
      country, teachingMethod, linkedin,
    } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'الاسم والبريد الإلكتروني مطلوبان' }, { status: 400 });
    }

    // ~7MB base64 ≈ 5MB binary file — reject oversized payloads
    if (cvBase64 && cvBase64.length > 7 * 1024 * 1024) {
      return NextResponse.json({ error: 'حجم ملف الـCV يتجاوز الحد المسموح (5 ميجابايت)' }, { status: 413 });
    }

    const supabase = createAdminClient();

    // Encode CV as JSON in the existing cv_path column — no schema changes required
    const cvPath = cvBase64
      ? JSON.stringify({ filename: cvFilename ?? 'cv.pdf', base64: cvBase64 })
      : null;

    // Combine all extra fields into the notes column (no schema change needed)
    const extraLines = [
      country       ? `🌍 الدولة: ${country}`              : null,
      teachingMethod ? `💻 طريقة التدريس: ${teachingMethod}` : null,
      linkedin      ? `🔗 لينكدإن: ${linkedin}`             : null,
    ].filter(Boolean);

    const fullNotes = [notes?.trim(), ...extraLines].filter(Boolean).join('\n') || null;

    const { error } = await supabase
      .from('recruitment_applications')
      .insert({ name, email, phone, experience, specialty, notes: fullNotes, cv_path: cvPath });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'جدول الطلبات غير موجود. يرجى تشغيل SQL التهيئة من لوحة /bogga ثم المحاولة مجدداً.',
        }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send confirmation email to applicant (best-effort — don't fail the request if it fails)
    sendApplicationConfirmationEmail({ to: email, candidateName: name, specialty }).catch(() => {});

    await notify(
      'recruitment',
      'طلب توظيف جديد',
      `${name} — ${specialty ?? ''}`.trimEnd().replace(/—\s*$/, '').trim(),
      { name, email, phone, specialty, country, teachingMethod },
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
