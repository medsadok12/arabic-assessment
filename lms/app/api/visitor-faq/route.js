export const dynamic = 'force-dynamic';

import { NextResponse }      from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';

const BASE_SYSTEM_PROMPT = `أنت "فهيم"، ممثل خدمة الزوار الذكي لأكاديمية عارم، أكاديمية أونلاين متخصصة في تعليم اللغة العربية للأطفال من عمر 5 إلى 14 سنة.
تتميز الأكاديمية بـ: نظام تقييم تشخيصي ذكي مجاني، وحصص أونلاين تفاعلية مع معلمين متخصصين، ومساعد ذكي اسمه فهيم يرافق الطالب.

قواعد صارمة يجب اتباعها في كل إجابة:
1. اقرأ المعلومات المُزوَّدة أدناه جيداً واستخدمها أساساً لإجابتك — إن وجد سؤال مشابه في القائمة فأجب مستنداً إليه بدقة.
2. اكتب إجابة كاملة ومكتملة تتكون من جملتين إلى ثلاث جمل — لا تقطع الجملة في منتصفها أبداً.
3. اكتب بلغة عربية فصيحة واضحة ومحببة لأولياء الأمور.
4. أنهِ إجابتك دائماً بجملة تدعو الزائر للتواصل أو تجربة التقييم المجاني.
5. لا تستخدم نقاطاً أو قوائم. لا تضف روابط. لا تبدأ بـ"فهيم" أو "مرحباً".
6. إذا لم يكن لديك معلومة دقيقة، وجّه الزائر للتواصل عبر واتساب للحصول على التفاصيل.`;

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

async function fetchContext() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('faheem_visitor_qa')
      .select('question, answer')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const { question } = body;
  if (!question?.trim()) {
    return NextResponse.json({ error: 'السؤال مطلوب' }, { status: 400 });
  }

  // Build dynamic system prompt with DB context
  const qaItems = await fetchContext();
  let systemPrompt = BASE_SYSTEM_PROMPT;
  if (qaItems.length > 0) {
    const knowledgeBlock = qaItems
      .map(item => `سؤال: ${item.question}\nإجابة: ${item.answer}`)
      .join('\n\n');
    systemPrompt += `\n\nفيما يلي معلومات وإجابات رسمية من إدارة الأكاديمية — استخدمها بدقة عند الإجابة:\n\n${knowledgeBlock}`;
  }

  const geminiKey    = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const geminiBody = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: question.trim() }] }],
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7, topP: 0.9 },
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
        const parts = json?.candidates?.[0]?.content?.parts;
        const reply = parts?.map(p => p.text ?? '').join('').trim();
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
          max_tokens: 1024,
          system: systemPrompt,
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
