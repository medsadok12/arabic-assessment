-- حذف كل جداول الاختبار الترويجي (quicktest_*) بعد دمج محتواها بالكامل في
-- بنك أسئلة التقييم التشخيصي الحقيقي (assessment_questions) — جلسة
-- 2026-10-01. القمع التسويقي المجاني (assessment.aarem.net/?quick=1) حُذف
-- نهائياً من الكود (src/quicktest/)، ولوحة إدارته في bogga (تبويب
-- "🛠️ إدارة الاختبار الترويجي") حُذفت أيضاً — هذه الجداول الثمانية لم تعد
-- مقروءة من أي مسار كود حيّ بعد الآن، فحذفها آمن.
--
-- ✅ تحقُّق مسبق (Supabase MCP، قراءة فقط):
--   - الجداول الثمانية هي كل ما يطابق quicktest% في schema public.
--   - الاعتماد الوحيد بينها: quicktest_matching_pairs.exercise_key →
--     quicktest_matching_settings (ON DELETE CASCADE، لذا تُحذَف
--     matching_pairs قبل matching_settings أدناه لتفادي أي تعارض ترتيب،
--     رغم أن CASCADE كان سيتولى الأمر أصلاً).
--   - لا يوجد أي جدول آخر في المشروع يُشير إليها بمفتاح أجنبي.
--
-- ⚠️ لا علاقة لهذه الهجرة بجدول marketing_leads — ذلك الجدول يبقى حيّاً
-- وضرورياً (يُغذّي صفحة /survey ومسارها /api/survey النشطَين فعلياً، إضافة
-- لتبويب "🎯 العملاء المحتملين" في bogga الذي ما زال يعرض صفوفه التاريخية
-- والجديدة) — لم يُحذَف ولن يُحذَف في هذه الهجرة.

DROP TABLE IF EXISTS quicktest_matching_pairs;
DROP TABLE IF EXISTS quicktest_matching_settings;
DROP TABLE IF EXISTS quicktest_alphabet_letters;
DROP TABLE IF EXISTS quicktest_voice_sentences;
DROP TABLE IF EXISTS quicktest_word_completion_items;
DROP TABLE IF EXISTS quicktest_questions;
DROP TABLE IF EXISTS quicktest_levels;
DROP TABLE IF EXISTS quicktest_settings;
