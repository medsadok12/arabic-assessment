import { createAdminClient } from '../../../lib/supabase-admin';

const CORS = {
  'Access-Control-Allow-Origin':  'https://arabic-assessment.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request) {
  try {
    // Verify shared secret — rejects any request not originating from the assessment app
    const secret = process.env.ASSESSMENT_WEBHOOK_SECRET;
    if (!secret || request.headers.get('x-webhook-secret') !== secret) {
      return Response.json({ ok: false }, { status: 401, headers: CORS });
    }

    const { email, studentName, overallScore, finalLevel } = await request.json();

    if (!email || !finalLevel)
      return Response.json({ ok: false }, { status: 400, headers: CORS });

    const supabase = createAdminClient();

    // Find the LMS user by email
    const { data: { user }, error: lookupErr } = await supabase.auth.admin.getUserByEmail(email);
    if (lookupErr || !user)
      return Response.json({ ok: false, reason: 'user_not_found' }, { headers: CORS });

    // Save to assessments table
    const { error } = await supabase.from('assessments').insert({
      user_id:       user.id,
      student_name:  studentName || user.user_metadata?.full_name || 'غير معروف',
      student_email: email,
      level:         finalLevel,
      score:         Math.round((overallScore ?? 0) * 10) / 10,
      completed_at:  new Date().toISOString(),
    });

    if (error)
      return Response.json({ ok: false, error: error.message }, { status: 500, headers: CORS });

    return Response.json({ ok: true }, { headers: CORS });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500, headers: CORS });
  }
}
