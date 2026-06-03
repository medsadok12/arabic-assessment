export const dynamic = 'force-dynamic';

// Public diagnostic endpoint — only exposes key prefix and model test results
export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not set in Vercel env vars' }, { status: 500 });
  }

  const models = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash',
  ];

  const results = [];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'قل كلمة مرحبا فقط' }] }],
            generationConfig: { maxOutputTokens: 20 },
          }),
        }
      );
      const body = await res.text();
      let reply = null;
      try {
        const json = JSON.parse(body);
        reply = json.candidates?.[0]?.content?.parts?.[0]?.text
             ?? json.error?.message
             ?? null;
      } catch {}
      results.push({ model, status: res.status, ok: res.ok, reply });
      if (res.ok && reply) break;
    } catch (e) {
      results.push({ model, status: 'NETWORK_ERROR', error: e.message });
    }
  }

  return Response.json({
    keyPresent: true,
    keyPrefix:  geminiKey.slice(0, 10) + '...',
    results,
  });
}
