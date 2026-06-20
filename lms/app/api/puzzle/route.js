import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const PIECE_COST = 50;

export async function GET(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const wantNext = searchParams.get('next') === '1';
    const admin = createAdminClient();

    const [{ data: pointsRow }, { data: allProgress }] = await Promise.all([
      admin.from('user_points').select('total').eq('user_id', user.id).single(),
      admin.from('puzzle_progress').select('id, puzzle_id, unlocked, completed_at, badge_given, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    const points = pointsRow?.total ?? 0;
    const progress = allProgress ?? [];

    let activeProg = null;
    let activePuzzle = null;

    if (!wantNext) {
      const incompleteProg = progress.find(p => !p.completed_at);
      if (incompleteProg) {
        const { data: pz } = await admin.from('puzzles').select('*').eq('id', incompleteProg.puzzle_id).single();
        activeProg = incompleteProg;
        activePuzzle = pz;
      }
    }

    if (!activePuzzle) {
      const completedIds = progress.filter(p => p.completed_at).map(p => p.puzzle_id);
      let q = admin.from('puzzles').select('*').eq('is_active', true).order('seq', { ascending: true }).limit(1);
      if (completedIds.length > 0) q = q.not('id', 'in', `(${completedIds.join(',')})`);
      const { data: nextPuzzle } = await q.maybeSingle();

      if (nextPuzzle) {
        const { data: newProg } = await admin.from('puzzle_progress')
          .insert({ user_id: user.id, puzzle_id: nextPuzzle.id, unlocked: [] })
          .select().single();
        activePuzzle = nextPuzzle;
        activeProg = newProg;
      }
    }

    return NextResponse.json({ puzzle: activePuzzle ?? null, progress: activeProg ?? null, points });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const body = await req.json();
    if (body.action !== 'unlock') return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 });

    const admin = createAdminClient();

    const [{ data: pointsRow }, { data: prog }] = await Promise.all([
      admin.from('user_points').select('total').eq('user_id', user.id).single(),
      admin.from('puzzle_progress').select('id, puzzle_id, unlocked, puzzles(cols, rows, badge_name, badge_icon)').eq('user_id', user.id).is('completed_at', null).order('created_at', { ascending: false }).limit(1).single(),
    ]);

    const currentPoints = pointsRow?.total ?? 0;
    if (currentPoints < PIECE_COST) return NextResponse.json({ success: false, reason: 'نقاط غير كافية' });
    if (!prog) return NextResponse.json({ success: false, reason: 'لا توجد أحجية نشطة' });

    const total = prog.puzzles.cols * prog.puzzles.rows;
    const unlocked = Array.isArray(prog.unlocked) ? prog.unlocked : [];
    if (unlocked.length >= total) return NextResponse.json({ success: false, reason: 'الأحجية مكتملة' });

    let nextPiece = 0;
    while (unlocked.includes(nextPiece) && nextPiece < total) nextPiece++;

    const newUnlocked = [...unlocked, nextPiece];
    const isCompleted = newUnlocked.length >= total;
    const now = new Date().toISOString();
    const COMPLETION_BONUS = 30;
    const finalPoints = currentPoints - PIECE_COST + (isCompleted ? COMPLETION_BONUS : 0);

    await Promise.all([
      admin.from('user_points').upsert({ user_id: user.id, total: finalPoints, updated_at: now }, { onConflict: 'user_id' }),
      admin.from('points_log').insert({ user_id: user.id, delta: -PIECE_COST, reason: 'puzzle_unlock' }),
      ...(isCompleted ? [admin.from('points_log').insert({ user_id: user.id, delta: COMPLETION_BONUS, reason: `puzzle_complete_${prog.id}` })] : []),
      admin.from('puzzle_progress').update({
        unlocked: newUnlocked,
        ...(isCompleted ? { completed_at: now, badge_given: true } : {}),
      }).eq('id', prog.id),
    ]);

    return NextResponse.json({
      success: true,
      unlockedPiece: nextPiece,
      unlocked: newUnlocked,
      newPoints: finalPoints,
      isCompleted,
      completionBonus: isCompleted ? COMPLETION_BONUS : 0,
      badge: isCompleted ? { name: prog.puzzles.badge_name, icon: prog.puzzles.badge_icon } : null,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
