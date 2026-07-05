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
    .select('id, student_name, level, score, completed_at, user_id, notes', { count: 'exact' })
    .order('completed_at', { ascending: false });

  if (!exportAll) query = query.range(offset, offset + limit - 1);
  if (search)   query = query.ilike('student_name', `%${search}%`);
  if (level)    query = query.eq('level', parseInt(level, 10));
  if (minScore) query = query.gte('score', parseInt(minScore, 10));
  if (maxScore) query = query.lte('score', parseInt(maxScore, 10));

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate stats via parallel DB-level queries — no full table scan in JS
  const [
    { count: total },
    { count: passed },
    { data: avgRow },
    { count: lvl1 }, { count: lvl2 }, { count: lvl3 },
    { count: d0 }, { count: d30 }, { count: d50 }, { count: d70 }, { count: d90 },
  ] = await Promise.all([
    admin.from('assessments').select('*', { count: 'exact', head: true }),
    admin.from('assessments').select('*', { count: 'exact', head: true }).gte('score', 70),
    admin.from('assessments').select('score.avg()').single(),
    admin.from('assessments').select('*', { count: 'exact', head: true }).eq('level', 1),
    admin.from('assessments').select('*', { count: 'exact', head: true }).eq('level', 2),
    admin.from('assessments').select('*', { count: 'exact', head: true }).eq('level', 3),
    admin.from('assessments').select('*', { count: 'exact', head: true }).lt('score', 30),
    admin.from('assessments').select('*', { count: 'exact', head: true }).gte('score', 30).lt('score', 50),
    admin.from('assessments').select('*', { count: 'exact', head: true }).gte('score', 50).lt('score', 70),
    admin.from('assessments').select('*', { count: 'exact', head: true }).gte('score', 70).lt('score', 90),
    admin.from('assessments').select('*', { count: 'exact', head: true }).gte('score', 90),
  ]);

  const avg        = Math.round(avgRow?.score ?? 0);
  const levelCounts = { 1: lvl1 ?? 0, 2: lvl2 ?? 0, 3: lvl3 ?? 0 };
  const scoreDist   = { '0-29': d0 ?? 0, '30-49': d30 ?? 0, '50-69': d50 ?? 0, '70-89': d70 ?? 0, '90-100': d90 ?? 0 };

  return NextResponse.json({
    results: data ?? [],
    total:   count ?? 0,
    page,
    stats: { total: total ?? 0, passed: passed ?? 0, avg, levelCounts, scoreDist },
  });
}
