import { createClient } from '../../../lib/supabase-server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const Q_SYSTEM = `أنتَ مُولِّدُ أَسْئِلَةٍ تَعْلِيمِيَّةٍ لِلأَطْفَالِ الْعَرَبِ.
بِنَاءً عَلَى سِيَاقِ الْمُحَادَثَةِ، وَلِّدْ سُؤَالاً مُتَعَدِّدَ الْخِيَارَاتِ (4 خِيَارَاتٍ) مُناسِباً لِطِفْلٍ.
اِجْعَلِ السُّؤَالَ قَصِيراً وَمُشَوِّقاً، وَالْخِيَارَاتِ وَاضِحَةً وَمُشَكَّلَةً.
أَخْرِجْ JSON فَقَطْ بِالشَّكْلِ الدَّقِيقِ التَّالِي:
{"q":"السُّؤَالُ","opts":["خ1","خ2","خ3","خ4"],"ans":0}
حَيْثُ "ans" هُوَ فِهْرِسُ الْإِجَابَةِ الصَّحِيحَةِ (0-3).`;

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: 'no key' }, { status: 500 });

  const { context = '' } = await req.json();
  if (!context.trim()) return Response.json({ error: 'no context' }, { status: 400 });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         key,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system:     Q_SYSTEM,
      messages:   [{ role: 'user', content: `السِّيَاقُ: ${context.slice(0, 400)}` }],
    }),
  });

  if (!res.ok) return Response.json({ error: 'upstream' }, { status: 500 });

  const json = await res.json();
  const raw  = json.content?.[0]?.text?.trim() ?? '';

  try {
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return Response.json({ error: 'no json' }, { status: 500 });
    const q = JSON.parse(match[0]);
    if (!q.q || !Array.isArray(q.opts) || q.opts.length !== 4) {
      return Response.json({ error: 'bad format' }, { status: 500 });
    }
    return Response.json({ question: q });
  } catch {
    return Response.json({ error: 'parse error' }, { status: 500 });
  }
}
