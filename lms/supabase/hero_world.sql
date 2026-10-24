-- «عالم الأبطال»: البيضة الغامضة، اللقب، وإحصاءات التقدّم الحقيقي من points_log
-- hero_stats تجمع نجوم الطالب لكل سبب (prefix قبل «:»): العدد، المجموع، ما كُسب هذا الأسبوع، وما كُسب منذ وضع البيضة،
-- مع فهارس الحروف المتقنة (huroof_letter:N) ومجموع النجوم المكتسبة (للمستوى). للخادم فقط.

alter table public.hero_config add column if not exists egg_started_at timestamptz;
alter table public.hero_config add column if not exists title text;

create or replace function public.hero_stats(p_user uuid, p_week timestamptz, p_egg timestamptz)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with rows as (
    select split_part(reason, ':', 1) as prefix, reason, delta, created_at
    from points_log where user_id = p_user and delta > 0
  ), agg as (
    select prefix, count(*) as n, sum(delta) as s,
           coalesce(sum(delta) filter (where created_at >= p_week), 0) as ws,
           coalesce(sum(delta) filter (where p_egg is not null and created_at >= p_egg), 0) as es
    from rows group by prefix
  )
  select jsonb_build_object(
    'p', coalesce((select jsonb_object_agg(prefix, jsonb_build_object('n', n, 'sum', s, 'ws', ws, 'es', es)) from agg), '{}'::jsonb),
    'letters', coalesce((select jsonb_agg(distinct (split_part(reason, ':', 2))::int)
                         from rows where prefix = 'huroof_letter' and split_part(reason, ':', 2) ~ '^[0-9]{1,2}$'), '[]'::jsonb),
    'earned', coalesce((select sum(delta) from rows), 0)
  );
$$;

revoke all on function public.hero_stats(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.hero_stats(uuid, timestamptz, timestamptz) to service_role;
