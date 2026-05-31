import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// حروف آمنة: تجنّب الأحرف المتشابهة (0/O, 1/I/L)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode() {
  const bytes = randomBytes(8);
  const part  = Array.from(bytes)
    .map(b => CHARS[b % CHARS.length])
    .join('')
    .slice(0, 8);
  return `TEACH-${part}`;
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // service role key bypasses RLS; anon key works if RLS is disabled on the table
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST() {
  const supabase = getClient();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { data, error } = await supabase
      .from('teacher_invitation_codes')
      .insert({ code })
      .select('code')
      .single();

    if (!error && data?.code) return Response.json({ code: data.code });

    if (error) {
      const isDuplicate =
        error.message.includes('unique') ||
        error.message.includes('duplicate') ||
        error.code === '23505';
      if (!isDuplicate) {
        console.error('[generate-teacher-code] Supabase error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
      // تضارب في الكود → أعد المحاولة
    } else {
      // data = null بدون خطأ ← RLS يمنع الإدراج
      console.error('[generate-teacher-code] Insert blocked silently — RLS may be active');
      return Response.json(
        { error: 'الجدول يرفض الحفظ — شغّل SQL الإعداد في Supabase أولاً' },
        { status: 500 },
      );
    }
  }

  return Response.json({ error: 'فشل توليد كود فريد، حاول مجدداً' }, { status: 500 });
}
