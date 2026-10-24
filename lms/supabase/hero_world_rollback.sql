-- تراجع عن hero_world.sql
drop function if exists public.hero_stats(uuid, timestamptz, timestamptz);
alter table public.hero_config drop column if exists title;
alter table public.hero_config drop column if exists egg_started_at;
