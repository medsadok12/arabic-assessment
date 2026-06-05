import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';
import { googleMeetConfigured } from '../../../lib/google-meet';

export const dynamic = 'force-dynamic';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CAL_BASE  = 'https://www.googleapis.com/calendar/v3/calendars';

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

  // Step 1: exchange refresh token
  let accessToken;
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        grant_type:    'refresh_token',
      }),
    });
    const tokenBody = await tokenRes.text();
    if (!tokenRes.ok) {
      return NextResponse.json({ configured: true, step: 'token', status: tokenRes.status, body: tokenBody });
    }
    accessToken = JSON.parse(tokenBody).access_token;
  } catch (err) {
    return NextResponse.json({ configured: true, step: 'token', error: err.message });
  }

  // Step 2: create calendar event
  const calendarId = process.env.GOOGLE_CALENDAR_ACCOUNT || 'primary';
  const today = new Date().toISOString().slice(0, 10);
  const event = {
    summary: 'اختبار — حصة تجريبية',
    start: { dateTime: `${today}T10:00:00`, timeZone: 'Asia/Riyadh' },
    end:   { dateTime: `${today}T10:30:00`, timeZone: 'Asia/Riyadh' },
    conferenceData: {
      createRequest: {
        requestId: `aarem-test-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  try {
    const calRes = await fetch(
      `${CAL_BASE}/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=none`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }
    );
    const calBody = await calRes.text();
    if (!calRes.ok) {
      return NextResponse.json({ configured: true, step: 'calendar', status: calRes.status, body: calBody });
    }
    const data = JSON.parse(calBody);
    const meetLink = data.hangoutLink || data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null;
    return NextResponse.json({ configured: true, step: 'ok', meetLink, eventId: data.id });
  } catch (err) {
    return NextResponse.json({ configured: true, step: 'calendar', error: err.message });
  }
}
