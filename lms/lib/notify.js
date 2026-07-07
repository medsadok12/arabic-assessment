import { createAdminClient, fetchAllUsers } from './supabase-admin';
import { getRole } from './auth-role';

// Global notification (admin/super_admin only, recipient_id = NULL)
export async function notify(type, title, body = null, meta = null) {
  try {
    const admin = createAdminClient();
    await admin.from('notifications').insert({ type, title, body, meta });
  } catch (_) {}
}

// Notify all users matching one of the given roles (excludes suspended accounts)
export async function notifyByRole(roles, type, title, body = null, link = null, excludeId = null) {
  try {
    const admin = createAdminClient();
    const users = await fetchAllUsers(admin);
    const targets = users.filter(u =>
      roles.includes(getRole(u)) &&
      u.user_metadata?.status !== 'suspended' &&
      (!excludeId || u.id !== excludeId)
    );
    if (targets.length === 0) return;
    await admin.from('notifications').insert(
      targets.map(u => ({ recipient_id: u.id, type, title, body, link }))
    );
  } catch (_) {}
}

// Notify a single user
export async function notifyUser(userId, type, title, body = null, link = null) {
  try {
    if (!userId) return;
    const admin = createAdminClient();
    await admin.from('notifications').insert({ recipient_id: userId, type, title, body, link });
  } catch (_) {}
}
