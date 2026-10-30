import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { voiceSample, grammarSample } from '../../../../lib/faheem-tts';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/* عيّنة صوت مرشّح لفهيم: ?v=<id> من القائمة الثابتة في lib/faheem-voices.js فقط
   (لا نص ولا طبقة من الطلب)، وتُولَّد مرة واحدة ثم تُخدم من التخزين.
   اختبار الإعراب: ?g=<id>&t=<جملة> — جملة الأستاذ بأحد أصوات المقارنة الثابتة (بلا تخزين) */
export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: allowed } = await admin.rpc('ai_rate_check', {
    p_user: user.id, p_bucket: 'tts', p_per_minute: 60, p_per_day: 600,
  });
  if (allowed === false) return new Response(null, { status: 429 });

  const q = new URL(req.url).searchParams;
  const g = q.get('g');
  const id = g || q.get('v') || '';
  const out = g ? await grammarSample(g, q.get('t')) : await voiceSample(id, admin);
  if (!out) return new Response(null, { status: id ? 502 : 400 });
  return new Response(out.buf, { headers: { 'Content-Type': out.type, 'Cache-Control': 'private, max-age=3600' } });
}
