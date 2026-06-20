-- Run in Supabase SQL Editor (project mnuerdafmbobkxqbvitc), after profiles.sql.
-- Holds the job-search preferences that config/profile.yml covers for the
-- local CLI today. On the hosted site, each signed-up user fills this in
-- themselves (e.g. via an onboarding form) instead of editing a YAML file.

create table if not exists public.job_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,

  target_job_titles text[] not null default '{}',
  preferred_industries text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  work_mode text check (work_mode in ('remote', 'hybrid', 'on_site', 'any')) default 'any',
  experience_level text check (
    experience_level in ('student', 'intern', 'new_grad', 'experienced')
  ),
  skills text[] not null default '{}',
  resume_url text,
  salary_min integer,
  salary_max integer,
  salary_currency text default 'USD',

  updated_at timestamptz not null default now()
);

alter table public.job_preferences enable row level security;

grant select, insert, update on public.job_preferences to authenticated;

create policy "Users can view their own job preferences"
  on public.job_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own job preferences"
  on public.job_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own job preferences"
  on public.job_preferences for update
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists job_preferences_updated_at on public.job_preferences;
create trigger job_preferences_updated_at
  before update on public.job_preferences
  for each row execute function public.set_updated_at();
