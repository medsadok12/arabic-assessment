// ── طبقة الربط مع Google Meet عبر Google Calendar API ──
// تُنشئ حدثاً في تقويم حساب الأكاديمية وتُولّد رابط Meet تلقائياً.
//
// المتغيرات المطلوبة في Vercel (لا تُشارَك في المحادثة):
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REFRESH_TOKEN     ← refresh token لحساب الأكاديمية (Workspace)
//   GOOGLE_CALENDAR_ACCOUNT  ← بريد الأكاديمية (اختياري — الافتراضي 'primary')
//
// إن لم تُضَف هذه المتغيرات → ترجع الدوال null ويبقى meet_link فارغاً.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CAL_BASE  = 'https://www.googleapis.com/calendar/v3/calendars';

export function googleMeetConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

// تبادل refresh token بـ access token قصير العمر
async function getAccessToken() {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google token error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
}

// يحوّل "2026-06-23" + "08:00" + 60 دقيقة إلى توقيتي ISO للبداية والنهاية
function toIsoRange(sessionDate, startTime, durationMinutes, timeZone) {
  const start = `${sessionDate}T${startTime.length === 5 ? startTime + ':00' : startTime}`;
  const startMs = new Date(`${start}`).getTime();
  const endIso   = new Date(startMs + (durationMinutes || 60) * 60000);
  // نُبقي التوقيت محلياً عبر تمرير timeZone لـ Google (يفسّر القيمة دون إزاحة)
  const pad = n => String(n).padStart(2, '0');
  const fmt = d =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  return {
    startStr: start,
    endStr:   fmt(endIso),
    timeZone,
  };
}

/**
 * يُنشئ حدث تقويم + رابط Google Meet.
 * @returns {Promise<{ meetLink: string, eventId: string } | null>}
 *          null عند غياب الإعداد أو فشل الاتصال (يتكفّل المُستدعي بالبديل).
 */
export async function createMeetSession({
  summary, description, attendeeEmail,
  sessionDate, startTime, durationMinutes = 60,
  timeZone = 'Asia/Riyadh', autoRecord = true,
}) {
  if (!googleMeetConfigured()) return null;

  try {
    const accessToken = await getAccessToken();
    const calendarId  = process.env.GOOGLE_CALENDAR_ACCOUNT || 'primary';
    const { startStr, endStr } = toIsoRange(sessionDate, startTime, durationMinutes, timeZone);

    const event = {
      summary:     summary || 'حصة — أكاديمية عارم',
      description: description || '',
      start: { dateTime: startStr, timeZone },
      end:   { dateTime: endStr,   timeZone },
      conferenceData: {
        createRequest: {
          requestId: `aarem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      ...(attendeeEmail ? { attendees: [{ email: attendeeEmail }] } : {}),
    };

    const res = await fetch(
      `${CAL_BASE}/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=none`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!res.ok) throw new Error(`Google Calendar error: ${res.status} ${await res.text()}`);
    const data = await res.json();

    const meetLink =
      data.hangoutLink ||
      data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ||
      null;

    if (!meetLink) return null;
    return { meetLink, eventId: data.id };
  } catch (err) {
    console.error('createMeetSession failed:', err.message);
    return null; // المُستدعي يرجع إلى Jitsi
  }
}

/** يحذف حدث التقويم عند إلغاء الحصة (best-effort) */
export async function deleteMeetEvent(eventId) {
  if (!eventId || !googleMeetConfigured()) return;
  try {
    const accessToken = await getAccessToken();
    const calendarId  = process.env.GOOGLE_CALENDAR_ACCOUNT || 'primary';
    await fetch(
      `${CAL_BASE}/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=none`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch (err) {
    console.error('deleteMeetEvent failed:', err.message);
  }
}
