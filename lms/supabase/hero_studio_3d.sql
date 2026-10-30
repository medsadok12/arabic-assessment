-- استوديو الأبطال ثلاثي الأبعاد
-- 1) مظهر البطل (ملابس، معدات، ألوان) في عمود واحد jsonb — يتحقق منه الخادم عبر lib/hero-catalog.js
-- 2) شراء عدة قطع دفعة واحدة بشكل ذرّي: قفل رصيد الطالب، تخطّي المملوك، خصم مرة واحدة، سجل لكل قطعة
--    الأسعار يحسبها الخادم من الكتالوج ثم يمررها هنا؛ الدالة لا تُستدعى إلا بمفتاح الخدمة.

alter table public.hero_config add column if not exists look jsonb;

create or replace function public.buy_hero_items(p_user uuid, p_items text[], p_prices integer[])
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_points integer;
  v_total  integer := 0;
  v_new    text[]    := '{}';
  v_cost   integer[] := '{}';
  i        integer;
begin
  if p_user is null or p_items is null or p_prices is null
     or coalesce(array_length(p_items, 1), 0) = 0
     or array_length(p_items, 1) <> coalesce(array_length(p_prices, 1), 0) then
    return jsonb_build_object('ok', false, 'reason', 'bad_input');
  end if;

  select total into v_points from user_points where user_id = p_user for update;
  v_points := coalesce(v_points, 0);

  for i in 1 .. array_length(p_items, 1) loop
    if p_items[i] is null or p_prices[i] is null or p_prices[i] < 0 then
      return jsonb_build_object('ok', false, 'reason', 'bad_input');
    end if;
    if not (p_items[i] = any(v_new))
       and not exists (select 1 from avatar_items where user_id = p_user and item_id = p_items[i]) then
      v_new  := v_new  || p_items[i];
      v_cost := v_cost || p_prices[i];
      v_total := v_total + p_prices[i];
    end if;
  end loop;

  if v_total > v_points then
    return jsonb_build_object('ok', false, 'reason', 'insufficient', 'points', v_points, 'needed', v_total);
  end if;

  if coalesce(array_length(v_new, 1), 0) > 0 then
    insert into avatar_items (user_id, item_id, equipped)
    select p_user, unnest(v_new), false
    on conflict (user_id, item_id) do nothing;

    if v_total > 0 then
      update user_points set total = total - v_total, updated_at = now() where user_id = p_user;
      insert into points_log (user_id, delta, reason)
      select p_user, -v_cost[k], 'hero_buy_' || v_new[k]
      from generate_subscripts(v_new, 1) as k
      where v_cost[k] > 0;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'points', v_points - v_total, 'charged', v_total, 'bought', to_jsonb(v_new));
end;
$$;

revoke all on function public.buy_hero_items(uuid, text[], integer[]) from public, anon, authenticated;
grant execute on function public.buy_hero_items(uuid, text[], integer[]) to service_role;
