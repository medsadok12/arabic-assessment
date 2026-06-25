import { redirect }        from 'next/navigation';
import { createClient }      from '../../lib/supabase-server';
import { createAdminClient } from '../../lib/supabase-admin';
import Navbar                from '../../components/Navbar';
import ProgressDashboard     from './ProgressDashboard';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

const REASON_META = {
  huroof_all_complete: { name: 'الحروف الهجائية', icon: '🔤', bg: '#eff6ff' },
  vowel_balloon:       { name: 'الحركات والتشكيل', icon: '🎈', bg: '#fdf4ff' },
  word_scramble:       { name: 'رتّب الكلمة',       icon: '🔀', bg: '#fef9c3' },
  word_image_match:    { name: 'صِل الصورة',        icon: '🖼️', bg: '#fff7ed' },
  word_smash:          { name: 'مطرقة التفكيك',     icon: '🔨', bg: '#f0f9ff' },
  word_wheel:          { name: 'عجلة الكلمات',      icon: '🎡', bg: '#fdf4ff' },
  word_word:           { name: 'عجلة الكلمات',      icon: '🎡', bg: '#fdf4ff' },
};

export default async function ProgressPage() {
  // ── Auth ──────────────────────────────────────────────────────────
  let user;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) redirect('/auth/login');
    user = data.user;
  } catch {
    redirect('/auth/login');
  }

  const role = user?.user_metadata?.role ?? '';
  if (['super_admin', 'admin', 'teacher'].includes(role)) redirect('/teacher');

  const admin = createAdminClient();
  const uid   = user.id;

  // ── Parallel data fetch ───────────────────────────────────────────
  const [pointsRow, logsRes, gamesRes, flashRes, puzzleRes] = await Promise.all([
    admin.from('user_points').select('total').eq('user_id', uid).maybeSingle(),
    admin.from('points_log')
      .select('delta, reason, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }),
    admin.from('game_results')
      .select('game_id, correct, wrong, total, played_at')
      .eq('user_id', uid)
      .order('played_at', { ascending: false }),
    admin.from('flashcard_progress')
      .select('level, last_reviewed')
      .eq('user_id', uid),
    admin.from('puzzle_progress')
      .select('id, completed_at')
      .eq('user_id', uid),
  ]);

  const totalPoints = pointsRow.data?.total ?? 0;
  const logs    = logsRes.data   ?? [];
  const games   = gamesRes.data  ?? [];
  const flash   = flashRes.data  ?? [];
  const puzzles = puzzleRes.data ?? [];

  // ── Earned points (all-time) ──────────────────────────────────────
  const earnedPoints = logs
    .filter(l => (l.delta ?? 0) > 0)
    .reduce((s, l) => s + (l.delta || 0), 0);

  // ── Weekly + last-week points ─────────────────────────────────────
  const todayUTC = new Date().toISOString().slice(0, 10);
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const d  = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const pts = logs
      .filter(l => l.created_at?.slice(0, 10) === ds && (l.delta || 0) > 0)
      .reduce((s, l) => s + (l.delta || 0), 0);
    weeklyData.push({ day: DAY_NAMES[d.getUTCDay()], date: ds, points: pts, isToday: ds === todayUTC });
  }
  const thisWeekTotal = weeklyData.reduce((s, d) => s + d.points, 0);

  let lastWeekTotal = 0;
  for (let i = 13; i >= 7; i--) {
    const d  = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const ds = d.toISOString().slice(0, 10);
    lastWeekTotal += logs
      .filter(l => l.created_at?.slice(0, 10) === ds && (l.delta || 0) > 0)
      .reduce((s, l) => s + (l.delta || 0), 0);
  }

  // ── Flashcard level distribution ──────────────────────────────────
  const flashLevels = [0, 0, 0, 0, 0, 0];
  flash.forEach(f => { if (f.level >= 0 && f.level <= 5) flashLevels[f.level]++; });
  const masteredCount = flashLevels[5];
  const totalFlash    = flash.length;

  // ── Game accuracy ─────────────────────────────────────────────────
  const totalCorrect = games.reduce((s, g) => s + (g.correct || 0), 0);
  const totalPlayed  = games.reduce((s, g) => s + (g.total  || 0), 0);
  const accuracy     = totalPlayed > 0 ? Math.round((totalCorrect / totalPlayed) * 100) : null;

  const gameGroups = {};
  games.forEach(g => {
    if (!gameGroups[g.game_id]) gameGroups[g.game_id] = { correct: 0, total: 0, plays: 0 };
    gameGroups[g.game_id].correct += g.correct || 0;
    gameGroups[g.game_id].total   += g.total   || 0;
    gameGroups[g.game_id].plays   += 1;
  });
  const gameAccuracy = {};
  Object.entries(gameGroups).forEach(([gid, { correct, total }]) => {
    gameAccuracy[gid] = total > 0 ? Math.round((correct / total) * 100) : 0;
  });

  // ── Activity completion ───────────────────────────────────────────
  const reasons = new Set(logs.map(l => l.reason));
  const gameIds = new Set(games.map(g => g.game_id));
  const completed = {
    'huroof':           reasons.has('huroof_all_complete'),
    'vowel-balloon':    reasons.has('vowel_balloon'),
    'letter-catcher':   gameIds.has('letter_catcher'),
    'word-scramble':    reasons.has('word_scramble'),
    'word-image-match': reasons.has('word_image_match'),
    'word-smash':       reasons.has('word_smash'),
    'word-wheel':       reasons.has('word_wheel'),
    'flashcards':       totalFlash > 0,
    'puzzle':           puzzles.length > 0,
    'challenge':        [...reasons].some(r => r?.startsWith('challenge_')),
  };
  const completedCount   = Object.values(completed).filter(Boolean).length;
  const totalActivities  = Object.keys(completed).length;

  // ── Streak calculation ────────────────────────────────────────────
  const activeDays = new Set();
  logs.forEach(l  => { if (l.created_at && (l.delta || 0) > 0) activeDays.add(l.created_at.slice(0, 10)); });
  games.forEach(g => { if (g.played_at)    activeDays.add(g.played_at.slice(0, 10)); });
  flash.forEach(f => { if (f.last_reviewed) activeDays.add(f.last_reviewed); });

  // Last 21 days for calendar display
  const last21Days = [];
  for (let i = 20; i >= 0; i--) {
    const d  = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const ds = d.toISOString().slice(0, 10);
    last21Days.push({
      date:    ds,
      active:  activeDays.has(ds),
      isToday: ds === todayUTC,
    });
  }

  // Current streak (working backwards from today)
  let currentStreak = 0;
  for (let i = last21Days.length - 1; i >= 0; i--) {
    const d = last21Days[i];
    if (d.active || d.isToday) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Best streak (all historical data)
  const sortedDates = [...activeDays].sort();
  let bestStreak = currentStreak, bs = 0, prevD = null;
  sortedDates.forEach(ds => {
    if (prevD) {
      const diff = Math.round((new Date(ds) - new Date(prevD)) / 86400000);
      bs = diff === 1 ? bs + 1 : 1;
    } else {
      bs = 1;
    }
    bestStreak = Math.max(bestStreak, bs);
    prevD = ds;
  });

  // ── Recent activity log ───────────────────────────────────────────
  const recentLogs = logs
    .filter(l => (l.delta || 0) > 0)
    .slice(0, 10)
    .map(l => {
      let meta = REASON_META[l.reason];
      if (!meta && l.reason?.startsWith('fc_'))        meta = { name: 'بطاقات الحفظ', icon: '🃏', bg: '#f0fdf4' };
      if (!meta && l.reason?.startsWith('challenge_')) meta = { name: 'وضع التحدي',   icon: '⚡', bg: '#eff6ff' };
      if (!meta) meta = { name: l.reason || 'نشاط', icon: '⭐', bg: '#f8fafc' };
      return { ...meta, delta: l.delta, created_at: l.created_at };
    });

  // ── Games played count per type ───────────────────────────────────
  const gamesPlayedCount = {};
  Object.entries(gameGroups).forEach(([gid, { plays }]) => {
    gamesPlayedCount[gid] = plays;
  });

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container" style={{ maxWidth: 1100 }}>
          <ProgressDashboard
            totalPoints={totalPoints}
            earnedPoints={earnedPoints}
            thisWeekTotal={thisWeekTotal}
            lastWeekTotal={lastWeekTotal}
            weeklyData={weeklyData}
            flashLevels={flashLevels}
            masteredCount={masteredCount}
            totalFlash={totalFlash}
            accuracy={accuracy}
            currentStreak={currentStreak}
            bestStreak={bestStreak}
            last21Days={last21Days}
            completed={completed}
            completedCount={completedCount}
            totalActivities={totalActivities}
            recentLogs={recentLogs}
            gameAccuracy={gameAccuracy}
            gamesPlayedCount={gamesPlayedCount}
            puzzleCount={puzzles.length}
            user={user}
          />
        </div>
      </main>
    </>
  );
}
