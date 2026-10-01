-- Add per-user columns to notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS notif_recipient_idx
  ON notifications (recipient_id, is_read, created_at DESC);

-- Enable RLS so Supabase Realtime only sends each user their own events
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications OR global ones (recipient_id IS NULL)
DROP POLICY IF EXISTS "read_own_or_global" ON notifications;
CREATE POLICY "read_own_or_global" ON notifications
  FOR SELECT USING (recipient_id IS NULL OR recipient_id = auth.uid());

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

NOTIFY pgrst, 'reload schema';
