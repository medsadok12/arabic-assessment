export const dynamic = 'force-dynamic';

import { NextResponse }      from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';

const BASE_SYSTEM_PROMPT = `أنت "فهيم"، مساعد خدمة الزوار لأكاديمية عارم، أكاديمية أونلاين لتعليم اللغة العربية للأطفال (5-14 سنة). تتميز بنظام تقييم تشخيصي مجاني وحصص تفاعلية مع معلمين متخصصين.
أجب بجملتين أو ثلاث جمل كاملة بلغة عربية واضحة. استخدم المعلومات المُزوَّدة إن وجدت. أنهِ دائماً بدعوة للتواصل عبر واتساب أو تجربة التقييم المجاني. لا تستخدم نقاطاً أو قوائم.`;

function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

// Two models only: 3500 + 3000 = 6500ms max for Gemini, leaving ~3s for Anthropic
// Total worst case ≈ 9s — within Vercel Hobby's 10s function limit
const GEMINI_MODELS = [
  { name: 'gemini-2.5-flash', ms: 7000 }, // 2.0-flash deprecated (404)
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
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
      topP: 0.9,
      thinkingConfig: { thinkingBudget: 0 }, // disable 2.5-flash thinking — keeps replies fast within Vercel limit
    },
  });

  if (geminiKey) {
    for (const { name, ms } of GEMINI_MODELS) {
      try {
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${name}:generateContent?key=${geminiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody },
          ms
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
      }, 2500);
      if (res.ok) {
        const json = await res.json().catch(() => null);
        const reply = json?.content?.[0]?.text?.trim();
        if (reply) return NextResponse.json({ reply });
      }
    } catch { /* fallback failed */ }
  }

  return NextResponse.json({
    reply: 'شكراً لاستفسارك! للحصول على إجابة مفصّلة حول ما تبحث عنه، تواصل معنا مباشرة عبر واتساب وسيسعد فريقنا بمساعدتك. كما ندعوك لتجربة التقييم التشخيصي المجاني وهو أفضل بداية لرحلة طفلك مع أكاديمية عارم.',
  });
}
