-- ════════════════════════════════════════════════════
-- Aarem Academy LMS — Database Schema
-- Run this in Supabase SQL Editor
-- ════════════════════════════════════════════════════

-- Enable RLS on all tables
-- Table: assessments
create table if not exists public.assessments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  student_name   text,
  student_age    int,
  learner_type   text check (learner_type in ('native', 'non-native')),
  level          int not null default 1,
  score          numeric(5,2),
  answers        jsonb,
  skills         jsonb,
  completed_at   timestamptz default now(),
  created_at     timestamptz default now()
);

-- Table: progress
create table if not exists public.progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  student_name text,
  skill       text not null,
  score       numeric(5,2),
  level       int,
  updated_at  timestamptz default now()
);

-- ── Row Level Security ──
alter table public.assessments enable row level security;
alter table public.progress    enable row level security;

-- Policies: users see only their own data
create policy "Users manage own assessments"
  on public.assessments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own progress"
  on public.progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Indexes ──
create index if not exists idx_assessments_user    on public.assessments(user_id);
create index if not exists idx_assessments_created on public.assessments(completed_at desc);
create index if not exists idx_progress_user       on public.progress(user_id);
