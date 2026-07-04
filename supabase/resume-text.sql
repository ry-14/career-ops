-- Run after portfolio.sql. Stores plain-text resume content for AI evaluation context.
alter table public.job_preferences
  add column if not exists resume_text text;
