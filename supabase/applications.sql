-- Run in Supabase SQL Editor (project mnuerdafmbobkxqbvitc), after profiles.sql.
-- Per-user application pipeline for the hosted dashboard. Separate from the
-- local CLI's data/applications.md tracker for now — no sync between them.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,

  company text not null,
  role text not null,
  score numeric(2, 1),
  status text not null default 'Evaluated' check (
    status in ('Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Rejected', 'Discarded', 'SKIP')
  ),
  report_url text,

  created_at timestamptz not null default now()
);

alter table public.applications enable row level security;

grant select, insert, update, delete on public.applications to authenticated;

create policy "Users can view their own applications"
  on public.applications for select
  using (auth.uid() = user_id);

create policy "Users can insert their own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own applications"
  on public.applications for update
  using (auth.uid() = user_id);

create policy "Users can delete their own applications"
  on public.applications for delete
  using (auth.uid() = user_id);

create index if not exists applications_user_id_created_at_idx
  on public.applications (user_id, created_at desc);
