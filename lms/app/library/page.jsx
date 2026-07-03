import { redirect } from 'next/navigation';
import { createClient }      from '../../lib/supabase-server';
import { createAdminClient } from '../../lib/supabase-admin';
import Navbar       from '../../components/Navbar';
import LibraryGrid  from './LibraryGrid';

export default async function LibraryPage() {
  let user;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) redirect('/auth/login');
    user = data.user;
  } catch {
    redirect('/auth/login');
  }

  const role      = user?.user_metadata?.role ?? '';
  const isTeacher = ['super_admin', 'admin', 'teacher'].includes(role);

  const admin = createAdminClient();

  // fetch card customizations
  let initialMeta = {};
  try {
    const { data } = await admin.from('library_card_meta').select('*');
    (data || []).forEach(c => { initialMeta[c.card_key] = c; });
  } catch {}

  // fetch published stories
  let initialStories = [];
  try {
    const { data } = await admin
      .from('stories')
      .select('id, slug, title, icon, level, length, status, points, accent, bg, border_color')
      .eq('status', 'published')
      .order('created_at', { ascending: true });
    initialStories = data || [];
  } catch {}

  // fetch activity progress for students only
  let initialProgress = {};
  if (!isTeacher) {
    try {
      const [logsRes, gamesRes, flashRes, puzzleRes] = await Promise.all([
        admin.from('points_log').select('reason').eq('user_id', user.id),
        admin.from('game_results').select('game_id').eq('user_id', user.id),
        admin.from('flashcard_progress')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        admin.from('puzzle_progress')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      const reasons = new Set((logsRes.data  || []).map(l => l.reason));
      const games   = new Set((gamesRes.data || []).map(g => g.game_id));

      initialProgress = {
        'huroof':           reasons.has('huroof_all_complete'),
        'vowel-balloon':    games.has('vowel_balloon'),
        'letter-catcher':   games.has('letter_catcher'),
        'word-scramble':    games.has('word_scramble'),
        'word-image-match': games.has('word_image_match'),
        'word-smash':       games.has('word_smash'),
        'word-wheel':       games.has('word_wheel'),
        'flashcards':       (flashRes.count ?? 0) > 0,
        'puzzle':           (puzzleRes.count ?? 0) > 0,
        'challenge':        [...reasons].some(r => r.startsWith('challenge_')),
      };
    } catch {}
  }

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container">
          <div style={{ textAlign:'center', padding:'8px 0 10px' }}>
            <h1 style={{ fontSize:'1.9rem', fontWeight:900, color:'#1e3a5f', margin:0 }}>
              المكتبة التعليمية 📚
            </h1>
            {isTeacher && (
              <p style={{ margin:'8px 0 0' }}>
                <span style={{ background:'#f0fdf4', color:'#15803d', borderRadius:20, padding:'2px 10px', fontSize:'.78rem', fontWeight:700, border:'1px solid #86efac' }}>
                  ✏️ حرّك الماوس فوق أي بطاقة للتعديل
                </span>
              </p>
            )}
          </div>
          <LibraryGrid
            initialMeta={initialMeta}
            isTeacher={isTeacher}
            initialProgress={initialProgress}
            initialStories={initialStories}
          />
        </div>
      </main>
    </>
  );
}
