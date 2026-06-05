import { createAdminClient } from './supabase-admin';

/**
 * Insert a notification row. Silently ignores errors (notifications are best-effort).
 * @param {'recruitment'|'interview'|'assessment'} type
 * @param {string} title
 * @param {string} [body]
 * @param {object} [meta]
 */
export async function notify(type, title, body = null, meta = null) {
  try {
    const admin = createAdminClient();
    await admin.from('notifications').insert({ type, title, body, meta });
  } catch (_) {}
}
