// بروكسي بنفس الأصل لمكوّنات العميل (مثل SmartFAQ.jsx) التي لا يمكنها جلب
// مشروع Vercel آخر مباشرة من المتصفح بأمان (CORS) — يعيد تمرير نفس البيانات
// من lib/assessment-meta.js بلا أي منطق إضافي.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAssessmentMeta } from '../../../lib/assessment-meta';

export async function GET() {
  const meta = await getAssessmentMeta();
  return NextResponse.json(meta);
}
