-- تراجع عن hero_studio_3d.sql
drop function if exists public.buy_hero_items(uuid, text[], integer[]);
alter table public.hero_config drop column if exists look;
