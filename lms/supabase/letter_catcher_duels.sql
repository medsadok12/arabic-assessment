-- Animal-only Letter Catcher duels. Additive; no existing game/table is changed.
-- All membership checks, answers, clocks and scores belong to the server API.
BEGIN;
CREATE TABLE IF NOT EXISTS public.letter_catcher_duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[0-9]{6}$'),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state jsonb NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT letter_catcher_duels_expiry CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS letter_catcher_duels_owner_created_idx ON public.letter_catcher_duels(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS letter_catcher_duels_expiry_idx ON public.letter_catcher_duels(expires_at);
CREATE INDEX IF NOT EXISTS letter_catcher_duels_status_idx ON public.letter_catcher_duels((state->>'status'));
ALTER TABLE public.letter_catcher_duels ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.letter_catcher_duels FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.letter_catcher_duels FROM service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.letter_catcher_duels TO service_role;
DROP POLICY IF EXISTS letter_catcher_duels_deny_client ON public.letter_catcher_duels;
CREATE POLICY letter_catcher_duels_deny_client ON public.letter_catcher_duels
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
COMMENT ON TABLE public.letter_catcher_duels IS 'Server-only Letter Catcher duel snapshots; never publish to Realtime or expose JSON answers to clients.';
COMMIT;
