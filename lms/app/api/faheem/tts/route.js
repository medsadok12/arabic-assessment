export const dynamic = 'force-dynamic';

import { createClient } from '../../../../lib/supabase-server';

export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const text = (searchParams.get('t') ?? '').trim().slice(0, 200);
  if (!text) return new Response('', { status: 400 });

  // Google Translate TTS — high-quality Arabic, no API key needed
  const url =
    `https://translate.google.com/translate_tts` +
    `?ie=UTF-8&tl=ar&client=tw-ob&ttsspeed=0.85&q=${encodeURIComponent(text)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
        'Accept-Language': 'ar,en;q=0.9',
      },
    });

    if (!res.ok) return new Response(null, { status: 502 });

    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: {
        'Content-Type':  'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
