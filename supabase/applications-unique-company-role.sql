-- Prevent duplicate company+role rows per user (case-insensitive).
create unique index if not exists applications_user_company_role_uidx
  on public.applications (user_id, lower(company), lower(role));
