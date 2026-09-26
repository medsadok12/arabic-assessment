/**
 * lib/calendar.js — الخدمة العامة لإنشاء اجتماعات Google Meet
 *
 * استخدمها من أي مسار في النظام:
 *   import { createCalendarEvent } from '../../../lib/calendar';
 *
 *   const result = await createCalendarEvent({
 *     summary:     'مقابلة توظيف — محمد أحمد',
 *     description: 'تخصص: لغة عربية | خبرة: 3 سنوات',
 *     startTime:   '2026-07-21T16:50:00',   // ISO بدون إزاحة
 *     endTime:     '2026-07-21T17:20:00',
 *     attendees:   ['candidate@example.com', 'interviewer@aarem.net'],
 *     timeZone:    'Asia/Riyadh',            // اختياري
 *   });
 *
 *   if (result) {
 *     const { hangoutLink, eventId } = result;
 *     // خزّن hangoutLink و eventId في الجدول الخاص بك
 *   }
 *
 * إذا لم تُضَف متغيرات البيئة (GOOGLE_CLIENT_ID / SECRET / REFRESH_TOKEN)
 * ترجع الدالة null بهدوء — المُستدعي يتعامل مع الحالة بنفسه.
 */
export { createCalendarEvent, googleMeetConfigured } from './google-meet';
