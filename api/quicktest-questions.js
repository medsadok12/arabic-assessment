// نقطة نهاية تجلب أسئلة/مستويات "اختبار تحديد المستوى" التسويقي ديناميكياً
// من Supabase (quicktest_questions + quicktest_levels + quicktest_settings) —
// بنفس نمط api/questions.js حرفياً (القراءة هنا حصراً عبر service_role، لأن
// الجداول محمية بـRLS DENY ALL كاملاً لـanon/authenticated، راجع
// lms/supabase/quicktest_cms.sql).
//
// فشل آمن: أي خطأ يُرجع { source:'fallback' } فوراً — العميل
// (src/quicktest/fetchQuicktestData.js) يستخدم عندها بنك الأسئلة/المستويات
// الثابتة المرفقة أصلاً في src/quicktest/blueprint.js، فلا يتعطل القمع
// التسويقي أمام أي زائر مهما حدث للوحة الإدارة أو قاعدة البيانات.

const TIMEOUT_MS = 5000;

async function fetchJson(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}${path}`, {
      headers: {
        apikey:        process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Supabase REST ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function toQuestionObject(row) {
  return {
    id:             row.id,
    text:           row.question_text,
    imageUrl:       row.image_url || null,
    audioUrl:       row.audio_url || null,
    promptEmoji:    row.prompt_emoji || null,
    audioPrompt:    row.audio_prompt || null,
    readingText:    row.reading_text || null,
    parentReadHint: !!row.parent_read_hint,
    skillTag:       row.skill_tag || null,
    options:        Array.isArray(row.options) ? row.options : [],
  };
}

function toLevelObject(row) {
  return {
    id:             row.id,
    icon:           row.icon,
    label:          row.label,
    minCorrect:     row.min_correct,
    maxCorrect:     row.max_correct,
    strengths:      row.strengths_text,
    recommendation: row.recommendation,
    program:        row.program_name,
    programPitch:   row.program_pitch,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase env vars not configured');
    }

    const [questionRows, levelRows, settingsRows, alphabetRows, matchingSettingsRows, matchingPairRows, voiceRows] = await Promise.all([
      fetchJson('/rest/v1/quicktest_questions?enabled=eq.true&select=id,question_text,image_url,audio_url,prompt_emoji,audio_prompt,reading_text,parent_read_hint,skill_tag,options&order=order_index.asc'),
      fetchJson('/rest/v1/quicktest_levels?select=id,icon,label,min_correct,max_correct,strengths_text,recommendation,program_name,program_pitch&order=sort_order.asc'),
      fetchJson('/rest/v1/quicktest_settings?select=whatsapp_template,alphabet_enabled,alphabet_title,alphabet_subtitle,voice_enabled,voice_title,voice_subtitle&limit=1'),
      fetchJson('/rest/v1/quicktest_alphabet_letters?enabled=eq.true&select=letter&order=order_index.asc'),
      fetchJson('/rest/v1/quicktest_matching_settings?select=exercise_key,enabled,title,subtitle,label,skill_tag'),
      fetchJson('/rest/v1/quicktest_matching_pairs?enabled=eq.true&select=exercise_key,emoji,word,image_url&order=order_index.asc'),
      fetchJson('/rest/v1/quicktest_voice_sentences?enabled=eq.true&select=id,sentence_text,emoji&order=order_index.asc'),
    ]);

    if (!Array.isArray(questionRows) || !Array.isArray(levelRows) || !Array.isArray(settingsRows) || !Array.isArray(alphabetRows)
      || !Array.isArray(matchingSettingsRows) || !Array.isArray(matchingPairRows) || !Array.isArray(voiceRows)) {
      throw new Error('Unexpected Supabase response shape');
    }
    if (questionRows.length === 0 || levelRows.length === 0) {
      throw new Error('Empty questions/levels — falling back to static content');
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      source:           'database',
      questions:        questionRows.map(toQuestionObject),
      levels:           levelRows.map(toLevelObject),
      whatsappTemplate: settingsRows[0]?.whatsapp_template || null,
      // تمرين الحروف الافتتاحي — لا يُفشِل الاستجابة كاملة إن كان فارغاً؛
      // يُقيَّم من جهة العميل بشكل مستقل (QuickTestApp.jsx)، ويسقط عندها
      // لبنك الحروف الثابت في blueprint.js.
      alphabetLetters:  alphabetRows.map(r => r.letter),
      alphabetEnabled:  settingsRows[0]?.alphabet_enabled ?? true,
      alphabetTitle:    settingsRows[0]?.alphabet_title || null,
      alphabetSubtitle: settingsRows[0]?.alphabet_subtitle || null,
      // تدريبا المطابقة — كل تدريب يُقيَّم بمعزل عن الآخر من جهة العميل،
      // فلا يُفشِل هذا الجزء الاستجابة كاملة حتى لو كان أحد الجدولين فارغاً.
      matchingExercises: matchingSettingsRows.map(s => ({
        key:      s.exercise_key,
        enabled:  s.enabled,
        title:    s.title,
        subtitle: s.subtitle,
        label:    s.label,
        skillTag: s.skill_tag,
        pairs:    matchingPairRows.filter(p => p.exercise_key === s.exercise_key).map(p => ({ emoji: p.emoji, word: p.word, imageUrl: p.image_url || null })),
      })),
      // تقييم القراءة الجهرية — نفس فلسفة تمرين الحروف: يُقيَّم بمعزل عن بقية
      // الاستجابة، فلا يُفشِلها كاملة لو كان جدول الجمل فارغاً.
      voiceSentences: voiceRows.map(r => ({ id: r.id, text: r.sentence_text, emoji: r.emoji })),
      voiceEnabled:   settingsRows[0]?.voice_enabled ?? true,
      voiceTitle:     settingsRows[0]?.voice_title || null,
      voiceSubtitle:  settingsRows[0]?.voice_subtitle || null,
    });
  } catch (e) {
    console.error('[api/quicktest-questions] فشل الجلب من Supabase — سيعتمد العميل على النسخة الثابتة:', e.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ source: 'fallback' });
  }
}
