-- ═══════════════════════════════════════════════════════════════
-- «مصاريف» — دفاتر مشتركة لمصاريف تحضيرات الزواج
-- ═══════════════════════════════════════════════════════════════
-- كل دفتر يُعرَّف برمز سري (16 حرفاً) يحمله المتصفح في الترويسة
-- `x-masareef-key`. القاعدة لا تخزّن الرمز نفسه، بل بصمته SHA-256،
-- وسياسات RLS لا تكشف لأي طلب إلا صفوف الدفتر المطابق لرمزه.
-- مطبَّق على مشروع Supabase «Arem ACADEMY» (migration: masareef_init).

create or replace function public.masareef_request_space()
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when char_length(k) >= 16 then encode(sha256(convert_to(k, 'UTF8')), 'hex')
  end
  from (
    select nullif(current_setting('request.headers', true), '')::json ->> 'x-masareef-key' as k
  ) as h
$$;

create table public.masareef_spaces (
  space        text primary key check (space ~ '^[0-9a-f]{64}$'),
  title        text not null default 'تحضيرات زواجنا' check (char_length(title) between 1 and 60),
  currency     text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  wedding_date date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.masareef_items (
  id         uuid primary key,
  space      text not null references public.masareef_spaces (space) on delete cascade,
  item_date  date not null,
  name       text not null check (char_length(name) between 1 and 120),
  price      numeric(14, 3) not null check (price >= 0 and price < 100000000000),
  category   text not null check (char_length(category) between 1 and 40),
  status     text not null check (status in ('soon', 'bought', 'pending')),
  added_by   text check (char_length(added_by) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index masareef_items_space_date_idx on public.masareef_items (space, item_date);

create or replace function public.masareef_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.masareef_touch_updated_at() from public, anon, authenticated;

create trigger masareef_spaces_touch
  before update on public.masareef_spaces
  for each row execute function public.masareef_touch_updated_at();

create trigger masareef_items_touch
  before update on public.masareef_items
  for each row execute function public.masareef_touch_updated_at();

alter table public.masareef_spaces enable row level security;
alter table public.masareef_items  enable row level security;

create policy masareef_spaces_own on public.masareef_spaces
  for all to anon, authenticated
  using (space = (select public.masareef_request_space()))
  with check (space = (select public.masareef_request_space()));

create policy masareef_items_own on public.masareef_items
  for all to anon, authenticated
  using (space = (select public.masareef_request_space()))
  with check (space = (select public.masareef_request_space()));

grant select, insert, update, delete on public.masareef_spaces to anon, authenticated;
grant select, insert, update, delete on public.masareef_items  to anon, authenticated;
grant execute on function public.masareef_request_space() to anon, authenticated;
