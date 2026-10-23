import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { voiceSample } from '../../../../lib/faheem-tts';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/* عيّنة صوت مرشّح لفهيم: ?v=<id> من القائمة الثابتة في lib/faheem-voices.js فقط
   (لا نص ولا طبقة من الطلب)، وتُولَّد مرة واحدة ثم تُخدم من التخزين */
export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: allowed } = await admin.rpc('ai_rate_check', {
    p_user: user.id, p_bucket: 'tts', p_per_minute: 60, p_per_day: 600,
  });
  if (allowed === false) return new Response(null, { status: 429 });

  const id = new URL(req.url).searchParams.get('v') || '';
  const out = await voiceSample(id, admin);
  if (!out) return new Response(null, { status: id ? 502 : 400 });
  return new Response(out.buf, { headers: { 'Content-Type': out.type, 'Cache-Control': 'private, max-age=3600' } });
}
