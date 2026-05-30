import { createAdminClient } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part  = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
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
