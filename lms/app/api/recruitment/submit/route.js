import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export async function POST(req) {
  try {
    const { name, email, phone, experience, specialty, notes, cvBase64, cvFilename } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'الاسم والبريد الإلكتروني مطلوبان' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('recruitment_applications')
      .insert({
        name,
        email,
        phone,
        experience,
        specialty,
        notes,
        cv_filename: cvFilename ?? null,
        cv_base64:   cvBase64  ?? null,
      });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'جدول الطلبات غير موجود. يرجى تشغيل SQL التهيئة من لوحة /bogga ثم المحاولة مجدداً.',
        }, { status: 503 });
      }
      if (error.code === '42703') {
        return NextResponse.json({
          error: 'قاعدة البيانات تحتاج تحديثاً. افتح /bogga ← إعداد وشغّل SQL التهيئة المحدّث ثم أعد المحاولة.',
        }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
