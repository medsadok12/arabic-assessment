import { createClient } from '@supabase/supabase-js';
import { nextSequentialCode } from '../../../lib/sequential-codes';

export const dynamic = 'force-dynamic';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST() {
  const supabase = getClient();

  // Retry up to 3 times to handle rare race conditions
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: existing, error: fetchErr } = await supabase
      .from('teacher_invitation_codes')
      .select('code');

    if (fetchErr) return Response.json({ error: fetchErr.message }, { status: 500 });

    const code = nextSequentialCode('T', existing ?? []);

    const { data, error } = await supabase
      .from('teacher_invitation_codes')
      .insert({ code })
      .select('code')
      .single();

    if (!error && data?.code) return Response.json({ code: data.code });
    if (error?.code === '23505') continue; // duplicate → retry with fresh read
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ error: 'الجدول يرفض الحفظ — تحقق من إعداد Supabase' }, { status: 500 });
  }

  return Response.json({ error: 'فشل توليد الكود، أعد المحاولة' }, { status: 500 });
}
