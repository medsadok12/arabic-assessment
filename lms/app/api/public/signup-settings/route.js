import { createAdminClient } from '../../../../lib/supabase-admin';
import { loadSignupCodes } from '../../../../lib/signup-codes';

export const dynamic = 'force-dynamic';

// التقييم التشخيصي يقرأ هذا الإعداد من نطاقه — مثل validate-student-code
const HEADERS = {
  'Access-Control-Allow-Origin':  'https://assessment.aarem.net',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'no-store',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS });
}

// GET — هل تُعرض خانة الكود؟ { student_code_required, assessment_code_required }
// قيمتان منطقيتان فقط، بلا أي بيانات أخرى. أي خطأ ← الكود مطلوب (السلوك الأصلي).
export async function GET() {
  const settings = await loadSignupCodes(createAdminClient());
  return Response.json(settings, { headers: HEADERS });
}
