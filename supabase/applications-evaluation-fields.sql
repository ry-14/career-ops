-- Run after applications.sql. Adds fields the evaluate-job Edge Function
-- writes back: a short reasoning summary and match tags.

alter table public.applications
  add column if not exists notes text,
  add column if not exists tags text[] not null default '{}';
