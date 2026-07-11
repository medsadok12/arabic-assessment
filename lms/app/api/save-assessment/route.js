import { createAdminClient, fetchAllUsers } from '../../../lib/supabase-admin';

const CORS = {
  'Access-Control-Allow-Origin':  'https://assessment.aarem.net',
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
    const emailLc  = String(email).trim().toLowerCase();

    // Best-effort: link the result to a registered LMS account if one exists.
    // The insert is NEVER gated on this — most assessment-takers are not yet
    // registered LMS users, and their results (with email) must still be saved.
    let matchedUser = null;
    try {
      const users = await fetchAllUsers(supabase);
      matchedUser = users.find(u => u.email?.toLowerCase() === emailLc) || null;
    } catch (e) {
      console.error('[save-assessment] user lookup failed (non-fatal):', e.message);
    }

    // Save to assessments table — email is always stored
    const { error } = await supabase.from('assessments').insert({
      user_id:       matchedUser?.id ?? null,
      student_name:  studentName || matchedUser?.user_metadata?.full_name || 'غير معروف',
      student_email: emailLc,
      level:         finalLevel,
      score:         Math.round((overallScore ?? 0) * 10) / 10,
      completed_at:  new Date().toISOString(),
    });

    if (error)
      return Response.json({ ok: false, error: error.message }, { status: 500, headers: CORS });

    return Response.json({ ok: true, linked: Boolean(matchedUser) }, { headers: CORS });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500, headers: CORS });
  }
}
