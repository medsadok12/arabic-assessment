import { randomBytes } from 'crypto';
import { createAdminClient } from '../../../lib/supabase-admin';

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

export async function POST() {
  const supabase = createAdminClient();

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[generate-teacher-code] SUPABASE_SERVICE_ROLE_KEY is not set');
    return Response.json({ error: 'Server misconfiguration: missing service role key' }, { status: 500 });
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { data, error } = await supabase
      .from('teacher_invitation_codes')
      .insert({ code })
      .select('code')
      .single();

    if (!error && data?.code) return Response.json({ code: data.code });

    if (error) {
      const isDuplicate = error.message.includes('unique') || error.message.includes('duplicate') || error.code === '23505';
      if (!isDuplicate) {
        console.error('[generate-teacher-code] Supabase insert error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
      // duplicate → retry
    } else {
      // data is null with no error — RLS or table issue
      console.error('[generate-teacher-code] Insert returned no data and no error');
      return Response.json({ error: 'لم يتم حفظ الكود — تحقق من جدول teacher_invitation_codes وصلاحيات RLS' }, { status: 500 });
    }
  }

  return Response.json({ error: 'فشل توليد كود فريد، حاول مجدداً' }, { status: 500 });
}
