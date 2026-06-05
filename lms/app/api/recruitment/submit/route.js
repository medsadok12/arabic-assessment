import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { notify }            from '../../../../lib/notify';

export async function POST(req) {
  try {
    const { name, email, phone, experience, specialty, notes, cvBase64, cvFilename } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'الاسم والبريد الإلكتروني مطلوبان' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Encode CV as JSON in the existing cv_path column — no schema changes required
    const cvPath = cvBase64
      ? JSON.stringify({ filename: cvFilename ?? 'cv.pdf', base64: cvBase64 })
      : null;

    const { error } = await supabase
      .from('recruitment_applications')
      .insert({ name, email, phone, experience, specialty, notes, cv_path: cvPath });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'جدول الطلبات غير موجود. يرجى تشغيل SQL التهيئة من لوحة /bogga ثم المحاولة مجدداً.',
        }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await notify('recruitment', 'طلب توظيف جديد', `${name} — ${specialty ?? ''}`.trimEnd().replace(/—\s*$/, '').trim(), { name, email, phone, specialty });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
