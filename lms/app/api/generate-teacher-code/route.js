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

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { data, error } = await supabase
      .from('teacher_invitation_codes')
      .insert({ code })
      .select('code')
      .single();

    if (!error) return Response.json({ code: data.code });
    if (!error.message.includes('unique') && !error.message.includes('duplicate')) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'فشل توليد كود فريد، حاول مجدداً' }, { status: 500 });
}
