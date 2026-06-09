import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

function fetchWithTimeout(url, options, ms = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function generateDialogue({ situation, grade, skill }) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('GEMINI_API_KEY missing');

  // Prompt in English to get more reliable JSON output from Gemini
  const prompt = `You are an Arabic educational dialogue writer for children.
Write a short 3-line dialogue between 2 characters to teach this skill:
- Situation: ${situation}
- Grade: ${grade}
- Skill: ${skill}

STRICT RULES:
1. Exactly 3 lines, 2 characters only
2. Characters must be from: راشد, نورة, البائع, المعلمة, الصديق
3. Max 5 Arabic words per line
4. Fully vowelized Arabic (تشكيل كامل)
5. Simple Modern Standard Arabic for children
6. Return ONLY a JSON array, no explanation, no markdown

EXACT OUTPUT FORMAT:
[{"speaker":"راشد","text":"اَلسَّلامُ عَلَيْكُم."},{"speaker":"البائع","text":"وَعَلَيْكُمُ السَّلام."},{"speaker":"راشد","text":"أُرِيدُ خُبْزاً، شُكْراً."}]`;

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 300, temperature: 0.6 },
  });

  // Try fast models only — Vercel Hobby limit is 10s total
  const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastErr = '';
  for (const model of MODELS) {
    try {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
        7000
      );
      if (!res.ok) { lastErr = `HTTP ${res.status}`; continue; }
      const json = await res.json();
      const raw = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!raw) { lastErr = 'empty response'; continue; }
      // Extract JSON array — handle markdown code fences
      const match = raw.match(/\[[\s\S]*?\]/);
      if (!match) { lastErr = 'no JSON array in response'; continue; }
      const dialogue = JSON.parse(match[0]);
      if (Array.isArray(dialogue) && dialogue.length >= 2) return dialogue;
      lastErr = 'invalid dialogue format';
    } catch (e) {
      lastErr = e.message;
      continue;
    }
  }
  console.error('[life-scene] generate failed:', lastErr);
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
