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
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.6,
    },
  });

  // Current available models (June 2026) — Vercel Hobby limit is 10s total
  const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  const errors = [];
  for (const model of MODELS) {
    try {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
        7000
      );
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        const msg = `${model} HTTP ${res.status}: ${errBody.slice(0, 150)}`;
        errors.push(msg); console.error('[life-scene]', msg); continue;
      }
      const json = await res.json();
      const raw = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!raw) {
        const msg = `${model} empty: ${JSON.stringify(json).slice(0, 150)}`;
        errors.push(msg); console.error('[life-scene]', msg); continue;
      }
      const match = raw.match(/\[[\s\S]*?\]/);
      if (!match) { const msg = `${model} no-array: ${raw.slice(0, 100)}`; errors.push(msg); console.error('[life-scene]', msg); continue; }
      const dialogue = JSON.parse(match[0]);
      if (Array.isArray(dialogue) && dialogue.length >= 2) return dialogue;
      const msg = `${model} bad-format`; errors.push(msg); console.error('[life-scene]', msg);
    } catch (e) {
      const msg = `${model} err: ${e.message}`; errors.push(msg); console.error('[life-scene]', msg); continue;
    }
  }
  throw new Error(`فشل توليد الحوار — ${errors.join(' | ')}`);
}

const EDITOR_ROLES = ['teacher', 'super_admin', 'admin'];

// GET /api/life-scene — list scenes based on role
export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  const role  = user.user_metadata?.role ?? '';
  const admin = createAdminClient();

  // super_admin / admin: see ALL scenes from all teachers
  if (role === 'super_admin' || role === 'admin') {
    const { data, error } = await admin
      .from('life_scenes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ scenes: data ?? [] });
  }

  // Teacher: see own scenes only
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
  if (!EDITOR_ROLES.includes(user.user_metadata?.role)) return Response.json({ error: 'للمعلمين والإدارة فقط' }, { status: 403 });

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
