import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { heroVoice } from '../../../lib/faheem-tts';
import { heroLine } from '../../../lib/hero-voices';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/* صوت شخصية البطل: ?c=<الشخصية>&k=hello|special|l0|l1 — الجمل من الكتالوج فقط (لا نص حر) */
export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const line = heroLine(searchParams.get('c'), searchParams.get('k'));
  if (!line) return new Response('', { status: 400 });

  const admin = createAdminClient();
  const { data: allowed } = await admin.rpc('ai_rate_check', { p_user: user.id, p_bucket: 'tts', p_per_minute: 60, p_per_day: 600 });
  if (allowed === false) return new Response(null, { status: 429 });

  const out = await heroVoice(line.preset, line.text, admin);
  if (!out) return new Response(null, { status: 502 });
  return new Response(out.buf, { headers: { 'Content-Type': out.type, 'Cache-Control': 'private, max-age=86400' } });
}
