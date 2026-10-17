import { NextResponse }     from 'next/server';
import { createClient }    from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || getRole(user) !== 'teacher')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();

  const { data: sessions, error } = await admin
    .from('sessions')
    .select('student_name, student_email, session_date, status, attended')
    .eq('teacher_id', user.id);

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ students: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!sessions?.length) return NextResponse.json({ students: [] });

  // Build unique students with attendance counts
  const map = {};
  for (const s of sessions) {
    const key = s.student_email || s.student_name;
    if (!map[key]) {
      map[key] = {
        name: s.student_name,
        email: s.student_email,
        sessions: 0,
        attendedCount: 0,
        attendanceTotal: 0,
        assessments: [],
        lastActivity: null,
        masteredWords: 0,
      };
    }
    if (s.status !== 'cancelled') {
      map[key].sessions++;
      if (s.attended !== null && s.attended !== undefined) {
        map[key].attendanceTotal++;
        if (s.attended === true) map[key].attendedCount++;
      }
    }
  }

  // Resolve user IDs for students who have an email
  const emails = Object.values(map).filter(s => s.email).map(s => s.email);
  if (emails.length > 0) {
    try {
      const emailToId = {};
      await Promise.all(emails.map(async em => {
        try {
          const { data: { user } } = await admin.auth.admin.getUserByEmail(em);
          if (user) emailToId[user.email] = user.id;
        } catch (_) {}
      }));

      const ids = Object.values(emailToId);
      if (ids.length > 0) {
        // Fetch assessments, daily_logs, and flashcard_progress in parallel
        const [{ data: asmts }, { data: logs }, { data: fcProgress }] = await Promise.all([
          admin
            .from('assessments')
            .select('user_id, level, score, completed_at')
            .in('user_id', ids)
            .order('completed_at', { ascending: false }),
          admin
            .from('daily_logs')
            .select('user_id, log_date')
            .in('user_id', ids)
            .order('log_date', { ascending: false })
            .limit(ids.length * 30),
          admin
            .from('flashcard_progress')
            .select('user_id, level')
            .in('user_id', ids)
            .gte('level', 5),
        ]);

        // Group logs and mastered words by user_id
        const latestLogByUser = {};
        for (const l of (logs ?? [])) {
          if (!latestLogByUser[l.user_id]) latestLogByUser[l.user_id] = l.log_date;
        }
        const masteredByUser = {};
        for (const p of (fcProgress ?? [])) {
          masteredByUser[p.user_id] = (masteredByUser[p.user_id] ?? 0) + 1;
        }

        for (const student of Object.values(map)) {
          if (student.email && emailToId[student.email]) {
            const uid = emailToId[student.email];
            student.assessments  = (asmts ?? []).filter(a => a.user_id === uid).slice(0, 3);
            student.lastActivity = latestLogByUser[uid] ?? null;
            student.masteredWords = masteredByUser[uid] ?? 0;
          }
        }
      }
    } catch (_) {}
  }

  return NextResponse.json({ students: Object.values(map) });
}
