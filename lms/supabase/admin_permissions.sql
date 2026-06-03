-- جدول صلاحيات التبويبات لكل مساعد إداري
-- القاعدة الصارمة: الوضع الافتراضي مخفي (is_allowed = false)
-- لا تظهر أي تبويب لأي مساعد إلا بعد منح الإذن يدوياً من المدير العام

CREATE TABLE IF NOT EXISTS admin_permissions (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID    NOT NULL,          -- يساوي auth.users.id للمساعد
  tab_key    TEXT    NOT NULL,          -- مثل: 'overview', 'codes', 'groups' ...
  is_allowed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (admin_id, tab_key)
);

-- RLS: نفعّل الحماية من جانب السيرفر (ليس فقط برمجياً)
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- المساعدون يقرؤون صلاحياتهم الخاصة فقط عبر المتصفح
CREATE POLICY "admins_read_own_permissions" ON admin_permissions
  FOR SELECT
  USING (auth.uid() = admin_id);

-- الكتابة والتعديل والحذف: عبر service_role فقط (لا يمكن للمتصفح مباشرةً)
-- route.js تستخدم createAdminClient (service_role) الذي يتجاوز RLS تلقائياً
