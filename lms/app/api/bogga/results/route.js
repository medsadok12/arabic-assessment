import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role;
  if (role !== 'super_admin' && role !== 'admin') return null;
  return { user, role };
}

export async function GET(req) {
  const auth = await guard();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get('search')   ?? '';
  const level    = searchParams.get('level')    ?? '';
  const minScore = searchParams.get('minScore') ?? '';
  const maxScore = searchParams.get('maxScore') ?? '';
  const page     = parseInt(searchParams.get('page') ?? '1', 10);
  const limit    = 50;
  const offset   = (page - 1) * limit;

  const exportAll = searchParams.get('all') === 'true';
  const admin = createAdminClient();

  let query = admin
    .from('assessments')
    .select('id, student_name, level, score, completed_at, user_id', { count: 'exact' })
    .order('completed_at', { ascending: false });

  if (!exportAll) query = query.range(offset, offset + limit - 1);
  if (search)   query = query.ilike('student_name', `%${search}%`);
  if (level)    query = query.eq('level', parseInt(level, 10));
  if (minScore) query = query.gte('score', parseInt(minScore, 10));
  if (maxScore) query = query.lte('score', parseInt(maxScore, 10));

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate stats (no filters — always full picture)
  const [{ count: total }, { count: passed }, { data: allData }] = await Promise.all([
    admin.from('assessments').select('id', { count: 'exact', head: true }),
    admin.from('assessments').select('id', { count: 'exact', head: true }).gte('score', 70),
    admin.from('assessments').select('score, level'),
  ]);

  const avg = allData?.length
    ? Math.round(allData.reduce((s, a) => s + (a.score ?? 0), 0) / allData.length)
    : 0;

  const levelCounts = {};
  const scoreDist   = { '0-29': 0, '30-49': 0, '50-69': 0, '70-89': 0, '90-100': 0 };
  for (const r of allData ?? []) {
    const l = r.level ?? 1;
    levelCounts[l] = (levelCounts[l] || 0) + 1;
    const s = r.score ?? 0;
    if      (s < 30) scoreDist['0-29']++;
    else if (s < 50) scoreDist['30-49']++;
    else if (s < 70) scoreDist['50-69']++;
    else if (s < 90) scoreDist['70-89']++;
    else             scoreDist['90-100']++;
  }

  return NextResponse.json({
    results: data ?? [],
    total:   count ?? 0,
    page,
    stats: { total: total ?? 0, passed: passed ?? 0, avg, levelCounts, scoreDist },
  });
}
