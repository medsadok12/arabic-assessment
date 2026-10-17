import { NextResponse } from 'next/server';

/* رقم النسخة المنشورة (commit) — يُبنى ثابتاً مع كل نشرة ويُخدم من CDN بلا
   استدعاء دالة. PWAInstall يقارنه بالنسخة التي تعمل في التبويب المفتوح، فإن
   اختلفا ظهر شريط «يوجد إصدار جديد» — تبويب فُتح قبل النشر لا يتحدّث وحده
   (درس 2026-10-16: محرر قصص مفتوح منذ الصباح ظل يعمل بالنسخة القديمة بعد الإصلاح). */
export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json({ v: process.env.VERCEL_GIT_COMMIT_SHA || '' });
}
