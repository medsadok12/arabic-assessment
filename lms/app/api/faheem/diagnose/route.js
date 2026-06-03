export const dynamic = 'force-dynamic';

export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not set in Vercel env vars' }, { status: 500 });
  }

  // First: list available models for this key
  let availableModels = [];
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}&pageSize=50`
    );
    if (listRes.ok) {
      const listJson = await listRes.json();
      availableModels = (listJson.models ?? [])
        .map(m => m.name?.replace('models/', ''))
        .filter(Boolean);
    }
  } catch {}

  // Test the first available model that supports generateContent
  const testModels = availableModels.length
    ? availableModels.filter(m => m.includes('flash') || m.includes('pro')).slice(0, 3)
    : ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash', 'gemini-1.0-pro'];

  const results = [];
  for (const model of testModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'قل مرحبا فقط' }] }],
            generationConfig: { maxOutputTokens: 20 },
          }),
        }
      );
      const text = await res.text();
      let reply = null;
      try {
        const json = JSON.parse(text);
        reply = json.candidates?.[0]?.content?.parts?.[0]?.text ?? json.error?.message ?? null;
      } catch {}
      results.push({ model, httpStatus: res.status, ok: res.ok, reply: reply?.slice(0, 120) });
      if (res.ok && reply) break;
    } catch (e) {
      results.push({ model, error: e.message });
    }
  }

  return Response.json({
    keyPresent:      true,
    keyPrefix:       geminiKey.slice(0, 10) + '...',
    availableModels,
    testResults:     results,
    recommendation:  availableModels.length
      ? `Use: ${availableModels[0]}`
      : 'Enable Generative Language API at console.cloud.google.com',
  });
}
