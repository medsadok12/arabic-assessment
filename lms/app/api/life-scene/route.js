import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

function fetchWithTimeout(url, options, ms = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function generateDialogue({ situation, grade, skill }) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('GEMINI_API_KEY missing');

  const prompt = `أنتَ كاتب حوار تعليمي للأطفال العرب.
المطلوب: اكتب حواراً قصيراً بين شخصيتين لتعليم المهارة اللغوية التالية:
- الموقف: ${situation}
- المرحلة الدراسية: ${grade}
- المهارة: ${skill}

القواعد الصارمة:
1. 3 أسطر فقط (لا أكثر، لا أقل)
2. شخصيتان فقط — اختر أسماءً من: راشد، نورة، البائع، المعلمة، الصديق
3. كل سطر لا يتجاوز 5 كلمات
4. كل الكلمات مشكولة تشكيلاً كاملاً (حركات وتنوين)
5. لغة فصحى مبسطة مناسبة للأطفال
6. لا تضف أي شرح أو ملاحظات

الإخراج: JSON فقط بهذا الشكل بالضبط:
[
  {"speaker":"اسم1","text":"النص المشكول"},
  {"speaker":"اسم2","text":"النص المشكول"},
  {"speaker":"اسم1","text":"النص المشكول"}
]`;

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
  });

  const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  for (const model of MODELS) {
    try {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
      );
      if (!res.ok) continue;
      const json = await res.json();
      const raw = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!raw) continue;
      // Extract JSON array from response
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) continue;
      const dialogue = JSON.parse(match[0]);
      if (Array.isArray(dialogue) && dialogue.length >= 2) return dialogue;
    } catch {
      continue;
    }
  }
  throw new Error('فشل توليد الحوار — حاول مرة أخرى');
}

// GET /api/life-scene — list published scenes (students) or all scenes (teachers)
export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  const role = user.user_metadata?.role ?? '';
  const admin = createAdminClient();

  if (role === 'teacher') {
    const { data, error } = await admin
      .from('life_scenes')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ scenes: data ?? [] });
  }

  // Students and others — only published
  const { data, error } = await admin
    .from('life_scenes')
    .select('id,teacher_name,situation,grade,skill,dialogue,published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(20);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ scenes: data ?? [] });
}

// POST /api/life-scene — generate dialogue via Gemini and save
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
  if (user.user_metadata?.role !== 'teacher') return Response.json({ error: 'للمعلمين فقط' }, { status: 403 });

  const { situation, grade, skill } = await request.json();
  if (!situation?.trim() || !grade?.trim() || !skill?.trim()) {
    return Response.json({ error: 'الموقف والمرحلة والمهارة مطلوبة' }, { status: 400 });
  }

  let dialogue;
  try {
    dialogue = await generateDialogue({ situation, grade, skill });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }

  const admin = createAdminClient();
  const teacherName = user.user_metadata?.full_name ?? user.email;

  const { data: scene, error } = await admin
    .from('life_scenes')
    .insert({
      teacher_id:   user.id,
      teacher_name: teacherName,
      situation:    situation.trim(),
      grade:        grade.trim(),
      skill:        skill.trim(),
      dialogue,
      is_published: false,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ scene });
}
