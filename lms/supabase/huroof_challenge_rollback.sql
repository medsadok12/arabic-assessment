-- التراجع عن huroof_challenge.sql
DROP TABLE IF EXISTS public.huroof_progress;
ALTER TABLE public.huroof_letters DROP COLUMN IF EXISTS riddle;
ALTER TABLE public.huroof_letters DROP COLUMN IF EXISTS riddle_audio_url;
ALTER TABLE public.huroof_letters DROP COLUMN IF EXISTS answer;
ALTER TABLE public.huroof_letters DROP COLUMN IF EXISTS accept;
ALTER TABLE public.huroof_letters DROP COLUMN IF EXISTS spell_rules;
DELETE FROM public.game_settings WHERE game_id = 'huroof';
NOTIFY pgrst, 'reload schema';
