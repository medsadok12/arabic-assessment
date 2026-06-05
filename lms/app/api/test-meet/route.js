import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';
import { createMeetSession, googleMeetConfigured } from '../../../lib/google-meet';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || (user.user_metadata?.role !== 'teacher' && user.user_metadata?.role !== 'super_admin' && user.user_metadata?.role !== 'admin'))
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const configured = googleMeetConfigured();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      vars: {
        GOOGLE_CLIENT_ID:       !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET:   !!process.env.GOOGLE_CLIENT_SECRET,
        GOOGLE_REFRESH_TOKEN:   !!process.env.GOOGLE_REFRESH_TOKEN,
        GOOGLE_CALENDAR_ACCOUNT: process.env.GOOGLE_CALENDAR_ACCOUNT || 'primary',
      }
    });
  }

  try {
    const result = await createMeetSession({
      summary: 'اختبار — حصة تجريبية',
      sessionDate: new Date().toISOString().slice(0, 10),
      startTime: '10:00',
      durationMinutes: 30,
    });

    return NextResponse.json({ configured: true, result });
  } catch (err) {
    return NextResponse.json({ configured: true, error: err.message });
  }
}
