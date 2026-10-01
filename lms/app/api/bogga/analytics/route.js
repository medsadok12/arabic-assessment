import { NextResponse } from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { getRole } from '../../../../lib/auth-role';
import { SKILL_LABELS } from '../../../../lib/assessment-question-types';

export const dynamic = 'force-dynamic';

// نفس حراسة نتائج الطلاب بالضبط (api/bogga/results/route.js) — هذه البيانات
// أكثر تفصيلاً منها (إجابة كل سؤال)، فلا تُخفَّف الصلاحية عنها أبداً.
async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = getRole(user);
  if (role !== 'super_admin' && role !== 'admin') return null;
  return { user, role };
}

// GET — تحليلات مجمَّعة من assessments.answers: دقة كل مهارة، والأسئلة
// الأكثر خطأً. يُحسَب كل شيء هنا في JS بعد جلب الصفوف — حجم الجدول اليوم
// (عشرات الصفوف) تافه لأي تجميع SQL معقَّد، فلا داعٍ لدالة RPC مخصَّصة
// طالما البيانات بهذا الحجم (راجع القسم 12.4 من CLAUDE.md — لا تصميم لحمل
// مستقبلي افتراضي).
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'غير مخول' }, { status: 401 });

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('assessments')
    .select('level, score, answers, completed_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = rows.length;
  const withDetail = rows.filter(r => Array.isArray(r.answers) && r.answers.length > 0);

  // ── نظرة عامة ─────────────────────────────────────────────────────────────
  // Number(...) صراحةً: عمود score من نوع numeric في Postgres قد يصل كنص عبر
  // supabase-js في بعض الحالات — بلا هذا التحويل قد يتحول + إلى دمج نصوص
  // بدل جمع حسابي فيُنتج رقماً غير منطقي (أو NaN) بصمت.
  const avgScore = total > 0 ? rows.reduce((s, r) => s + Number(r.score ?? 0), 0) / total : 0;
  const byLevel = { 1: 0, 2: 0, 3: 0 };
  for (const r of rows) if (byLevel[r.level] !== undefined) byLevel[r.level]++;

  // ── دقة كل مهارة (من تفاصيل الإجابات المتاحة فقط) ──────────────────────────
  const skillAgg = {}; // skill -> { correct, total, name }
  // ── الأسئلة الأكثر خطأً ────────────────────────────────────────────────────
  const questionAgg = {}; // questionId -> { text, skill, wrong, total }

  for (const row of withDetail) {
    for (const a of row.answers) {
      const skill = a.skill;
      if (skill) {
        skillAgg[skill] ??= { correct: 0, total: 0, name: a.skillName || SKILL_LABELS[skill] || skill };
        skillAgg[skill].total++;
        if (a.isCorrect) skillAgg[skill].correct++;
      }
      const qid = a.questionId;
      if (qid) {
        questionAgg[qid] ??= { text: a.questionText || qid, skill: a.skillName || SKILL_LABELS[skill] || skill, wrong: 0, total: 0 };
        questionAgg[qid].total++;
        if (!a.isCorrect) questionAgg[qid].wrong++;
      }
    }
  }

  const skillBreakdown = Object.entries(skillAgg)
    .map(([id, v]) => ({ id, name: v.name, total: v.total, correct: v.correct, accuracy: Math.round((v.correct / v.total) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const mostMissed = Object.entries(questionAgg)
    .map(([id, v]) => ({ id, ...v, wrongRate: Math.round((v.wrong / v.total) * 100) }))
    .filter(q => q.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || b.wrongRate - a.wrongRate)
    .slice(0, 10);

  return NextResponse.json({
    overview: {
      total,
      withDetail: withDetail.length,
      avgScore: Math.round(avgScore * 10) / 10,
      byLevel,
    },
    skillBreakdown,
    mostMissed,
  });
}
