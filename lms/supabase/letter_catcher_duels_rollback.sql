-- Run only when intentionally removing the new duel feature and its history.
-- Does not remove verified points, points logs, old challenge rooms or LC words.
BEGIN;
DROP TABLE IF EXISTS public.letter_catcher_duels;
COMMIT;
