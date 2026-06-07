export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `أنت "فهيم"، ممثل خدمة الزوار الذكي لأكاديمية عارم، وهي أكاديمية أونلاين متخصصة في تعليم اللغة العربية للأطفال من عمر 5 إلى 14 سنة.
تتميز الأكاديمية بـ: نظام تقييم تشخيصي ذكي مجاني، وحصص أونلاين تفاعلية مع معلمين متخصصين، ومساعد ذكي اسمه فهيم يرافق الطالب.
أجب باختصار بليغ ومقنع جداً في جملتين أو ثلاث جمل فقط، بلغة عربية فصيحة واضحة ومحببة لأولياء الأمور.
ركّز على إبراز قيمة المنصة وفوائدها، وادعُ الزائر بلطف لتجربة التقييم المجاني.
لا تستخدم نقاطاً أو قوائم أو أرقاماً. لا تضف روابط في إجابتك. لا تبدأ الإجابة بكلمة "فهيم" أو "مرحباً".`;

function fetchWithTimeout(url, options, ms = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const { question } = body;
  if (!question?.trim()) {
    return NextResponse.json({ error: 'السؤال مطلوب' }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const geminiBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: question.trim() }] }],
    generationConfig: { maxOutputTokens: 300, temperature: 0.75, topP: 0.9 },
  });

  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      try {
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody },
          6000
        );
        if (!res.ok) continue;
        const json = await res.json().catch(() => null);
        const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) return NextResponse.json({ reply });
      } catch { /* try next model */ }
    }
  }

  // Anthropic fallback
  if (anthropicKey) {
    try {
      const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: question.trim() }],
        }),
      }, 5000);
      if (res.ok) {
        const json = await res.json().catch(() => null);
        const reply = json?.content?.[0]?.text?.trim();
        if (reply) return NextResponse.json({ reply });
      }
    } catch { /* fallback failed */ }
  }

  return NextResponse.json({
    reply: 'أكاديمية عارم منصة متكاملة لتعليم اللغة العربية للأطفال أونلاين بأساليب ذكية وتفاعلية. نرحب بك لتجربة نظام التقييم المجاني واكتشاف مستوى طفلك!',
  });
}
