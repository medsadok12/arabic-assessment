export const dynamic = 'force-dynamic';

import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

/* Escape text for safe embedding inside SSML XML */
function xmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* ── Azure Neural TTS — realistic, human Arabic voice (free tier: 500k chars/mo) ── */
async function azureTTS(text) {
  const key    = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';
  const voice  = process.env.AZURE_SPEECH_VOICE  || 'ar-SA-HamedNeural';
  if (!key) return null;

  const ssml =
    `<speak version='1.0' xml:lang='ar-SA'>` +
    `<voice name='${voice}'>` +
    `<prosody rate='-4%' pitch='+8%'>${xmlEscape(text)}</prosody>` +
    `</voice></speak>`;

  try {
    const res = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type':              'application/ssml+xml',
          'X-Microsoft-OutputFormat':  'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent':                'faheem-tts',
        },
        body: ssml,
      }
    );
    if (!res.ok) {
      console.error('[tts] Azure HTTP', res.status, (await res.text().catch(() => '')).slice(0, 150));
      return null;
    }
    return await res.arrayBuffer();
  } catch (e) {
    console.error('[tts] Azure exception:', e.name, e.message);
    return null;
  }
}

/* ── Google Translate TTS — flat but free, no key. Used as fallback. ── */
async function googleTTS(text) {
  const url =
    `https://translate.google.com/translate_tts` +
    `?ie=UTF-8&tl=ar&client=tw-ob&ttsspeed=0.9&q=${encodeURIComponent(text)}`;
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
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // Per-user TTS rate limit (own bucket — more generous than generation). Fails open.
  const rateAdmin = createAdminClient();
  const { data: ttsAllowed } = await rateAdmin.rpc('ai_rate_check', {
    p_user: user.id, p_bucket: 'tts', p_per_minute: 60, p_per_day: 600,
  });
  if (ttsAllowed === false) return new Response(null, { status: 429 });

  const { searchParams } = new URL(req.url);
  const text = (searchParams.get('t') ?? '').trim().slice(0, 400);
  if (!text) return new Response('', { status: 400 });

  // Azure Neural first (realistic), Google Translate as fallback
  const buf = (await azureTTS(text)) ?? (await googleTTS(text));
  if (!buf) return new Response(null, { status: 502 });

  return new Response(buf, {
    headers: {
      'Content-Type':  'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
