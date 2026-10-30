import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { synthesize, TTS_MAX_CHARS } from '../../../../lib/faheem-tts';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/* صوت فهيم: ?t=النص — و&c=1 للنصوص المشتركة بين الطلاب (كلمة اليوم) فتُخزَّن دائماً.
   المزوّدون وترتيبهم في lib/faheem-tts.js */
export async function GET(req) {
  const t0 = Date.now();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // Per-user TTS rate limit (own bucket — more generous than generation). Fails open.
  const admin = createAdminClient();
  const { data: ttsAllowed } = await admin.rpc('ai_rate_check', {
    p_user: user.id, p_bucket: 'tts', p_per_minute: 60, p_per_day: 600,
  });
  if (ttsAllowed === false) return new Response(null, { status: 429 });

  const { searchParams } = new URL(req.url);
  const text = (searchParams.get('t') ?? '').trim().slice(0, TTS_MAX_CHARS);
  if (!text) return new Response('', { status: 400 });

  const pre = Date.now() - t0; // التحقق من الطالب + الحدّ، قبل توليد الصوت
  const out = await synthesize(text, { admin, shared: searchParams.get('c') === '1' });
  if (!out) return new Response(null, { status: 502 });
  console.log(`[tts] ⏱ pre=${pre}ms total=${Date.now() - t0}ms chars=${text.length}`);

  return new Response(out.buf, {
    headers: {
      'Content-Type': out.type,
      // قد يحمل الصوت اسم الطفل — متصفحه فقط يخزّنه
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
