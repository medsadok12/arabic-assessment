export const dynamic = 'force-dynamic';
import { createClient } from '../../../../lib/supabase-server';

export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const geminiKey = process.env.GEMINI_API_KEY;
  const result = { keyPresent: !!geminiKey, keyPrefix: geminiKey?.slice(0, 8) + '...', tests: [] };

  // Test each model
  const models = ['gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];

  for (const model of models) {
    if (!geminiKey) { result.tests.push({ model, status: 'NO_KEY' }); continue; }
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'قل: مرحبا' }] }],
            generationConfig: { maxOutputTokens: 30 },
          }),
        }
      );
      const text = await res.text();
      let reply = null;
      try {
        const json = JSON.parse(text);
        reply = json.candidates?.[0]?.content?.parts?.[0]?.text ?? json.error?.message ?? null;
      } catch {}
      result.tests.push({ model, httpStatus: res.status, reply: reply?.slice(0, 100), raw: text.slice(0, 200) });
      if (res.ok && reply) break; // found a working model
    } catch (e) {
      result.tests.push({ model, error: e.message });
    }
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
