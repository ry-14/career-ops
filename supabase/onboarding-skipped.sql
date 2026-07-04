-- Tracks users who dismissed onboarding without filling preferences.
alter table public.job_preferences
  add column if not exists onboarding_skipped_at timestamptz;
