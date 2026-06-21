-- Run after job_preferences.sql. Adds portfolio links, a private resume
-- storage bucket, and a portfolio_projects table for proof points used
-- as future evaluation context (mirrors the local CLI's article-digest.md).

-- 1. Portfolio links on job_preferences
alter table public.job_preferences
  add column if not exists portfolio_url text,
  add column if not exists github_url text,
  add column if not exists linkedin_url text;

-- 2. Private resume storage bucket
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "Users can upload their own resume"
  on storage.objects for insert
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view their own resume"
  on storage.objects for select
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own resume"
  on storage.objects for update
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own resume"
  on storage.objects for delete
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Portfolio / case-study showcase
create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,

  title text not null,
  description text,
  url text,
  tags text[] not null default '{}',

  created_at timestamptz not null default now()
);

alter table public.portfolio_projects enable row level security;

grant select, insert, update, delete on public.portfolio_projects to authenticated;

create policy "Users can view their own portfolio projects"
  on public.portfolio_projects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own portfolio projects"
  on public.portfolio_projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own portfolio projects"
  on public.portfolio_projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own portfolio projects"
  on public.portfolio_projects for delete
  using (auth.uid() = user_id);

create index if not exists portfolio_projects_user_id_idx
  on public.portfolio_projects (user_id, created_at desc);
