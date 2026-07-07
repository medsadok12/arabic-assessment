import { createClient } from '@supabase/supabase-js';
import { notify }        from '../../../../lib/notify';
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin':  'https://arabic-assessment.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ valid: false, error: 'طلب غير صالح' }, { status: 400, headers: CORS });
  }

  const code = body.code?.trim().toUpperCase();
  const name = body.name?.trim() || null;

  if (!code) {
    return Response.json({ valid: false, error: 'الكود مطلوب' }, { status: 400, headers: CORS });
  }

  const supabase = getClient();

  const { data, error } = await supabase
    .from('assessment_codes')
    .select('id, is_used')
    .eq('code', code)
    .single();

  if (error || !data) {
    return Response.json(
      { valid: false, error: 'عذراً، كود التقييم غير صحيح. يرجى مراجعة إدارة الأكاديمية.' },
      { status: 200, headers: CORS }
    );
  }

  if (data.is_used) {
    return Response.json(
      { valid: false, error: 'هذا الكود مستخدم مسبقاً. يرجى مراجعة إدارة الأكاديمية للحصول على كود جديد.' },
      { status: 200, headers: CORS }
    );
  }

  await supabase
    .from('assessment_codes')
    .update({ is_used: true, used_at: new Date().toISOString(), used_by_name: name })
    .eq('id', data.id);

  await notify('assessment', '📝 طالب بدأ تقييماً', name ? `الطالب: ${name}` : null, { code, name });

  return Response.json({ valid: true }, { status: 200, headers: CORS });
}
