import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      // no-store إجباري على كل نداء REST داخلي: يمنع أي طبقة fetch وسيطة
      // (Next data cache أو غيرها) من إرجاع قراءة قديمة لبيانات الإدارة
      global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }) },
    }
  );
}

// Paginates through all auth users — avoids the silent 1000-user truncation
export async function fetchAllUsers(admin) {
  const all = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data?.users ?? [];
    all.push(...batch);
    if (batch.length < 1000) break;
    page++;
  }
  return all;
}
